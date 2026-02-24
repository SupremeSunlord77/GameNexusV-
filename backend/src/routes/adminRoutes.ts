import { Router } from 'express';
import {
  getAdminStats,
  getLiveStats,
  getToxicityTrends,
  getAuditLogs,
  createModerator,
  getMessageContext,
  warnUser,
  adjustReputation,
  getAllUsers,
  getAllUsersAdmin,
  banUser,
  changeUserRole,
  resetReputation,
  getAdminSessions,
  getDeletionLog,
  getConfig,
  updateConfig
} from '../controllers/adminController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminOnly, staffOnly } from '../middlewares/roleMiddleware';

const router = Router();

router.use(authMiddleware);

// ==========================================
// STATS
// ==========================================
router.get('/stats', adminOnly, getAdminStats);
router.get('/stats/live', adminOnly, getLiveStats);
router.get('/stats/toxicity-trends', adminOnly, getToxicityTrends);

// ==========================================
// AUDIT LOGS
// ==========================================
router.get('/audit-logs', adminOnly, getAuditLogs);

// ==========================================
// MODERATOR MANAGEMENT
// ==========================================
router.post('/create-moderator', adminOnly, createModerator);

// ==========================================
// USER MANAGEMENT (admin full list + actions)
// ==========================================
router.get('/users', staffOnly, getAllUsers);
router.get('/users/all', adminOnly, getAllUsersAdmin);
router.post('/ban/:userId', staffOnly, banUser);
router.patch('/users/:userId/role', adminOnly, changeUserRole);
router.post('/users/:userId/reset-reputation', adminOnly, resetReputation);
router.get('/chat-context/:messageId', staffOnly, getMessageContext);
router.post('/warn/:userId', staffOnly, warnUser);
router.post('/reputation/:userId', staffOnly, adjustReputation);

// ==========================================
// LFG SESSION MANAGEMENT
// ==========================================
router.get('/lfg/sessions', adminOnly, getAdminSessions);
router.get('/lfg/deletion-log', adminOnly, getDeletionLog);

// ==========================================
// FRACTURE ALGORITHM CONFIG
// ==========================================
router.get('/config', adminOnly, getConfig);
router.patch('/config', adminOnly, updateConfig);

export default router;
