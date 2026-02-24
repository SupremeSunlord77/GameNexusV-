import { Request, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// --- HELPER: Log an Action to DB ---
async function logAction(adminId: string, action: string, details: string, targetId?: string) {
  await prisma.auditLog.create({
    data: { adminId, action, details, targetId }
  });
}

// ==========================================
// 1. ADMIN FEATURES (Audit Logs & Hiring)
// ==========================================

// 👇 THIS WAS MISSING! ADD IT NOW 👇
export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const bannedUsers = await prisma.user.count({ where: { isBanned: true } });
    
    // Sum of all toxicity flags (safely handle nulls)
    const toxicStats = await prisma.user.aggregate({
      _sum: { toxicityFlags: true }
    });

    res.json({
      totalUsers,
      bannedUsers,
      toxicCount: toxicStats._sum.toxicityFlags || 0
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { admin: { select: { username: true, role: true } } }, // Show who did it
      orderBy: { createdAt: 'desc' },
      take: 50 // Only show last 50 actions
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
};

export const createModerator = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  // @ts-ignore
  const adminId = req.user?.userId || req.user?.id; 

  try {
    // Check existing
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already taken" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newMod = await prisma.user.create({
      data: {
        username, email, passwordHash: hashedPassword,
        role: UserRole.MODERATOR, reputation: 90,
        profile: { create: { bio: "Staff Member", region: "Global" } }
      }
    });

    // 📝 LOG IT
    if(adminId) await logAction(adminId, "HIRE_MOD", `Hired moderator ${username}`, newMod.id);
    
    res.json({ message: "Moderator created", user: newMod });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create mod" });
  }
};

// ==========================================
// 2. MODERATOR FEATURES (Context, Warn, Rep)
// ==========================================

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'USER' }, 
      select: {
        id: true, username: true, email: true,
        reputation: true, isBanned: true, toxicityFlags: true
      },
      orderBy: { reputation: 'asc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// 🔍 Get Chat Context (5 messages before the flagged one)
export const getMessageContext = async (req: Request, res: Response) => {
  const { messageId } = req.params;
  try {
    const targetMsg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!targetMsg) return res.status(404).json({ error: "Message not found" });

    // Find 5 messages in the SAME lobby, BEFORE this message
    const context = await prisma.chatMessage.findMany({
      where: { 
        sessionId: targetMsg.sessionId, // Must be same session
        createdAt: { lte: targetMsg.createdAt } // Less than or equal to target time
      },
      orderBy: { createdAt: 'desc' }, // Latest first
      take: 6, // Target + 5 previous
      include: { user: { select: { username: true } } }
    });

    // Reverse to show in chronological order (Oldest -> Newest)
    res.json(context.reverse());
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch context" });
  }
};

// ⚠️ Issue Warning
export const warnUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { reason } = req.body;
  // @ts-ignore
  const staffId = req.user?.userId || req.user?.id;

  try {
    // 📝 LOG IT
    if(staffId) await logAction(staffId, "WARN_USER", `Warning: ${reason}`, userId);

    res.json({ message: "Warning issued (Logged)" });
  } catch (error) {
    res.status(500).json({ error: "Failed to warn user" });
  }
};

// 📈 Manual Reputation Adjustment
export const adjustReputation = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { amount } = req.body; // e.g., +10 or -10
  // @ts-ignore
  const staffId = req.user?.userId || req.user?.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const newScore = Math.min(100, Math.max(0, user.reputation + amount)); // Clamp 0-100

    await prisma.user.update({
      where: { id: userId },
      data: { reputation: newScore }
    });

    // 📝 LOG IT
    if(staffId) await logAction(staffId, "MANUAL_REP", `Adjusted Rep by ${amount} (New: ${newScore})`, userId);

    res.json({ message: "Reputation updated", newScore });
  } catch (error) {
    res.status(500).json({ error: "Failed to update reputation" });
  }
};

// 🔨 Ban User
export const banUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  // @ts-ignore
  const staffId = req.user?.userId || req.user?.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user || user.role === 'ADMIN' || user.role === 'MODERATOR') {
      return res.status(403).json({ error: "Cannot ban staff." });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: !user.isBanned }
    });

    // 📝 LOG IT
    if(staffId) await logAction(staffId, user.isBanned ? "UNBAN_USER" : "BAN_USER", "Toggled Ban Status", userId);

    res.json({ message: `User ${updatedUser.isBanned ? 'BANNED' : 'UNBANNED'}`, isBanned: updatedUser.isBanned });
  } catch (error) {
    res.status(500).json({ error: "Failed to ban user" });
  }
};