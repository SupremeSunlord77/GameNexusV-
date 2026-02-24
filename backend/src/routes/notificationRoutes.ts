import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead
} from '../controllers/notificationController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authenticated } from '../middlewares/roleMiddleware';

const router = Router();

router.use(authMiddleware, authenticated);

router.get('/unread-count', getUnreadCount);
router.get('/', getNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

export default router;
