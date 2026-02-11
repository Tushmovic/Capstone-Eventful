import { Router } from 'express';
import authRoutes from './auth.routes';
import eventRoutes from './event.routes';
import ticketRoutes from './ticket.routes';
import paymentRoutes from './payment.routes';
import analyticsRoutes from './analytics.routes';
import notificationRoutes from './notification.routes'; // ADD THIS

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
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
router.use('/notifications', notificationRoutes); // ADD THIS

export default router;