import { Router } from 'express';
import { 
  getAdminStats,
  getAuditLogs, 
  createModerator, 
  getMessageContext, 
  warnUser, 
  adjustReputation,
  getAllUsers,
  banUser
} from '../controllers/adminController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminOnly, staffOnly } from '../middlewares/roleMiddleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ==========================================
// ADMIN-ONLY ROUTES
// ==========================================
router.get('/stats', adminOnly, getAdminStats);
router.get('/audit-logs', adminOnly, getAuditLogs);
router.post('/create-moderator', adminOnly, createModerator);

// ==========================================
// STAFF ROUTES (MODERATOR + ADMIN)
// ==========================================
router.get('/users', staffOnly, getAllUsers);
router.post('/ban/:userId', staffOnly, banUser);
router.get('/chat-context/:messageId', staffOnly, getMessageContext);
router.post('/warn/:userId', staffOnly, warnUser);
router.post('/reputation/:userId', staffOnly, adjustReputation);

export default router;