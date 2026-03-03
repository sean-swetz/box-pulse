import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users/:id - Get user profile
router.get('/:id', authenticateToken, async (req, res) => {
  res.json({ message: 'User profile endpoint - TODO' });
});

// PUT /api/users/:id - Update user profile
router.put('/:id', authenticateToken, async (req, res) => {
  res.json({ message: 'Update profile endpoint - TODO' });
});

export default router;
