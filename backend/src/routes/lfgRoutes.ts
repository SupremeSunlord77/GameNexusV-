import express from 'express';
import { getGames, createSession, getSessions, joinSession } from '../controllers/lfgController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/games', getGames); // Get list of games (Public)
router.get('/sessions', getSessions); // Get active lobbies (Public)
router.post('/sessions', authenticateJWT, createSession); // Create lobby (Auth required)
router.post('/join', authenticateJWT, joinSession); // Join lobby (Auth required)

export default router;