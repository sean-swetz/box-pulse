import express from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  nickname: z.string().optional(),
  favoriteMovement: z.string().optional(),
  favoriteVeggie: z.string().optional(),
  challengeGoal: z.string().optional(),
});

// ===== GET /users/me/stats?gymId=xxx =====
router.get('/me/stats', authenticateToken, async (req, res) => {
  try {
    const { gymId } = req.query;
    if (!gymId) return res.status(400).json({ error: 'gymId is required' });

    // Check if user is a coach at this gym (needed regardless of challenge state)
    const coachRecord = await prisma.gymCoach.findFirst({
      where: { userId: req.user.id, gymId },
    });

    // Find the active challenge for this gym
    const challenge = await prisma.challenge.findFirst({
      where: { gymId, isActive: true },
    });

    if (!challenge) {
      return res.json({ points: 0, rank: null, checkinsCount: 0, team: null, isCoach: !!coachRecord });
    }

    // Get user's team membership for this challenge
    const teamMembership = await prisma.teamMembership.findFirst({
      where: { userId: req.user.id, team: { challengeId: challenge.id } },
      include: { team: { select: { name: true, color: true } } },
    });

    const points = teamMembership?.points ?? 0;

    // Calculate rank: count members with strictly more points
    const aboveCount = await prisma.teamMembership.count({
      where: {
        team: { challengeId: challenge.id },
        points: { gt: points },
      },
    });
    const rank = aboveCount + 1;

    // Count submitted check-ins for this challenge
    const checkinsCount = await prisma.checkin.count({
      where: { userId: req.user.id, challengeId: challenge.id },
    });

    res.json({
      points,
      rank,
      checkinsCount,
      challengeName: challenge.name,
      team: teamMembership?.team ?? null,
      isCoach: !!coachRecord,
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ===== PUT /users/me — Update own profile =====
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true,
        name: true,
        nickname: true,
        email: true,
        photoUrl: true,
        favoriteMovement: true,
        favoriteVeggie: true,
        challengeGoal: true,
      },
    });

    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ===== GET /users/:id — View a user's public profile =====
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        nickname: true,
        photoUrl: true,
        favoriteMovement: true,
        favoriteVeggie: true,
        challengeGoal: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
