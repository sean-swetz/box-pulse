import express from 'express';
import { prisma } from '../db/client.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/criteria?challengeId= — list active criteria for a challenge
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { challengeId } = req.query;
    if (!challengeId) return res.status(400).json({ error: 'challengeId required' });

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { gymId: true },
    });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const membership = await prisma.gymMembership.findUnique({
      where: { userId_gymId: { userId: req.user.id, gymId: challenge.gymId } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a gym member' });

    const criteria = await prisma.criteria.findMany({
      where: { challengeId, isActive: true },
      orderBy: { order: 'asc' },
    });

    res.json(criteria);
  } catch (error) {
    console.error('Get criteria error:', error);
    res.status(500).json({ error: 'Failed to fetch criteria' });
  }
});

export default router;
