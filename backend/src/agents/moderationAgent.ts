import { VertexAI, Content } from '@google-cloud/vertexai';
import crypto from 'crypto';
import { parseModelJson, ParseError } from '../utils/parseModelJson';
import { cacheGet, cacheSet } from '../config/redis';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ModerationResult {
  verdict: 'toxic' | 'borderline' | 'clean';
  reason: string;
  confidence: number;
}

// ─── Ambiguity range (maps to sentiment library score space) ──────────────────
// sentiment scores: >= -1 = neutral/positive, <= -3 = clearly toxic
// -4 to -2 is the ambiguous middle — we send these to the agent

const AMBIGUOUS_MIN = -4;
const AMBIGUOUS_MAX = -2;

export function isAmbiguous(sentimentScore: number): boolean {
  return sentimentScore >= AMBIGUOUS_MIN && sentimentScore <= AMBIGUOUS_MAX;
}

// ─── Vertex AI setup ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a gaming chat moderator. You understand gaming slang, trash talk vs genuine harassment, and context-dependent toxicity. You will be given a flagged message and the recent chat context.
Respond ONLY with valid JSON, no markdown, no explanation:
{ "verdict": "toxic" | "borderline" | "clean", "reason": "<max 20 words>", "confidence": <0.0-1.0> }`;

let _model: ReturnType<VertexAI['getGenerativeModel']> | null = null;

function getModel() {
  if (!_model) {
    const vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT!,
      location: process.env.VERTEX_AI_LOCATION ?? 'us-west4',
    });
    _model = vertexAI.getGenerativeModel({
      model: process.env.VERTEX_AI_MODEL_FLASH ?? 'gemini-2.5-flash',
      systemInstruction: {
        role: 'system',
        parts: [{ text: SYSTEM_PROMPT }],
      } as Content,
    });
  }
  return _model;
}

// ─── Fallback verdict (used when Vertex AI fails) ─────────────────────────────

const FALLBACK: ModerationResult = {
  verdict: 'toxic',
  reason: 'Fallback – agent analysis failed',
  confidence: 0.5,
};

// ─── Main export ──────────────────────────────────────────────────────────────

export async function assessMessage(
  flaggedMessage: string,
  recentMessages: string[],
  playerReputation: number
): Promise<ModerationResult> {
  // 1. Cache lookup — key is SHA-256 of the flagged message text
  const cacheKey = `moderation:${crypto
    .createHash('sha256')
    .update(flaggedMessage)
    .digest('hex')}`;

  const cached = await cacheGet(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as ModerationResult;
    } catch {
      // ignore bad cache entry
    }
  }

  // 2. Build prompt
  const context =
    recentMessages.length > 0
      ? `Recent chat (last ${recentMessages.length} messages):\n${recentMessages.map((m, i) => `[${i + 1}] ${m}`).join('\n')}\n\n`
      : '';

  const userPrompt = `${context}Flagged message: "${flaggedMessage}"\nPlayer reputation score: ${playerReputation}/100`;

  // 3. Call Vertex AI
  try {
    const model = getModel();
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    });

    const rawText =
      response.response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    const parsed = parseModelJson(rawText) as ModerationResult;

    // Validate shape
    if (
      !['toxic', 'borderline', 'clean'].includes(parsed.verdict) ||
      typeof parsed.reason !== 'string' ||
      typeof parsed.confidence !== 'number'
    ) {
      throw new ParseError(`Unexpected shape: ${rawText}`);
    }

    const result: ModerationResult = {
      verdict: parsed.verdict,
      reason: parsed.reason,
      confidence: Math.min(1, Math.max(0, parsed.confidence)),
    };

    // 4. Cache for 60 seconds
    await cacheSet(cacheKey, JSON.stringify(result), 60);

    return result;
  } catch (err) {
    console.error('❌ moderationAgent error:', (err as Error).message);
    return FALLBACK;
  }
}
