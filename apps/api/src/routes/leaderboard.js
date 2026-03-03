import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/leaderboard/individual - Individual rankings
router.get('/individual', authenticateToken, async (req, res) => {
  res.json({ message: 'Individual leaderboard endpoint - TODO' });
});

// GET /api/leaderboard/teams - Team standings
router.get('/teams', authenticateToken, async (req, res) => {
  res.json({ message: 'Team leaderboard endpoint - TODO' });
});

export default router;
