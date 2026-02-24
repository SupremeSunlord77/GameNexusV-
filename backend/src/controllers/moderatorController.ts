import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- HELPER: Log Action ---
async function logModAction(adminId: string, action: string, details: string, targetId?: string) {
  await prisma.auditLog.create({
    data: { adminId, action, details, targetId }
  });
}

// 1. 🔍 Get Chat Context (X-Ray Vision)
// Shows 5 messages BEFORE the flagged message to see who started it.
export const getMessageContext = async (req: Request, res: Response) => {
  const { messageId } = req.params;
  try {
    const targetMsg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!targetMsg) return res.status(404).json({ error: "Message not found" });

    const context = await prisma.chatMessage.findMany({
      where: { 
        sessionId: targetMsg.sessionId, 
        createdAt: { lte: targetMsg.createdAt } // Messages OLDER than target
      },
      orderBy: { createdAt: 'desc' },
      take: 6, // Target + 5 previous
      include: { user: { select: { username: true } } }
    });

    res.json(context.reverse()); // Show chronologically
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch context" });
  }
};

// 2. ⚠️ Issue Warning
// Sends a warning to the user (and logs it).
export const warnUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { reason } = req.body;
  const modId = req.user?.userId; // From authMiddleware

  try {
    // In a real app, emit Socket.io event here: io.to(userId).emit('warning', reason);
    console.log(`[Warning] User ${userId}: ${reason}`);

    await logModAction(modId, "WARN_USER", `Warning issued: ${reason}`, userId);
    res.json({ message: "Warning sent" });
  } catch (error) {
    res.status(500).json({ error: "Failed to warn user" });
  }
};

// 3. 📈 Manual Reputation Fix
// If AI makes a mistake, Mod can fix the score.
export const adjustReputation = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { amount } = req.body; // e.g., +10 or -10
  const modId = req.user?.userId;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const newScore = Math.min(100, Math.max(0, user.reputation + amount)); // Keep between 0-100

    await prisma.user.update({ where: { id: userId }, data: { reputation: newScore } });
    await logModAction(modId, "MANUAL_REP", `Adjusted by ${amount} (New: ${newScore})`, userId);

    res.json({ message: "Reputation updated", newScore });
  } catch (error) {
    res.status(500).json({ error: "Failed to update reputation" });
  }
};

// 4. 🔨 Ban User
export const banUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const modId = req.user?.userId;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    // Safety: Mods cannot ban Admins or other Mods
    if (!user || user.role === 'ADMIN' || user.role === 'MODERATOR') {
      return res.status(403).json({ error: "Cannot ban staff members." });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: !user.isBanned }
    });

    await logModAction(modId, user.isBanned ? "UNBAN_USER" : "BAN_USER", "Toggled Ban", userId);
    res.json({ message: "Ban status updated", isBanned: updatedUser.isBanned });
  } catch (error) {
    res.status(500).json({ error: "Failed to ban user" });
  }
};

// 5. 📋 Get Suspicious Users
// Only fetch users who have been flagged by AI at least once
export const getFlaggedUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { 
        role: 'USER',
        toxicityFlags: { gt: 0 } // Only users with flags > 0
      },
      orderBy: { toxicityFlags: 'desc' },
      select: { id: true, username: true, reputation: true, toxicityFlags: true, isBanned: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};