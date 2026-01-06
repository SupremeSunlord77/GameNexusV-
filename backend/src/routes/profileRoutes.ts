import express from 'express';
import { upsertProfile, getMyProfile, getProfile } from '../controllers/profileController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = express.Router();

// Update self
router.put('/', authenticateJWT, upsertProfile);

// Get self
router.get('/', authenticateJWT, getMyProfile);

// Get ANY user by ID (This fixes your 404 error!)
router.get('/:userId', authenticateJWT, getProfile);

export default router;