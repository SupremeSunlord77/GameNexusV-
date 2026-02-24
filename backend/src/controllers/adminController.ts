import { Request, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getIO } from '../sockets/ioInstance';

const prisma = new PrismaClient();

// --- HELPER: Log an Action to DB + broadcast to admin room ---
async function logAction(adminId: string, action: string, details: string, targetId?: string) {
  const log = await prisma.auditLog.create({
    data: { adminId, action, details, targetId }
  });

  try {
    getIO().to('admin-room').emit('admin_activity', {
      action,
      details,
      targetId,
      adminId,
      createdAt: log.createdAt
    });
  } catch (_) {}
}

// ==========================================
// 1. STATS
// ==========================================

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const bannedUsers = await prisma.user.count({ where: { isBanned: true } });
    const activeSessions = await prisma.lFGSession.count({ where: { status: 'OPEN' } });

    const toxicStats = await prisma.user.aggregate({
      _sum: { toxicityFlags: true }
    });

    const toxicMessages = await prisma.chatMessage.count({ where: { isToxic: true } });

    res.json({
      totalUsers,
      bannedUsers,
      activeSessions,
      toxicCount: toxicStats._sum.toxicityFlags || 0,
      toxicMessages
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// GET /api/admin/stats/live — real-time stats snapshot
export const getLiveStats = async (req: Request, res: Response) => {
  try {
    const activeSessions = await prisma.lFGSession.count({ where: { status: 'OPEN' } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deletedToday = await prisma.lFGDeletionLog.count({
      where: { deletedAt: { gte: today } }
    });

    const notificationsSent = await prisma.notification.count({
      where: { createdAt: { gte: today } }
    });

    res.json({ activeSessions, deletedToday, notificationsSent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch live stats' });
  }
};

// GET /api/admin/stats/toxicity-trends — last 7 days
export const getToxicityTrends = async (req: Request, res: Response) => {
  try {
    const days = 7;
    const results = [];

    for (let i = days - 1; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const flaggedMessages = await prisma.chatMessage.count({
        where: { isToxic: true, createdAt: { gte: start, lte: end } }
      });

      const toxicUsers = await prisma.user.count({
        where: { toxicityFlags: { gt: 0 }, updatedAt: { gte: start, lte: end } }
      });

      results.push({
        date: start.toISOString().split('T')[0],
        flaggedMessages,
        toxicUsers
      });
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch toxicity trends' });
  }
};

// ==========================================
// 2. USER MANAGEMENT
// ==========================================

export const getAdminStats_orig = getAdminStats; // alias

export const getAllUsersAdmin = async (req: Request, res: Response) => {
  try {
    const { search, role, status, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    if (role) where.role = role as string;
    if (status === 'banned') where.isBanned = true;
    if (status === 'active') where.isBanned = false;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          reputation: true,
          isBanned: true,
          toxicityFlags: true,
          eigenTrustScore: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.user.count({ where })
    ]);

    res.json({ users, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const changeUserRole = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body;
  const adminId = req.user?.id || req.user?.userId;

  try {
    if (!['USER', 'MODERATOR', 'ADMIN'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: role as UserRole }
    });

    if (adminId) await logAction(adminId, 'CHANGE_ROLE', `Changed role to ${role}`, userId);

    res.json({ message: 'Role updated', role: user.role });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
};

export const resetReputation = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { reason } = req.body;
  const adminId = req.user?.id || req.user?.userId;

  if (!reason) {
    res.status(400).json({ error: 'Reason is required for reputation reset' });
    return;
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { reputation: 50, toxicityFlags: 0 }
    });

    if (adminId) await logAction(adminId, 'RESET_REPUTATION', `Reset reputation. Reason: ${reason}`, userId);

    res.json({ message: 'Reputation reset to 50, toxicity flags cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset reputation' });
  }
};

// ==========================================
// 3. LFG SESSION MANAGEMENT
// ==========================================

export const getAdminSessions = async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.lFGSession.findMany({
      include: {
        host: { select: { username: true } },
        game: { select: { name: true } },
        _count: { select: { participants: true, messages: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

export const getDeletionLog = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.lFGDeletionLog.findMany({
      include: {
        deletedByUser: { select: { username: true, role: true } }
      },
      orderBy: { deletedAt: 'desc' },
      take: 50
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deletion log' });
  }
};

// ==========================================
// 4. FRACTURE ALGORITHM CONFIG
// ==========================================

export const getConfig = async (req: Request, res: Response) => {
  try {
    const configs = await prisma.systemConfig.findMany();
    const configMap: Record<string, any> = {};
    configs.forEach(c => { configMap[c.configKey] = c.configValue; });
    res.json(configMap);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
};

export const updateConfig = async (req: Request, res: Response) => {
  const adminId = req.user?.id || req.user?.userId;
  try {
    const updates = req.body as Record<string, any>;

    for (const [key, value] of Object.entries(updates)) {
      await prisma.systemConfig.upsert({
        where: { configKey: key },
        create: { configKey: key, configValue: value, updatedBy: adminId },
        update: { configValue: value, updatedBy: adminId }
      });
    }

    if (adminId) await logAction(adminId, 'UPDATE_CONFIG', `Updated system config: ${Object.keys(updates).join(', ')}`);

    res.json({ message: 'Config updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update config' });
  }
};

// ==========================================
// EXISTING FUNCTIONS (preserved)
// ==========================================

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { action, startDate, endDate, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (action) where.action = { contains: action as string, mode: 'insensitive' };
    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate as string) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { admin: { select: { username: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({ logs, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

export const createModerator = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  const adminId = req.user?.userId || req.user?.id;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newMod = await prisma.user.create({
      data: {
        username, email, passwordHash: hashedPassword,
        role: UserRole.MODERATOR, reputation: 90,
        profile: { create: { bio: 'Staff Member', region: 'Global' } }
      }
    });

    if (adminId) await logAction(adminId, 'HIRE_MOD', `Hired moderator ${username}`, newMod.id);

    res.json({ message: 'Moderator created', user: newMod });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create mod' });
  }
};

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
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

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
  const staffId = req.user?.userId || req.user?.id;

  try {
    if (staffId) await logAction(staffId, 'WARN_USER', `Warning: ${reason}`, userId);
    res.json({ message: 'Warning issued (Logged)' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to warn user' });
  }
};

export const adjustReputation = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { amount } = req.body;
  const staffId = req.user?.userId || req.user?.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newScore = Math.min(100, Math.max(0, user.reputation + amount));

    await prisma.user.update({
      where: { id: userId },
      data: { reputation: newScore }
    });

    if (staffId) await logAction(staffId, 'MANUAL_REP', `Adjusted Rep by ${amount} (New: ${newScore})`, userId);

    res.json({ message: 'Reputation updated', newScore });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update reputation' });
  }
};

export const banUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const staffId = req.user?.userId || req.user?.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.role === 'ADMIN' || user.role === 'MODERATOR') {
      return res.status(403).json({ error: 'Cannot ban staff.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: !user.isBanned }
    });

    if (staffId) await logAction(staffId, user.isBanned ? 'UNBAN_USER' : 'BAN_USER', 'Toggled Ban Status', userId);

    res.json({ message: `User ${updatedUser.isBanned ? 'BANNED' : 'UNBANNED'}`, isBanned: updatedUser.isBanned });
  } catch (error) {
    res.status(500).json({ error: 'Failed to ban user' });
  }
};
