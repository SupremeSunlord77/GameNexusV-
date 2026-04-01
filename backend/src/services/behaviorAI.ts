import Sentiment from 'sentiment';
import { PrismaClient } from '@prisma/client';
import { assessMessage, isAmbiguous } from '../agents/moderationAgent';

const sentiment = new Sentiment();
const prisma = new PrismaClient();

interface AnalysisResult {
  newRep: number;
  isToxic: boolean;
  reason: string;
  scoreChange: number;
}

export const analyzeBehavior = async (
  userId: string,
  message: string,
  lobbyId?: string
): Promise<AnalysisResult> => {
  console.log('🤖 AI ANALYZING MESSAGE:', message);

  try {
    // 1. Analyze the text
    const sentimentResult = sentiment.analyze(message);
    const score = sentimentResult.score;

    console.log('📊 Sentiment Score:', score);

    // 2. Get current user (needed for agent call + reputation update)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { reputation: true, toxicityFlags: true },
    });

    if (!user) {
      console.error('❌ User not found:', userId);
      return {
        newRep: 50,
        isToxic: false,
        reason: 'User not found',
        scoreChange: 0,
      };
    }

    // 3. Determine Reputation Impact
    let repChange = 0;
    let isToxic = false;
    let reason = '';

    if (isAmbiguous(score)) {
      // Score is in the -4 to -2 range — consult the Gemini moderation agent
      console.log('🤔 Ambiguous score, calling moderation agent...');

      let recentMessages: string[] = [];
      if (lobbyId) {
        try {
          const recent = await prisma.chatMessage.findMany({
            where: { sessionId: lobbyId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { content: true },
          });
          recentMessages = recent.map((m) => m.content).reverse();
        } catch {
          // non-critical — proceed with empty context
        }
      }

      const agentResult = await assessMessage(
        message,
        recentMessages,
        user.reputation
      );

      console.log('🤖 Agent verdict:', agentResult);

      switch (agentResult.verdict) {
        case 'toxic':
          repChange = -5;
          isToxic = true;
          reason = `Toxic (agent): ${agentResult.reason}`;
          break;
        case 'borderline':
          repChange = -1;
          isToxic = false;
          reason = `Borderline (agent): ${agentResult.reason}`;
          break;
        case 'clean':
          repChange = 0;
          isToxic = false;
          reason = `Clean (agent): ${agentResult.reason}`;
          break;
      }
    } else if (score >= 3) {
      repChange = 2;
      reason = 'Positive message';
      console.log('✅ POSITIVE MESSAGE! Reputation +2');
    } else if (score >= 1) {
      repChange = 1;
      reason = 'Nice message';
      console.log('😊 NICE MESSAGE! Reputation +1');
    } else if (score >= -1) {
      repChange = 0;
      reason = 'Neutral message';
      console.log('😐 NEUTRAL MESSAGE! No change');
    } else if (score <= -3) {
      repChange = -5;
      isToxic = true;
      reason = 'Toxic language detected';
      console.log('⚠️ TOXIC MESSAGE! Reputation -5');
    } else {
      repChange = -1;
      reason = 'Negative tone';
      console.log('😕 NEGATIVE TONE! Reputation -1');
    }

    // 4. Calculate new reputation
    let newRep = user.reputation + repChange;
    newRep = Math.max(0, Math.min(100, newRep));

    console.log(
      `🎯 Updating reputation: ${user.reputation} → ${newRep} (${repChange >= 0 ? '+' : ''}${repChange})`
    );

    // 5. Update database
    await prisma.user.update({
      where: { id: userId },
      data: {
        reputation: newRep,
        toxicityFlags: isToxic ? { increment: 1 } : undefined,
      },
    });

    console.log(`✅ Database updated! New rep: ${newRep}`);

    const analysisResult: AnalysisResult = {
      newRep,
      isToxic,
      reason,
      scoreChange: repChange,
    };

    console.log('📤 Returning analysis:', analysisResult);
    return analysisResult;
  } catch (error) {
    console.error('❌ Error in analyzeBehavior:', error);
    return {
      newRep: 50,
      isToxic: false,
      reason: 'Analysis failed',
      scoreChange: 0,
    };
  }
};
