import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  getNextQuestion,
  extractProfile,
  deleteSession,
} from '../agents/profilingAgent';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/agents/onboarding/start
 * Body: { userId: string }
 * Creates a new session and returns the agent's opening question.
 */
router.post(
  '/onboarding/start',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId: string = req.body.userId ?? req.user?.id ?? req.user?.userId;

      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const sessionId = uuidv4();

      // First call — null userMessage → agent asks opening question
      const turn = await getNextQuestion(sessionId, null);

      res.json({ sessionId, firstQuestion: turn.reply });
    } catch (err) {
      console.error('❌ /onboarding/start error:', err);
      res.status(500).json({ error: 'Failed to start onboarding session' });
    }
  }
);

/**
 * POST /api/agents/onboarding/message
 * Body: { sessionId: string, userId: string, message: string }
 * Advances the conversation. On completion, saves the behavioral profile to DB.
 */
router.post(
  '/onboarding/message',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { sessionId, message } = req.body as {
        sessionId: string;
        message: string;
      };
      const userId: string =
        req.body.userId ?? req.user?.id ?? req.user?.userId;

      if (!sessionId || !message || !userId) {
        res.status(400).json({ error: 'sessionId, userId, and message are required' });
        return;
      }

      const turn = await getNextQuestion(sessionId, message);

      if (turn.isComplete && turn.profile) {
        // Save profile to DB using the same field as the existing onboarding
        await prisma.user.update({
          where: { id: userId },
          data: { behavioralVectors: turn.profile as unknown as Prisma.InputJsonValue },
        });

        // Clean up Redis session
        await deleteSession(sessionId);

        console.log(`✅ Behavioral profile saved for user ${userId}:`, turn.profile);
      }

      res.json({
        reply: turn.reply,
        isComplete: turn.isComplete,
        ...(turn.profile ? { profile: turn.profile } : {}),
      });
    } catch (err) {
      console.error('❌ /onboarding/message error:', err);
      res.status(500).json({ error: 'Failed to process onboarding message' });
    }
  }
);

export default router;
