import { Router } from 'express';
import { 
  getFlaggedUsers, 
  banUser, 
  getMessageContext, 
  warnUser, 
  adjustReputation 
} from '../controllers/moderatorController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { staffOnly } from '../middlewares/roleMiddleware';

const router = Router();

// All routes require authentication AND staff role
router.use(authMiddleware);
router.use(staffOnly); // MODERATOR or ADMIN only

// Moderator Routes
router.get('/users', getFlaggedUsers);
router.post('/ban/:userId', banUser);
router.get('/chat-context/:messageId', getMessageContext);
router.post('/warn/:userId', warnUser);
router.post('/reputation/:userId', adjustReputation);

export default router;