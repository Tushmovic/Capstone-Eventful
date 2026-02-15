import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import eventRoutes from './event.routes';
import ticketRoutes from './ticket.routes';
import paymentRoutes from './payment.routes';
import analyticsRoutes from './analytics.routes';
import notificationRoutes from './notification.routes';
import newsletterRoutes from './newsletter.routes';
import bookmarkRoutes from './bookmark.routes';
import accountRoutes from './account.routes';
import walletRoutes from './wallet.routes';
import refundRoutes from './refund.routes';

const router = Router();

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Eventful API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/tickets', ticketRoutes);
router.use('/payments', paymentRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/bookmarks', bookmarkRoutes);
router.use('/accounts', accountRoutes);
router.use('/wallet', walletRoutes);
router.use('/refunds', refundRoutes);

export default router;