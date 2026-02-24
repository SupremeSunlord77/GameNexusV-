import { Router } from 'express';
import { 
  submitAssessment, 
  getProfile, 
  calculateCompatibility 
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

export default router;