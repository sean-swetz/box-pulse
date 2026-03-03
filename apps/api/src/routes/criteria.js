import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/criteria - Get all active criteria
router.get('/', authenticateToken, async (req, res) => {
  res.json({ message: 'Get criteria endpoint - TODO' });
});

export default router;
