import express from 'express';
import { getGames, createSession, getSessions, joinSession, leaveSession, closeSession } from '../controllers/lfgController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/games', getGames); // Get list of games (Public)
router.get('/sessions', getSessions); // Get active lobbies (Public)
router.post('/sessions', authenticateJWT, createSession); // Create lobby (Auth required)
router.post('/join', authenticateJWT, joinSession); // Join lobby (Auth required)
router.post('/leave', authenticateJWT, leaveSession); // Leave lobby (Auth required)
router.patch('/sessions/:sessionId/close', authenticateJWT, closeSession); // Close lobby (Host only)

export default router;