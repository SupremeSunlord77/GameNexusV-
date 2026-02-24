import { Router } from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authenticated } from '../middlewares/roleMiddleware';

const prisma = new PrismaClient();
const router = Router();

router.use(authMiddleware, authenticated);

// POST /api/tickets — player submits a support ticket
router.post('/', async (req: Request, res: Response) => {
  try {
    const reporterId = req.user?.id || req.user?.userId;
    if (!reporterId) { res.sendStatus(401); return; }

    const { reportedUserId, sessionId, ticketType, description } = req.body;

    const ticket = await prisma.supportTicket.create({
      data: {
        reporterId,
        reportedUserId: reportedUserId || null,
        sessionId: sessionId || null,
        ticketType: ticketType || 'other',
        description
      }
    });

    res.status(201).json({ message: 'Ticket submitted', ticket });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to submit ticket', details: error.message });
  }
});

export default router;
