import express from 'express';
import { prisma } from '../db/client.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ===== ADD COACH TO GYM =====
router.post('/:gymId/coaches', authenticateToken, async (req, res) => {
  try {
    const { gymId } = req.params;
    const { userId, teamId } = req.body;

    // Check if requester is owner/admin
    const membership = await prisma.gymMembership.findUnique({
      where: {
        userId_gymId: {
          userId: req.user.id,
          gymId
        }
      }
    });

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Owner or admin access required' });
    }

    // Check if user to be added is a member
    const targetMembership = await prisma.gymMembership.findUnique({
      where: {
        userId_gymId: {
          userId,
          gymId
        }
      }
    });

    if (!targetMembership) {
      return res.status(400).json({ error: 'User must be a gym member first' });
    }

    // Add as coach
    const coach = await prisma.gymCoach.create({
      data: {
        userId,
        gymId,
        teamId: teamId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
          }
        },
        team: true,
      }
    });

    res.status(201).json(coach);
  } catch (error) {
    console.error('Add coach error:', error);
    res.status(500).json({ error: 'Failed to add coach' });
  }
});

// ===== GET GYM COACHES =====
router.get('/:gymId/coaches', authenticateToken, async (req, res) => {
  try {
    const { gymId } = req.params;

    // Check if user is member
    const membership = await prisma.gymMembership.findUnique({
      where: {
        userId_gymId: {
          userId: req.user.id,
          gymId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this gym' });
    }

    const coaches = await prisma.gymCoach.findMany({
      where: { gymId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
          }
        },
        team: true,
      }
    });

    res.json(coaches);
  } catch (error) {
    console.error('Get coaches error:', error);
    res.status(500).json({ error: 'Failed to fetch coaches' });
  }
});

// ===== REMOVE COACH =====
router.delete('/:gymId/coaches/:coachId', authenticateToken, async (req, res) => {
  try {
    const { gymId, coachId } = req.params;

    // Check if requester is owner/admin
    const membership = await prisma.gymMembership.findUnique({
      where: {
        userId_gymId: {
          userId: req.user.id,
          gymId
        }
      }
    });

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Owner or admin access required' });
    }

    await prisma.gymCoach.delete({
      where: { id: coachId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Remove coach error:', error);
    res.status(500).json({ error: 'Failed to remove coach' });
  }
});

// ===== GET MY COACHED TEAMS =====
router.get('/my-teams', authenticateToken, async (req, res) => {
  try {
    const teamInclude = {
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, photoUrl: true },
            },
          },
        },
      },
    };

    const coaching = await prisma.gymCoach.findMany({
      where: { userId: req.user.id },
      include: { gym: true, team: teamInclude },
    });

    // If any GymCoach record has no teamId, fall back to the coach's TeamMembership
    const result = await Promise.all(
      coaching.map(async (c) => {
        if (c.team) return c;

        const teamMembership = await prisma.teamMembership.findFirst({
          where: { userId: req.user.id, team: { gymId: c.gymId } },
          include: { team: teamInclude },
        });

        if (teamMembership?.team) {
          // Also repair the GymCoach record so future requests are fast
          await prisma.gymCoach.update({
            where: { id: c.id },
            data: { teamId: teamMembership.teamId },
          });
          return { ...c, team: teamMembership.team };
        }

        return c;
      })
    );

    res.json(result);
  } catch (error) {
    console.error('Get my teams error:', error);
    res.status(500).json({ error: 'Failed to fetch coached teams' });
  }
});

export default router;
