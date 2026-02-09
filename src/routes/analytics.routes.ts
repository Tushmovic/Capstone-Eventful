import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticated, creatorOnly } from '../middlewares/auth.middleware';

const router = Router();

router.get('/dashboard', authenticated, analyticsController.getDashboardStats);
router.get('/user', authenticated, analyticsController.getUserAnalytics);
router.get('/event/:eventId', authenticated, creatorOnly, analyticsController.getEventAnalytics);

export default router;