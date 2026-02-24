import { Router } from 'express';
import {
  getFlaggedUsers,
  getFlaggedUsersEnhanced,
  banUser,
  getMessageContext,
  getChatContextByUser,
  warnUser,
  adjustReputation,
  muteUser,
  shadowBanUser,
  liftAction,
  terminateSession,
  getTickets,
  assignTicket,
  resolveTicket,
  dismissTicket
} from '../controllers/moderatorController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { staffOnly } from '../middlewares/roleMiddleware';

const router = Router();

router.use(authMiddleware);
router.use(staffOnly);

// ==========================================
// FLAGGED USERS
// ==========================================
router.get('/users', getFlaggedUsers);
router.get('/users/flagged', getFlaggedUsersEnhanced);

// ==========================================
// BAN / WARN / REP (existing)
// ==========================================
router.post('/ban/:userId', banUser);
router.post('/warn/:userId', warnUser);
router.post('/reputation/:userId', adjustReputation);

// ==========================================
// CHAT CONTEXT
// ==========================================
router.get('/chat-context/:messageId', getMessageContext);
router.get('/users/:userId/chat-context', getChatContextByUser);

// ==========================================
// DISCIPLINARY ACTIONS
// ==========================================
router.post('/actions/mute/:userId', muteUser);
router.post('/actions/shadow-ban/:userId', shadowBanUser);
router.delete('/actions/:actionId', liftAction);
router.post('/actions/terminate-session/:sessionId', terminateSession);

// ==========================================
// SUPPORT TICKETS
// ==========================================
router.get('/tickets', getTickets);
router.patch('/tickets/:ticketId/assign', assignTicket);
router.patch('/tickets/:ticketId/resolve', resolveTicket);
router.patch('/tickets/:ticketId/dismiss', dismissTicket);

export default router;
