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

    // Fetch coach records for this gym in one query
    const coachRecords = await prisma.gymCoach.findMany({
      where: { gymId },
      select: { userId: true, id: true },
    });
    const coachMap = Object.fromEntries(coachRecords.map((c) => [c.userId, c.id]));

    const members = memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      photoUrl: m.user.photoUrl,
      role: m.role,
      teams: m.user.teamMemberships.map((tm) => tm.team),
      adjustedPoints: m.user.pointAdjustments.reduce((sum, p) => sum + p.points, 0),
      isCoach: !!coachMap[m.user.id],
      coachId: coachMap[m.user.id] ?? null,
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

// PUT /api/admin/users/:id/coach
router.put('/users/:id/coach', authenticateToken, async (req, res) => {
  try {
    const { gymId, isCoach } = req.body;
    if (!gymId) return res.status(400).json({ error: 'gymId required' });
    if (!await requireGymAdmin(req, res, gymId)) return;

    const targetMembership = await prisma.gymMembership.findUnique({
      where: { userId_gymId: { userId: req.params.id, gymId } },
    });
    if (!targetMembership) return res.status(400).json({ error: 'User is not a member of this gym' });

    if (isCoach) {
      const existing = await prisma.gymCoach.findFirst({ where: { userId: req.params.id, gymId } });
      if (!existing) {
        await prisma.gymCoach.create({ data: { userId: req.params.id, gymId } });
      }
    } else {
      await prisma.gymCoach.deleteMany({ where: { userId: req.params.id, gymId } });
    }

    res.json({ success: true, isCoach: !!isCoach });
  } catch (error) {
    console.error('Set coach error:', error);
    res.status(500).json({ error: 'Failed to update coach status' });
  }
});

// GET /api/admin/checkin-status?gymId=&challengeId=
// Accessible to both admins and coaches
router.get('/checkin-status', authenticateToken, async (req, res) => {
  try {
    const { gymId, challengeId } = req.query;
    if (!gymId || !challengeId) return res.status(400).json({ error: 'gymId and challengeId required' });

    // Allow coaches or gym admins
    const [coachRecord, membership] = await Promise.all([
      prisma.gymCoach.findFirst({ where: { userId: req.user.id, gymId } }),
      prisma.gymMembership.findUnique({ where: { userId_gymId: { userId: req.user.id, gymId } } }),
    ]);
    const isAdmin = membership?.role === 'owner' || membership?.role === 'admin';
    if (!coachRecord && !isAdmin) return res.status(403).json({ error: 'Coach or admin access required' });

    // Get window state
    const windowState = await prisma.checkinWindowState.findUnique({ where: { challengeId } });

    // Get all active members with their team for this challenge
    const memberships = await prisma.gymMembership.findMany({
      where: { gymId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            teamMemberships: {
              where: { team: { challengeId } },
              include: { team: { select: { id: true, name: true, color: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Checkins submitted since the window last opened
    const sinceDate = windowState?.lastOpened ?? new Date(0);
    const recentCheckins = await prisma.checkin.findMany({
      where: { challengeId, createdAt: { gte: sinceDate } },
      select: { userId: true, weeklyScore: true, createdAt: true },
    });
    const checkinMap = Object.fromEntries(recentCheckins.map(c => [c.userId, c]));

    const members = memberships.map(m => ({
      id: m.user.id,
      name: m.user.name,
      photoUrl: m.user.photoUrl,
      team: m.user.teamMemberships[0]?.team ?? null,
      hasCheckedIn: !!checkinMap[m.user.id],
      checkinScore: checkinMap[m.user.id]?.weeklyScore ?? null,
      checkinAt: checkinMap[m.user.id]?.createdAt ?? null,
    }));

    const submitted = members.filter(m => m.hasCheckedIn).length;

    res.json({
      members,
      windowState: {
        isOpen: windowState?.isOpen ?? false,
        lastOpened: windowState?.lastOpened ?? null,
        lastClosed: windowState?.lastClosed ?? null,
      },
      summary: {
        total: members.length,
        submitted,
        missing: members.length - submitted,
      },
    });
  } catch (error) {
    console.error('Get checkin status error:', error);
    res.status(500).json({ error: 'Failed to fetch check-in status' });
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
