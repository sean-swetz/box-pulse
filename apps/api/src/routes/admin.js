import express from 'express';
import { prisma } from '../db/client.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

async function requireGymAdmin(req, res, gymId) {
  const membership = await prisma.gymMembership.findUnique({
    where: { userId_gymId: { userId: req.user.id, gymId } },
  });
  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

// GET /api/admin/stats?gymId=xxx
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { gymId } = req.query;
    if (!gymId) return res.status(400).json({ error: 'gymId required' });
    if (!await requireGymAdmin(req, res, gymId)) return;

    const [memberCount, teamCount, challengeCount, inviteCount] = await Promise.all([
      prisma.gymMembership.count({ where: { gymId, isActive: true } }),
      prisma.team.count({ where: { gymId } }),
      prisma.challenge.count({ where: { gymId, isActive: true } }),
      prisma.gymInvite.count({ where: { gymId } }),
    ]);

    res.json({
      totalMembers: memberCount,
      activeTeams: teamCount,
      activeChallenges: challengeCount,
      pendingInvites: inviteCount,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/members?gymId=xxx
router.get('/members', authenticateToken, async (req, res) => {
  try {
    const { gymId } = req.query;
    if (!gymId) return res.status(400).json({ error: 'gymId required' });
    if (!await requireGymAdmin(req, res, gymId)) return;

    const memberships = await prisma.gymMembership.findMany({
      where: { gymId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
            teamMemberships: {
              include: {
                team: { select: { id: true, name: true, color: true } },
              },
            },
            pointAdjustments: {
              where: { gymId },
              select: { points: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const members = memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      photoUrl: m.user.photoUrl,
      role: m.role,
      teams: m.user.teamMemberships.map((tm) => tm.team),
      adjustedPoints: m.user.pointAdjustments.reduce((sum, p) => sum + p.points, 0),
    }));

    res.json(members);
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// PUT /api/admin/users/:id/team
router.put('/users/:id/team', authenticateToken, async (req, res) => {
  try {
    const { teamId, gymId } = req.body;
    if (!gymId) return res.status(400).json({ error: 'gymId required' });
    if (!await requireGymAdmin(req, res, gymId)) return;

    const gymTeams = await prisma.team.findMany({
      where: { gymId },
      select: { id: true },
    });
    const gymTeamIds = gymTeams.map((t) => t.id);

    if (gymTeamIds.length > 0) {
      await prisma.teamMembership.deleteMany({
        where: { userId: req.params.id, teamId: { in: gymTeamIds } },
      });
    }

    if (teamId) {
      await prisma.teamMembership.create({
        data: { userId: req.params.id, teamId },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Assign team error:', error);
    res.status(500).json({ error: 'Failed to assign team' });
  }
});

// POST /api/admin/points
router.post('/points', authenticateToken, async (req, res) => {
  try {
    const { userId, gymId, points, reason } = req.body;
    if (!gymId || !userId || points === undefined || !reason) {
      return res.status(400).json({ error: 'userId, gymId, points, and reason are required' });
    }
    if (!await requireGymAdmin(req, res, gymId)) return;

    const adjustment = await prisma.pointAdjustment.create({
      data: {
        userId,
        gymId,
        points: parseInt(points),
        reason,
        adjustedBy: req.user.email,
      },
    });

    res.status(201).json(adjustment);
  } catch (error) {
    console.error('Adjust points error:', error);
    res.status(500).json({ error: 'Failed to adjust points' });
  }
});

export default router;
