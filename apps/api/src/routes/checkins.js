import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/checkins - Submit check-in
router.post('/', authenticateToken, async (req, res) => {
  res.json({ message: 'Submit check-in endpoint - TODO' });
});

// GET /api/checkins/draft - Get draft
router.get('/draft', authenticateToken, async (req, res) => {
  res.json({ message: 'Get draft endpoint - TODO' });
});

// PUT /api/checkins/draft - Save draft
router.put('/draft', authenticateToken, async (req, res) => {
  res.json({ message: 'Save draft endpoint - TODO' });
});

export default router;
