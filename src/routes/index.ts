import { Router } from 'express';
import authRoutes from './auth.routes';
import eventRoutes from './event.routes';

const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Eventful API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      events: '/api/v1/events',
      tickets: '/api/v1/tickets',
      payments: '/api/v1/payments',
      analytics: '/api/v1/analytics',
    },
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/events', eventRoutes);

// Add these placeholders for now
router.use('/tickets', (req, res) => res.status(200).json({ message: 'Tickets endpoint - Coming soon' }));
router.use('/payments', (req, res) => res.status(200).json({ message: 'Payments endpoint - Coming soon' }));
router.use('/analytics', (req, res) => res.status(200).json({ message: 'Analytics endpoint - Coming soon' }));

export default router;