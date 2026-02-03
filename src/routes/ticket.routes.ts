import { Router } from 'express';

const router = Router();

// Placeholder routes
router.post('/purchase', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

export default router;