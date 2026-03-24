import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { lfgService } from '../services/lfgService';
import { getIO } from '../sockets/ioInstance';

const prisma = new PrismaClient();

export const getGames = async (req: Request, res: Response) => {
  try {
    const games = await prisma.game.findMany();
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch games" });
  }
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const hostUserId = req.user?.id || req.user?.userId;
    
    if (!hostUserId) { 
      res.sendStatus(401); 
      return; 
    }

    const sessionData = {
      hostUserId,
      gameId: req.body.gameId,
      title: req.body.title,
      description: req.body.description,
      region: req.body.region,
      maxPlayers: req.body.maxPlayers,
      micRequired: req.body.micRequired || false,
      // Optional behavioral requirements
      minCompatibility: req.body.minCompatibility,
      minEigenTrust: req.body.minEigenTrust
    };

    const session = await prisma.lFGSession.create({
      data: sessionData
    });

    res.status(201).json(session);
  } catch (error: any) {
    console.error('Create session error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 🆕 ENHANCED WITH COMPATIBILITY FILTERING
export const getSessions = async (req: Request, res: Response) => {
  try {
    const { compatibleWithMe, gameId, region } = req.query;
    const userId = req.user?.id || req.user?.userId;

    // Build filter conditions
    const where: any = { status: 'OPEN' };
    if (gameId) where.gameId = gameId as string;
    if (region) where.region = region as string;

    // Get all matching sessions
    let sessions = await prisma.lFGSession.findMany({
      where,
      include: {
        host: {
          select: {
            id: true,
            username: true,
            behavioralVectors: true,
            eigenTrustScore: true,
            reputation: true
          }
        }
      }
    });

    // If compatibility filtering requested
    if (compatibleWithMe === 'true' && userId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          behavioralVectors: true,
          eigenTrustScore: true,
          reputation: true
        }
      });

      if (currentUser?.behavioralVectors) {
        // Score and sort by compatibility
        sessions = sessions
          .map((session: any) => {
            const hostVectors = session.host.behavioralVectors;
            
            if (!hostVectors) {
              return { ...session, compatibilityScore: 0.5 };
            }

            const score = calculateCompatibilityScore(
              currentUser.behavioralVectors as any,
              hostVectors as any,
              currentUser.eigenTrustScore,
              session.host.eigenTrustScore,
              currentUser.reputation,
              (session.host as any).reputation
            );

            return { ...session, compatibilityScore: score };
          })
          .sort((a: any, b: any) => b.compatibilityScore - a.compatibilityScore)
          .filter((s: any) => s.compatibilityScore >= 0.4); // Minimum threshold
      }
    }

    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
};

export const joinSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { sessionId } = req.body;

    if (!userId) { res.sendStatus(401); return; }

    const session = await prisma.lFGSession.findUnique({
      where: { id: sessionId },
      include: {
        participants: true,
        host: { select: { behavioralVectors: true, eigenTrustScore: true, reputation: true } }
      }
    });

    if (!session) { res.status(404).json({ message: "Session not found" }); return; }
    if (session.status !== 'OPEN') { res.status(400).json({ message: "Session is not open" }); return; }
    if (session.participants.length >= session.maxPlayers) { res.status(400).json({ message: "Session is full" }); return; }

    const alreadyJoined = session.participants.some(p => p.userId === userId);
    if (alreadyJoined) { res.status(400).json({ message: "Already joined this session" }); return; }

    if (session.minEigenTrust || session.minCompatibility) {
      const joiner = await prisma.user.findUnique({
        where: { id: userId },
        select: { eigenTrustScore: true, behavioralVectors: true, reputation: true }
      });

      if (session.minEigenTrust && session.minEigenTrust > 0) {
        if (!joiner || joiner.eigenTrustScore < session.minEigenTrust) {
          res.status(403).json({ message: `Session requires a minimum trust score of ${(session.minEigenTrust * 100).toFixed(0)}. Your score is too low.` });
          return;
        }
      }

      if (session.minCompatibility && session.minCompatibility > 0) {
        const hostVectors = (session as any).host?.behavioralVectors;
        if (joiner?.behavioralVectors && hostVectors) {
          const score = calculateCompatibilityScore(
            joiner.behavioralVectors as any,
            hostVectors as any,
            joiner.eigenTrustScore,
            (session as any).host.eigenTrustScore,
            joiner.reputation,
            (session as any).host.reputation
          );
          if (score < session.minCompatibility) {
            res.status(403).json({ message: `Your compatibility (${(score * 100).toFixed(0)}%) is below this session's minimum of ${(session.minCompatibility * 100).toFixed(0)}%.` });
            return;
          }
        }
      }
    }

    await prisma.lFGParticipant.create({ data: { sessionId, userId } });
    await prisma.lFGSession.update({ where: { id: sessionId }, data: { currentPlayers: { increment: 1 } } });

    res.json({ message: "Successfully joined session!" });
  } catch (error: any) {
    console.error('Join session error:', error);
    res.status(400).json({ message: error.message });
  }
};

export const leaveSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { sessionId } = req.body;
    if (!userId) { res.sendStatus(401); return; }
    const result = await lfgService.leaveSession(sessionId, userId);
    if (result.closed) {
      getIO().to(sessionId).emit("session_closed", { reason: "host_left" });
    }
    res.json({ message: "Left session", closed: result.closed });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const closeSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { sessionId } = req.params;
    if (!userId) { res.sendStatus(401); return; }
    await lfgService.closeSession(sessionId, userId);
    getIO().to(sessionId).emit("session_closed", { reason: "host_closed" });
    res.json({ message: "Session closed" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

function calculateCompatibilityScore(v1: any, v2: any, trust1: number, trust2: number, rep1: number, rep2: number): number {
  const distance = Math.sqrt(
    Math.pow(v1.communicationDensity - v2.communicationDensity, 2) +
    Math.pow(v1.competitiveIntensity - v2.competitiveIntensity, 2) +
    Math.pow(v1.scheduleReliability - v2.scheduleReliability, 2) +
    Math.pow(v1.toxicityTolerance - v2.toxicityTolerance, 2) +
    Math.pow(v1.mentorshipPropensity - v2.mentorshipPropensity, 2)
  );
  const maxDistance = Math.sqrt(5);
  const behaviorScore = 1 - (distance / maxDistance);
  const trustScore = (trust1 + trust2) / 2;
  const reputationScore = (rep1 + rep2) / 200; // normalize 0-100 → 0-1
  return behaviorScore * 0.6 + trustScore * 0.25 + reputationScore * 0.15;
}
