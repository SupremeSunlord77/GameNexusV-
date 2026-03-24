import { Router } from 'express';
import {
  submitAssessment,
  getProfile,
  calculateCompatibility,
  getMatches
} from '../controllers/behavioralController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authenticated } from '../middlewares/roleMiddleware';

const router = Router();

// POST /api/behavioral/assessment - Requires auth
router.post('/assessment', authMiddleware, authenticated, submitAssessment);

// GET /api/behavioral/profile/:userId - Public (can view anyone's profile)
router.get('/profile/:userId', getProfile);

// GET /api/behavioral/compatibility/:targetUserId - Requires auth
router.get('/compatibility/:targetUserId', authMiddleware, authenticated, calculateCompatibility);

// GET /api/behavioral/matches - Get ranked compatible players for current user
router.get('/matches', authMiddleware, authenticated, getMatches);

export default router;