import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/notifications — last 30 for current user
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) { res.sendStatus(401); return; }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// GET /api/notifications/unread-count
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) { res.sendStatus(401); return; }

    const count = await prisma.notification.count({
      where: { userId, isRead: false }
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

// PATCH /api/notifications/:id/read — mark one as read
export const markRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;
    if (!userId) { res.sendStatus(401); return; }

    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// PATCH /api/notifications/read-all — mark all as read
export const markAllRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) { res.sendStatus(401); return; }

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};
