import express from 'express';
<<<<<<< HEAD
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
=======
import { getGames, createSession, getSessions, joinSession, leaveSession, closeSession } from '../controllers/lfgController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/games', getGames); // Get list of games (Public)
router.get('/sessions', getSessions); // Get active lobbies (Public)
router.post('/sessions', authenticateJWT, createSession); // Create lobby (Auth required)
router.post('/join', authenticateJWT, joinSession); // Join lobby (Auth required)
router.post('/leave', authenticateJWT, leaveSession); // Leave lobby (Auth required)
router.patch('/sessions/:sessionId/close', authenticateJWT, closeSession); // Close lobby (Host only)
>>>>>>> aad6b7800a3d9d79befb563f031b7f8af0dec04d

export default router;