import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getIO } from '../sockets/ioInstance';

const prisma = new PrismaClient();

// --- HELPER: Log Mod Action ---
async function logModAction(adminId: string, action: string, details: string, targetId?: string) {
  await prisma.auditLog.create({
    data: { adminId, action, details, targetId }
  });
  try {
    getIO().to('admin-room').emit('admin_activity', { action, details, targetId, adminId, createdAt: new Date() });
  } catch (_) {}
}

// ==========================================
// EXISTING FUNCTIONS (preserved)
// ==========================================

export const getMessageContext = async (req: Request, res: Response) => {
  const { messageId } = req.params;
  try {
    const targetMsg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!targetMsg) return res.status(404).json({ error: 'Message not found' });

    const context = await prisma.chatMessage.findMany({
      where: {
        sessionId: targetMsg.sessionId,
        createdAt: { lte: targetMsg.createdAt }
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { user: { select: { username: true } } }
    });

    res.json(context.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch context' });
  }
};

export const warnUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { reason } = req.body;
  const modId = req.user?.userId || req.user?.id;

  try {
    if (modId) await logModAction(modId, 'WARN_USER', `Warning issued: ${reason}`, userId);
    res.json({ message: 'Warning sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to warn user' });
  }
};

export const adjustReputation = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { amount } = req.body;
  const modId = req.user?.userId || req.user?.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newScore = Math.min(100, Math.max(0, user.reputation + amount));

    await prisma.user.update({ where: { id: userId }, data: { reputation: newScore } });
    if (modId) await logModAction(modId, 'MANUAL_REP', `Adjusted by ${amount} (New: ${newScore})`, userId);

    res.json({ message: 'Reputation updated', newScore });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update reputation' });
  }
};

export const banUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const modId = req.user?.userId || req.user?.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role === 'ADMIN' || user.role === 'MODERATOR') {
      return res.status(403).json({ error: 'Cannot ban staff members.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: !user.isBanned }
    });

    if (modId) await logModAction(modId, user.isBanned ? 'UNBAN_USER' : 'BAN_USER', 'Toggled Ban', userId);
    res.json({ message: 'Ban status updated', isBanned: updatedUser.isBanned });
  } catch (error) {
    res.status(500).json({ error: 'Failed to ban user' });
  }
};

export const getFlaggedUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'USER', toxicityFlags: { gt: 0 } },
      orderBy: { toxicityFlags: 'desc' },
      select: { id: true, username: true, reputation: true, toxicityFlags: true, isBanned: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// ==========================================
// 🆕 ENHANCED FLAGGED USERS WITH PRIORITY
// ==========================================

export const getFlaggedUsersEnhanced = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'USER', toxicityFlags: { gt: 0 } },
      select: {
        id: true,
        username: true,
        reputation: true,
        toxicityFlags: true,
        isBanned: true,
        eigenTrustScore: true,
        disciplinaryActions: {
          where: { isActive: true },
          select: { actionType: true, expiresAt: true }
        }
      },
      orderBy: { toxicityFlags: 'desc' }
    });

    const scored = users.map(u => {
      let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (u.toxicityFlags >= 5 || u.reputation < 20) priority = 'HIGH';
      else if (u.toxicityFlags >= 2 || u.reputation < 40) priority = 'MEDIUM';
      return { ...u, priority };
    });

    // Sort: HIGH first, then MEDIUM, then LOW
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    scored.sort((a, b) => order[a.priority] - order[b.priority]);

    res.json(scored);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch flagged users' });
  }
};

// ==========================================
// 🆕 CHAT CONTEXT BY USER ID
// ==========================================

export const getChatContextByUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { sessionId } = req.query;

  try {
    const where: any = {
      userId,
      ...(sessionId ? { sessionId: sessionId as string } : {})
    };

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { username: true } },
        session: { select: { title: true } }
      }
    });

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat context' });
  }
};

// ==========================================
// 🆕 MUTE USER
// ==========================================

export const muteUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { durationMinutes, reason } = req.body;
  const modId = req.user?.userId || req.user?.id;

  try {
    if (!modId) { res.sendStatus(401); return; }

    const expiresAt = new Date(Date.now() + (durationMinutes || 30) * 60 * 1000);

    // Deactivate any existing mutes
    await prisma.disciplinaryAction.updateMany({
      where: { userId, actionType: 'mute', isActive: true },
      data: { isActive: false }
    });

    const action = await prisma.disciplinaryAction.create({
      data: {
        userId,
        actionType: 'mute',
        issuedBy: modId,
        reason: reason || 'Muted by moderator',
        expiresAt,
        isActive: true
      }
    });

    await logModAction(modId, 'MUTE_USER', `Muted for ${durationMinutes || 30}min: ${reason}`, userId);

    // Notify the user via Socket.IO
    try {
      getIO().to(`user:${userId}`).emit('user_muted', {
        message: `You have been muted for ${durationMinutes || 30} minutes.`,
        reason: reason || 'Muted by moderator',
        expiresAt
      });
    } catch (_) {}

    res.json({ message: 'User muted', action });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mute user' });
  }
};

// ==========================================
// 🆕 SHADOW-BAN USER
// ==========================================

export const shadowBanUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { reason } = req.body;
  const modId = req.user?.userId || req.user?.id;

  try {
    if (!modId) { res.sendStatus(401); return; }

    // Deactivate any existing shadow-bans
    await prisma.disciplinaryAction.updateMany({
      where: { userId, actionType: 'shadow_ban', isActive: true },
      data: { isActive: false }
    });

    const action = await prisma.disciplinaryAction.create({
      data: {
        userId,
        actionType: 'shadow_ban',
        issuedBy: modId,
        reason: reason || 'Shadow banned by moderator',
        isActive: true
      }
    });

    await logModAction(modId, 'SHADOW_BAN', `Shadow banned user: ${reason}`, userId);

    res.json({ message: 'User shadow banned (silently)', action });
  } catch (error) {
    res.status(500).json({ error: 'Failed to shadow ban user' });
  }
};

// ==========================================
// 🆕 LIFT DISCIPLINARY ACTION
// ==========================================

export const liftAction = async (req: Request, res: Response) => {
  const { actionId } = req.params;
  const modId = req.user?.userId || req.user?.id;

  try {
    if (!modId) { res.sendStatus(401); return; }

    const action = await prisma.disciplinaryAction.update({
      where: { id: actionId },
      data: { isActive: false }
    });

    await logModAction(modId, 'LIFT_ACTION', `Lifted action ${action.actionType}`, action.userId);

    res.json({ message: 'Action lifted', action });
  } catch (error) {
    res.status(500).json({ error: 'Failed to lift action' });
  }
};

// ==========================================
// 🆕 TERMINATE SESSION (moderator power)
// ==========================================

export const terminateSession = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const modId = req.user?.userId || req.user?.id;

  try {
    if (!modId) { res.sendStatus(401); return; }

    const session = await prisma.lFGSession.findUnique({
      where: { id: sessionId },
      include: { participants: { select: { userId: true } } }
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const memberIds = session.participants.map(p => p.userId);
    const notifyIds = [...new Set([...memberIds, session.hostUserId])];

    // Notify all members
    if (notifyIds.length > 0) {
      await prisma.notification.createMany({
        data: notifyIds.map(uid => ({
          userId: uid,
          type: 'session_terminated',
          message: `Session "${session.title}" was terminated by a moderator.`,
          isRead: false
        }))
      });
    }

    await prisma.lFGSession.update({
      where: { id: sessionId },
      data: { status: 'CLOSED' }
    });

    await logModAction(modId, 'TERMINATE_SESSION', `Terminated session "${session.title}"`, sessionId);

    try {
      const io = getIO();
      io.to(sessionId).emit('session_closed', { reason: 'moderator_action' });
      notifyIds.forEach(uid => {
        io.to(`user:${uid}`).emit('new_notification', {
          type: 'session_terminated',
          message: `Session "${session.title}" was terminated by a moderator.`
        });
      });
    } catch (_) {}

    res.json({ message: 'Session terminated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to terminate session' });
  }
};

// ==========================================
// 🆕 SUPPORT TICKETS
// ==========================================

export const getTickets = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = status as string;

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        reporter: { select: { username: true } },
        reportedUser: { select: { username: true } },
        assignedStaff: { select: { username: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};

export const assignTicket = async (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const modId = req.user?.userId || req.user?.id;

  try {
    if (!modId) { res.sendStatus(401); return; }

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assignedTo: modId, status: 'assigned' }
    });

    res.json({ message: 'Ticket assigned', ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign ticket' });
  }
};

export const resolveTicket = async (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const { resolutionNote } = req.body;
  const modId = req.user?.userId || req.user?.id;

  try {
    if (!modId) { res.sendStatus(401); return; }

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'resolved', resolutionNote: resolutionNote || 'Resolved by staff' }
    });

    await logModAction(modId, 'RESOLVE_TICKET', `Resolved ticket ${ticketId}: ${resolutionNote}`);

    res.json({ message: 'Ticket resolved', ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve ticket' });
  }
};

export const dismissTicket = async (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const { resolutionNote } = req.body;
  const modId = req.user?.userId || req.user?.id;

  try {
    if (!modId) { res.sendStatus(401); return; }

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'dismissed', resolutionNote: resolutionNote || 'Dismissed by staff' }
    });

    await logModAction(modId, 'DISMISS_TICKET', `Dismissed ticket ${ticketId}`);

    res.json({ message: 'Ticket dismissed', ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to dismiss ticket' });
  }
};
