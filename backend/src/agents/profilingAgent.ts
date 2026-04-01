import { VertexAI, Content } from '@google-cloud/vertexai';
import { parseModelJson } from '../utils/parseModelJson';
import { cacheGet, cacheSet, redisClient } from '../config/redis';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Matches the DB behavioralVectors JSON shape exactly (all values 0–1) */
export interface BehavioralVector {
  communicationDensity: number;
  competitiveIntensity: number;
  scheduleReliability: number;
  toxicityTolerance: number;
  mentorshipPropensity: number;
}

export interface OnboardingTurn {
  reply: string;
  isComplete: boolean;
  profile?: BehavioralVector;
}

/** Raw output from the model before mapping */
interface AgentProfile {
  communication: number;
  cooperation: number;
  skillReliability: number;
  emotionalStability: number;
  leadership: number;
}

type ChatMessage = {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_TTL = 30 * 60; // 30 minutes in seconds
const QUESTIONS_REQUIRED = 5;

const SYSTEM_PROMPT = `You are onboarding a new player onto GameNexus, a behavior-aware multiplayer matchmaking platform.
Your goal is to assess their behavioral profile across 5 dimensions: communication style, cooperation tendency, skill reliability, emotional stability under pressure, and leadership tendency.
Ask one short, natural, conversational question at a time. Do not mention the dimensions by name.
After exactly ${QUESTIONS_REQUIRED} player responses, output ONLY a JSON object:
{ "communication": <0-100>, "cooperation": <0-100>, "skillReliability": <0-100>, "emotionalStability": <0-100>, "leadership": <0-100> }
Do not output anything else after the JSON.`;

// ─── Vertex AI setup ──────────────────────────────────────────────────────────

let _model: ReturnType<VertexAI['getGenerativeModel']> | null = null;

function getModel() {
  if (!_model) {
    const vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT!,
      location: process.env.VERTEX_AI_LOCATION ?? 'us-west4',
    });
    _model = vertexAI.getGenerativeModel({
      model: process.env.VERTEX_AI_MODEL_PRO ?? 'gemini-2.5-pro',
      systemInstruction: {
        role: 'system',
        parts: [{ text: SYSTEM_PROMPT }],
      } as Content,
    });
  }
  return _model;
}

// ─── Session helpers ──────────────────────────────────────────────────────────

function sessionKey(sessionId: string): string {
  return `onboarding:session:${sessionId}`;
}

async function loadHistory(sessionId: string): Promise<ChatMessage[]> {
  const raw = await cacheGet(sessionKey(sessionId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

async function saveHistory(sessionId: string, history: ChatMessage[]): Promise<void> {
  await cacheSet(sessionKey(sessionId), JSON.stringify(history), SESSION_TTL);
}

function countUserTurns(history: ChatMessage[]): number {
  return history.filter((m) => m.role === 'user').length;
}

// ─── Profile mapping ──────────────────────────────────────────────────────────

function mapAgentProfileToVector(agent: AgentProfile): BehavioralVector {
  const clamp = (v: number) => Math.min(1, Math.max(0, v / 100));
  return {
    communicationDensity: clamp(agent.communication),
    mentorshipPropensity: clamp(agent.cooperation),
    scheduleReliability: clamp(agent.skillReliability),
    toxicityTolerance: clamp(agent.emotionalStability),
    competitiveIntensity: clamp(agent.leadership),
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Advance the onboarding conversation by one turn.
 * Pass `userMessage = null` on the first call (agent asks the opening question).
 */
export async function getNextQuestion(
  sessionId: string,
  userMessage: string | null
): Promise<OnboardingTurn> {
  const history = await loadHistory(sessionId);

  // Append user message if provided
  if (userMessage !== null) {
    history.push({ role: 'user', parts: [{ text: userMessage }] });
  }

  const userTurns = countUserTurns(history);

  // Call Vertex AI with full history
  const model = getModel();
  const response = await model.generateContent({ contents: history });
  const rawReply =
    response.response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Append model reply to history
  history.push({ role: 'model', parts: [{ text: rawReply }] });
  await saveHistory(sessionId, history);

  // After QUESTIONS_REQUIRED user turns, the model should have output the JSON profile
  if (userTurns >= QUESTIONS_REQUIRED) {
    const profile = await extractProfile(sessionId, rawReply);
    return { reply: rawReply, isComplete: true, profile };
  }

  return { reply: rawReply, isComplete: false };
}

/**
 * Extract the final BehavioralVector from the session conversation.
 * Accepts the raw last model reply directly to avoid a second Vertex AI call.
 */
export async function extractProfile(
  sessionId: string,
  lastModelReply?: string
): Promise<BehavioralVector> {
  let raw = lastModelReply;

  if (!raw) {
    // Fallback: ask the model to emit the profile JSON explicitly
    const history = await loadHistory(sessionId);
    const extractPrompt: ChatMessage = {
      role: 'user',
      parts: [{ text: 'Now output the JSON profile object only, no other text.' }],
    };
    const model = getModel();
    const response = await model.generateContent({
      contents: [...history, extractPrompt],
    });
    raw = response.response.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  }

  const parsed = parseModelJson(raw) as AgentProfile;
  return mapAgentProfileToVector(parsed);
}

/**
 * Delete the Redis session after profile has been saved to DB.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await redisClient.del(sessionKey(sessionId));
  } catch {
    // non-critical
  }
}
