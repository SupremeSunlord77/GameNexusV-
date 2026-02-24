import { Router } from 'express';
import { 
  endorseUser, 
  getEndorsements,
  getEndorsementStats
} from '../controllers/endorsementController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authenticated, adminOnly } from '../middlewares/roleMiddleware';

const router = Router();

// POST /api/endorsements/:userId - Requires auth
router.post('/:userId', authMiddleware, authenticated, endorseUser);

// GET /api/endorsements/:userId - Public (can view anyone's endorsements)
router.get('/:userId', getEndorsements);

// GET /api/endorsements/stats/platform - Admin only
router.get('/stats/platform', authMiddleware, adminOnly, getEndorsementStats);

export default router;