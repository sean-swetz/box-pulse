import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { prisma } from '../db/client.js';

const router = express.Router();

// GET /api/teams?gymId=xxx - List teams for a gym
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { gymId } = req.query;
    if (!gymId) return res.status(400).json({ error: 'gymId required' });

    const membership = await prisma.gymMembership.findUnique({
      where: { userId_gymId: { userId: req.user.id, gymId } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this gym' });

    const teams = await prisma.team.findMany({
      where: { gymId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, photoUrl: true } },
          },
        },
        challenge: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(teams);
  } catch (error) {
    console.error('List teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// POST /api/teams - Create a team
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { gymId, name, color, challengeId } = req.body;
    if (!gymId || !name || !color) {
      return res.status(400).json({ error: 'gymId, name, and color are required' });
    }

    const membership = await prisma.gymMembership.findUnique({
      where: { userId_gymId: { userId: req.user.id, gymId } },
    });
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const team = await prisma.team.create({
      data: { gymId, name, color, challengeId: challengeId || null },
    });

    res.status(201).json(team);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// GET /api/teams/:id - Get team details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        gym: true,
        challenge: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                photoUrl: true,
              }
            }
          },
          orderBy: {
            points: 'desc'
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user is member of this gym OR coaching this team
    const membership = await prisma.gymMembership.findUnique({
      where: {
        userId_gymId: {
          userId: req.user.id,
          gymId: team.gymId
        }
      }
    });

    const coaching = await prisma.gymCoach.findFirst({
      where: {
        userId: req.user.id,
        teamId: req.params.id
      }
    });

    if (!membership && !coaching) {
      return res.status(403).json({ error: 'Not authorized to view this team' });
    }

    res.json(team);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// GET /api/teams/:teamId/checkins - Team check-in status for current window
router.get('/:teamId/checkins', authenticateToken, async (req, res) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.teamId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, photoUrl: true } },
          },
          orderBy: { points: 'desc' },
        },
      },
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    // Auth: gym member or coach at this gym
    const [membership, coach] = await Promise.all([
      prisma.gymMembership.findUnique({
        where: { userId_gymId: { userId: req.user.id, gymId: team.gymId } },
      }),
      prisma.gymCoach.findFirst({ where: { userId: req.user.id, gymId: team.gymId } }),
    ]);
    if (!membership && !coach) return res.status(403).json({ error: 'Not authorized' });

    // Find active challenge for this gym
    const challenge = await prisma.challenge.findFirst({
      where: { gymId: team.gymId, isActive: true },
    });

    // Find window open time — fall back to 7 days ago
    let windowOpenedAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (challenge) {
      const windowState = await prisma.checkinWindowState.findUnique({
        where: { challengeId: challenge.id },
      });
      if (windowState?.lastOpened) windowOpenedAt = windowState.lastOpened;
    }

    // For each member, find their most recent check-in since the window opened
    const memberStatuses = await Promise.all(
      team.members.map(async (m) => {
        const checkin = challenge
          ? await prisma.checkin.findFirst({
              where: {
                userId: m.userId,
                challengeId: challenge.id,
                createdAt: { gte: windowOpenedAt },
              },
              orderBy: { createdAt: 'desc' },
            })
          : null;

        return {
          user: m.user,
          points: m.points,
          completed: !!checkin,
          submittedAt: checkin?.createdAt ?? null,
          weeklyScore: checkin?.weeklyScore ?? null,
        };
      })
    );

    res.json({
      team: { id: team.id, name: team.name, color: team.color },
      windowOpenedAt,
      members: memberStatuses,
    });
  } catch (error) {
    console.error('Team checkins error:', error);
    res.status(500).json({ error: 'Failed to fetch team check-ins' });
  }
});

export default router;
