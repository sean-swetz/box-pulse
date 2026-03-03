import express from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Validation schemas
const createChallengeSchema = z.object({
  gymId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  checkinWindowEnabled: z.boolean().optional(),
  checkinSchedule: z.object({
    openDay: z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']),
    openTime: z.string(), // "17:00" (24h format)
    closeDay: z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']),
    closeTime: z.string(),
  }).optional(),
});

// ===== CREATE CHALLENGE =====
router.post('/', authenticateToken, async (req, res) => {
  try {
    const data = createChallengeSchema.parse(req.body);

    // Check if user is owner/admin of gym
    const membership = await prisma.gymMembership.findUnique({
      where: {
        userId_gymId: {
          userId: req.user.id,
          gymId: data.gymId
        }
      }
    });

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Owner or admin access required' });
    }

    const challenge = await prisma.challenge.create({
      data: {
        gymId: data.gymId,
        name: data.name,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        checkinWindowEnabled: data.checkinWindowEnabled ?? true,
        checkinAutoOpen: data.checkinSchedule ? true : false,
        checkinOpenDay: data.checkinSchedule?.openDay?.toUpperCase() ?? null,
        checkinOpenTime: data.checkinSchedule?.openTime ?? null,
        checkinCloseDay: data.checkinSchedule?.closeDay?.toUpperCase() ?? null,
        checkinCloseTime: data.checkinSchedule?.closeTime ?? null,
      }
    });

    // Create initial check-in window state
    await prisma.checkinWindowState.create({
      data: {
        challengeId: challenge.id,
        isOpen: false,
      }
    });

    res.status(201).json(challenge);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create challenge error:', error);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// ===== GET CHALLENGE =====
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.id },
      include: {
        criteria: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        },
        teams: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    photoUrl: true,
                  }
                }
              }
            }
          }
        },
        gym: true,
      }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Check if user is member of gym
    const membership = await prisma.gymMembership.findUnique({
      where: {
        userId_gymId: {
          userId: req.user.id,
          gymId: challenge.gymId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this gym' });
    }

    // Get check-in window state
    const windowState = await prisma.checkinWindowState.findUnique({
      where: { challengeId: challenge.id }
    });

    res.json({ ...challenge, checkinWindow: windowState });
  } catch (error) {
    console.error('Get challenge error:', error);
    res.status(500).json({ error: 'Failed to fetch challenge' });
  }
});

// ===== UPDATE CHALLENGE =====
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.id }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Check if user is owner/admin
    const membership = await prisma.gymMembership.findUnique({
      where: {
        userId_gymId: {
          userId: req.user.id,
          gymId: challenge.gymId
        }
      }
    });

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Owner or admin access required' });
    }

    const updated = await prisma.challenge.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        description: req.body.description,
        checkinWindowEnabled: req.body.checkinWindowEnabled,
        checkinSchedule: req.body.checkinSchedule,
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update challenge error:', error);
    res.status(500).json({ error: 'Failed to update challenge' });
  }
});

// ===== MANUALLY TOGGLE CHECK-IN WINDOW =====
router.post('/:id/checkin-window/toggle', authenticateToken, async (req, res) => {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.id }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Check if user is owner/admin
    const membership = await prisma.gymMembership.findUnique({
      where: {
        userId_gymId: {
          userId: req.user.id,
          gymId: challenge.gymId
        }
      }
    });

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Owner or admin access required' });
    }

    const { isOpen } = req.body;

    const windowState = await prisma.checkinWindowState.update({
      where: { challengeId: req.params.id },
      data: {
        isOpen,
        lastOpened: isOpen ? new Date() : undefined,
        lastClosed: !isOpen ? new Date() : undefined,
      }
    });

    // Emit socket event to notify users
    const io = req.app.get('io');
    io.to(`challenge:${req.params.id}`).emit('checkin_window_changed', {
      isOpen,
      timestamp: new Date().toISOString(),
    });

    res.json(windowState);
  } catch (error) {
    console.error('Toggle checkin window error:', error);
    res.status(500).json({ error: 'Failed to toggle check-in window' });
  }
});

// ===== ADD CRITERIA TO CHALLENGE =====
router.post('/:id/criteria', authenticateToken, async (req, res) => {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.id }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Check if user is owner/admin
    const membership = await prisma.gymMembership.findUnique({
      where: {
        userId_gymId: {
          userId: req.user.id,
          gymId: challenge.gymId
        }
      }
    });

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Owner or admin access required' });
    }

    const { name, description, type, points, maxCount } = req.body;

    // Get current max order
    const maxOrderCriteria = await prisma.criteria.findFirst({
      where: { challengeId: req.params.id },
      orderBy: { order: 'desc' }
    });

    const criteria = await prisma.criteria.create({
      data: {
        challengeId: req.params.id,
        name,
        description,
        type,
        points,
        maxCount,
        order: (maxOrderCriteria?.order || 0) + 1,
      }
    });

    res.status(201).json(criteria);
  } catch (error) {
    console.error('Create criteria error:', error);
    res.status(500).json({ error: 'Failed to create criteria' });
  }
});

// ===== UPDATE CRITERIA =====
router.put('/:challengeId/criteria/:criteriaId', authenticateToken, async (req, res) => {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.challengeId }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Check if user is owner/admin
    const membership = await prisma.gymMembership.findUnique({
      where: {
        userId_gymId: {
          userId: req.user.id,
          gymId: challenge.gymId
        }
      }
    });

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Owner or admin access required' });
    }

    const updated = await prisma.criteria.update({
      where: { id: req.params.criteriaId },
      data: {
        name: req.body.name,
        description: req.body.description,
        type: req.body.type,
        points: req.body.points,
        maxCount: req.body.maxCount,
        order: req.body.order,
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update criteria error:', error);
    res.status(500).json({ error: 'Failed to update criteria' });
  }
});

// ===== DELETE CRITERIA =====
router.delete('/:challengeId/criteria/:criteriaId', authenticateToken, async (req, res) => {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.challengeId }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Check if user is owner/admin
    const membership = await prisma.gymMembership.findUnique({
      where: {
        userId_gymId: {
          userId: req.user.id,
          gymId: challenge.gymId
        }
      }
    });

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Owner or admin access required' });
    }

    await prisma.criteria.delete({
      where: { id: req.params.criteriaId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete criteria error:', error);
    res.status(500).json({ error: 'Failed to delete criteria' });
  }
});

export default router;
