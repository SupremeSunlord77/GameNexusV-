import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getIO } from '../sockets/ioInstance';

const prisma = new PrismaClient();

// ==========================================
// EXISTING LFG FUNCTIONS
// ==========================================

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

    const where: any = { status: 'OPEN' };
    if (gameId) where.gameId = gameId as string;
    if (region) where.region = region as string;

    let sessions = await prisma.lFGSession.findMany({
      where,
      include: {
        host: {
          select: {
            id: true,
            username: true,
            behavioralVectors: true,
            eigenTrustScore: true
          }
        }
      }
    });

    if (compatibleWithMe === 'true' && userId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          behavioralVectors: true,
          eigenTrustScore: true
        }
      });

      if (currentUser?.behavioralVectors) {
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
              session.host.eigenTrustScore
            );

            return { ...session, compatibilityScore: score };
          })
          .sort((a: any, b: any) => b.compatibilityScore - a.compatibilityScore)
          .filter((s: any) => s.compatibilityScore >= 0.4);
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

    if (!userId) {
      res.sendStatus(401);
      return;
    }

    // 🚫 SHADOW-BAN CHECK — silent failure
    const shadowBan = await prisma.disciplinaryAction.findFirst({
      where: {
        userId,
        actionType: 'shadow_ban',
        isActive: true
      }
    });
    if (shadowBan) {
      // Return fake success but do NOT add them
      res.json({ message: "Successfully joined session!" });
      return;
    }

    // Get session
    const session = await prisma.lFGSession.findUnique({
      where: { id: sessionId },
      include: { participants: true }
    });

    if (!session) {
      res.status(404).json({ message: "Session not found" });
      return;
    }

    if (session.status !== 'OPEN') {
      res.status(400).json({ message: "Session is not open" });
      return;
    }

    if (session.participants.length >= session.maxPlayers) {
      res.status(400).json({ message: "Session is full" });
      return;
    }

    const alreadyJoined = session.participants.some(p => p.userId === userId);
    if (alreadyJoined) {
      res.status(400).json({ message: "Already joined this session" });
      return;
    }

    await prisma.lFGParticipant.create({
      data: { sessionId, userId }
    });

    await prisma.lFGSession.update({
      where: { id: sessionId },
      data: { currentPlayers: { increment: 1 } }
    });

    res.json({ message: "Successfully joined session!" });
  } catch (error: any) {
    console.error('Join session error:', error);
    res.status(400).json({ message: error.message });
  }
};

// ==========================================
// 🆕 DELETE SESSION (with notifications + log)
// ==========================================

export const deleteSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const userRole = req.user?.role;
    const { sessionId } = req.params;

    if (!userId) {
      res.sendStatus(401);
      return;
    }

    const session = await prisma.lFGSession.findUnique({
      where: { id: sessionId },
      include: { participants: { select: { userId: true } } }
    });

    if (!session) {
      res.status(404).json({ message: "Session not found" });
      return;
    }

    // Only host or admin/moderator can delete
    const isStaff = userRole === 'ADMIN' || userRole === 'MODERATOR';
    if (session.hostUserId !== userId && !isStaff) {
      res.status(403).json({ message: "Not authorized to delete this session" });
      return;
    }

    const memberIds = session.participants.map(p => p.userId);
    const notifyUserIds = [...new Set([...memberIds, session.hostUserId])].filter(id => id !== userId);

    // Create notifications for all members
    if (notifyUserIds.length > 0) {
      await prisma.notification.createMany({
        data: notifyUserIds.map(uid => ({
          userId: uid,
          type: 'session_deleted',
          message: `Session "${session.title}" was deleted.`,
          isRead: false
        }))
      });
    }

    // Log to audit
    await prisma.auditLog.create({
      data: {
        adminId: userId,
        action: 'DELETE_SESSION',
        details: `Deleted session "${session.title}" (ID: ${sessionId})`,
        targetId: sessionId
      }
    });

    // Log to LFGDeletionLog
    await prisma.lFGDeletionLog.create({
      data: {
        sessionId,
        sessionTitle: session.title,
        deletedBy: userId,
        deletedByRole: userRole || 'USER',
        membersNotified: notifyUserIds.length
      }
    });

    // Delete in FK-safe order
    await prisma.chatMessage.deleteMany({ where: { sessionId } });
    await prisma.lFGParticipant.deleteMany({ where: { sessionId } });
    await prisma.feedback.deleteMany({ where: { sessionId } });
    await prisma.lFGSession.delete({ where: { id: sessionId } });

    // Emit socket events
    const io = getIO();
    io.to('lfg_feed').emit('session_deleted', {
      sessionId,
      title: session.title,
      deletedBy: userId
    });

    // Notify each member personally
    notifyUserIds.forEach(uid => {
      io.to(`user:${uid}`).emit('new_notification', {
        type: 'session_deleted',
        message: `Session "${session.title}" was deleted.`
      });
    });

    res.json({ message: "Session deleted successfully" });
  } catch (error: any) {
    console.error('Delete session error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// HELPER FUNCTION - Compatibility Calculator
// ==========================================

function calculateCompatibilityScore(
  v1: any,
  v2: any,
  trust1: number,
  trust2: number
): number {
  const distance = Math.sqrt(
    Math.pow((v1.communicationDensity || 0) - (v2.communicationDensity || 0), 2) +
    Math.pow((v1.competitiveIntensity || 0) - (v2.competitiveIntensity || 0), 2) +
    Math.pow((v1.toxicityTolerance || 0) - (v2.toxicityTolerance || 0), 2) +
    Math.pow((v1.mentorshipPropensity || 0) - (v2.mentorshipPropensity || 0), 2)
  );

  const maxDistance = Math.sqrt(4);
  const behaviorScore = 1 - (distance / maxDistance);
  const trustScore = ((trust1 || 0.5) + (trust2 || 0.5)) / 2;

  return behaviorScore * 0.7 + trustScore * 0.3;
}

// ==========================================
// LEAVE SESSION & CLOSE SESSION
// ==========================================

export const leaveSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { sessionId } = req.body;

    if (!userId) { res.sendStatus(401); return; }

    const session = await prisma.lFGSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      res.status(404).json({ message: "Session not found" });
      return;
    }

    await prisma.lFGParticipant.deleteMany({
      where: { sessionId, userId }
    });

    await prisma.lFGSession.update({
      where: { id: sessionId },
      data: { currentPlayers: { decrement: 1 } }
    });

    const closed = session.hostUserId === userId;
    if (closed) {
      await prisma.lFGSession.update({
        where: { id: sessionId },
        data: { status: 'CLOSED' }
      });
      getIO().to(sessionId).emit('session_closed', { reason: 'host_left' });
    }

    res.json({ message: "Left session", closed });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const closeSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { sessionId } = req.params;

    if (!userId) { res.sendStatus(401); return; }

    const session = await prisma.lFGSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      res.status(404).json({ message: "Session not found" });
      return;
    }

    if (session.hostUserId !== userId && req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: "Not authorized" });
      return;
    }

    await prisma.lFGSession.update({
      where: { id: sessionId },
      data: { status: 'CLOSED' }
    });

    getIO().to(sessionId).emit('session_closed', { reason: 'host_closed' });

    res.json({ message: "Session closed" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
