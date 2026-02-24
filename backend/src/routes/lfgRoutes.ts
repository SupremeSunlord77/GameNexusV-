import express from 'express';
import { getGames, createSession, getSessions, joinSession } from '../controllers/lfgController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authenticated, checkBanStatus } from '../middlewares/roleMiddleware';

const router = express.Router();

// Public routes (no auth required)
router.get('/games', getGames);
router.get('/sessions', getSessions);

// Protected routes (auth required + not banned)
router.post('/sessions', authMiddleware, authenticated, checkBanStatus, createSession);
router.post('/join', authMiddleware, authenticated, checkBanStatus, joinSession);

export default router;