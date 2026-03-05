import express from 'express';
import { prisma } from '../db/client.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ===== GET /leaderboard/individual?challengeId=xxx&gymId=xxx =====
router.get('/individual', authenticateToken, async (req, res) => {
  try {
    const { challengeId, gymId } = req.query;
    if (!challengeId || !gymId) {
      return res.status(400).json({ error: 'challengeId and gymId are required' });
    }

    const membership = await prisma.gymMembership.findUnique({
      where: { userId_gymId: { userId: req.user.id, gymId } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this gym' });

    const memberships = await prisma.teamMembership.findMany({
      where: { team: { challengeId, gymId } },
      include: {
        user: { select: { id: true, name: true, photoUrl: true } },
        team: { select: { id: true, name: true, color: true } },
      },
      orderBy: { points: 'desc' },
    });

    const rankings = memberships.map((m, index) => ({
      rank: index + 1,
      userId: m.userId,
      name: m.user.name,
      photoUrl: m.user.photoUrl,
      team: m.team.name,
      teamColor: m.team.color,
      points: m.points,
    }));

    res.json(rankings);
  } catch (error) {
    console.error('Individual leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ===== GET /leaderboard/teams?challengeId=xxx&gymId=xxx =====
router.get('/teams', authenticateToken, async (req, res) => {
  try {
    const { challengeId, gymId } = req.query;
    if (!challengeId || !gymId) {
      return res.status(400).json({ error: 'challengeId and gymId are required' });
    }

    const membership = await prisma.gymMembership.findUnique({
      where: { userId_gymId: { userId: req.user.id, gymId } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this gym' });

    const teams = await prisma.team.findMany({
      where: { challengeId, gymId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, photoUrl: true } } },
          orderBy: { points: 'desc' },
        },
      },
      orderBy: { totalPoints: 'desc' },
    });

    const rankings = teams.map((team, index) => ({
      rank: index + 1,
      id: team.id,
      name: team.name,
      color: team.color,
      points: team.totalPoints,
      members: team.members.length,
      avgPoints: team.members.length > 0
        ? Math.round(team.totalPoints / team.members.length)
        : 0,
      memberList: team.members.map(m => ({
        id: m.userId,
        name: m.user.name,
        photoUrl: m.user.photoUrl,
        points: m.points,
      })),
    }));

    res.json(rankings);
  } catch (error) {
    console.error('Team leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
