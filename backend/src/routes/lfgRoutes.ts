import express from 'express';
import { getGames, createSession, getSessions, joinSession, leaveSession, closeSession } from '../controllers/lfgController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authenticated, checkBanStatus } from '../middlewares/roleMiddleware';

const router = express.Router();

// Public routes
router.get('/games', getGames);
router.get('/sessions', getSessions);

// Protected routes
router.post('/sessions', authMiddleware, authenticated, checkBanStatus, createSession);
router.post('/join', authMiddleware, authenticated, checkBanStatus, joinSession);
router.post('/leave', authMiddleware, authenticated, leaveSession);
router.patch('/sessions/:sessionId/close', authMiddleware, authenticated, closeSession);

export default router;