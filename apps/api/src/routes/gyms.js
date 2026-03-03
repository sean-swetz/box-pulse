import express from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Validation schemas
const createGymSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  ownerName: z.string().min(1),
  primaryColor: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  address: z.string().optional(),
  instagramUrl: z.string().url().optional(),
  facebookUrl: z.string().url().optional(),
});

const updateGymSchema = z.object({
  name: z.string().optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  address: z.string().optional(),
  instagramUrl: z.string().url().optional(),
  facebookUrl: z.string().url().optional(),
});

// ===== CREATE GYM =====
router.post('/', authenticateToken, async (req, res) => {
  try {
    const data = createGymSchema.parse(req.body);

    const existing = await prisma.gym.findUnique({
      where: { slug: data.slug }
    });

    if (existing) {
      return res.status(400).json({ error: 'Gym slug already taken' });
    }

    const gym = await prisma.gym.create({
      data: {
        name: data.name,
        slug: data.slug,
        ownerEmail: req.user.email,
        ownerName: data.ownerName,
        primaryColor: data.primaryColor || '#0df259',
        phone: data.phone,
        email: data.email,
        website: data.website,
        address: data.address,
        instagramUrl: data.instagramUrl,
        facebookUrl: data.facebookUrl,
      }
    });

    await prisma.gymMembership.create({
      data: {
        userId: req.user.id,
        gymId: gym.id,
        role: 'owner',
      }
    });

    res.status(201).json(gym);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create gym error:', error);
    res.status(500).json({ error: 'Failed to create gym' });
  }
});

// ===== GET GYM BY SLUG =====
router.get('/slug/:slug', authenticateToken, async (req, res) => {
  try {
    const gym = await prisma.gym.findUnique({
      where: { slug: req.params.slug },
      include: {
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, email: true, photoUrl: true }
            }
          }
        },
        coaches: {
          include: {
            user: {
              select: { id: true, name: true, email: true, photoUrl: true }
            },
            team: true,
          }
        },
        teams: true,
        challenges: {
          where: { isActive: true },
          include: {
            criteria: {
              where: { isActive: true },
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    const membership = gym.memberships.find(m => m.userId === req.user.id);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this gym' });
    }

    // Check if user is a coach
    const isCoach = gym.coaches.some(c => c.userId === req.user.id);

    res.json({ ...gym, userRole: membership.role, isCoach });
  } catch (error) {
    console.error('Get gym error:', error);
    res.status(500).json({ error: 'Failed to fetch gym' });
  }
});

// ===== GET USER'S GYMS =====
router.get('/user/my-gyms', authenticateToken, async (req, res) => {
  try {
    const memberships = await prisma.gymMembership.findMany({
      where: {
        userId: req.user.id,
        isActive: true,
      },
      include: {
        gym: {
          include: {
            challenges: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    // Check if user is a coach at any of these gyms
    const coachingAt = await prisma.gymCoach.findMany({
      where: { userId: req.user.id },
      select: { gymId: true }
    });

    const coachGymIds = new Set(coachingAt.map(c => c.gymId));

    const gyms = memberships.map(m => ({
      ...m.gym,
      role: m.role,
      isCoach: coachGymIds.has(m.gymId),
    }));

    res.json(gyms);
  } catch (error) {
    console.error('Get user gyms error:', error);
    res.status(500).json({ error: 'Failed to fetch gyms' });
  }
});

// ===== GET GYM BY ID =====
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const gym = await prisma.gym.findUnique({
      where: { id: req.params.id },
    });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const membership = await prisma.gymMembership.findUnique({
      where: { userId_gymId: { userId: req.user.id, gymId: req.params.id } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this gym' });

    res.json({ ...gym, userRole: membership.role });
  } catch (error) {
    console.error('Get gym by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch gym' });
  }
});

// ===== GET GYM CHALLENGES =====
router.get('/:gymId/challenges', authenticateToken, async (req, res) => {
  try {
    const membership = await prisma.gymMembership.findUnique({
      where: { userId_gymId: { userId: req.user.id, gymId: req.params.gymId } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this gym' });

    const challenges = await prisma.challenge.findMany({
      where: { gymId: req.params.gymId },
      include: {
        criteria: { where: { isActive: true }, orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(challenges);
  } catch (error) {
    console.error('Get gym challenges error:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

// ===== GET GYM INVITES =====
router.get('/:gymId/invites', authenticateToken, async (req, res) => {
  try {
    const membership = await prisma.gymMembership.findUnique({
      where: { userId_gymId: { userId: req.user.id, gymId: req.params.gymId } },
    });
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const invites = await prisma.gymInvite.findMany({
      where: { gymId: req.params.gymId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(invites);
  } catch (error) {
    console.error('Get gym invites error:', error);
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
});

// ===== UPDATE GYM =====
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const membership = await prisma.gymMembership.findUnique({
      where: {
        userId_gymId: {
          userId: req.user.id,
          gymId: req.params.id
        }
      }
    });

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Owner or admin access required' });
    }

    const data = updateGymSchema.parse(req.body);

    const updatedGym = await prisma.gym.update({
      where: { id: req.params.id },
      data,
    });

    res.json(updatedGym);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update gym error:', error);
    res.status(500).json({ error: 'Failed to update gym' });
  }
});

// ===== CREATE INVITE CODE =====
router.post('/:id/invites', authenticateToken, async (req, res) => {
  try {
    const membership = await prisma.gymMembership.findUnique({
      where: {
        userId_gymId: {
          userId: req.user.id,
          gymId: req.params.id
        }
      }
    });

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Owner or admin access required' });
    }

    const { maxUses, expiresAt } = req.body;
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

    const invite = await prisma.gymInvite.create({
      data: {
        gymId: req.params.id,
        code,
        maxUses: maxUses || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: req.user.id,
      }
    });

    res.status(201).json(invite);
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// ===== JOIN GYM WITH INVITE CODE =====
router.post('/join/:code', authenticateToken, async (req, res) => {
  try {
    const invite = await prisma.gymInvite.findUnique({
      where: { code: req.params.code.toUpperCase() },
      include: { gym: true }
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Invite code has expired' });
    }

    if (invite.maxUses && invite.uses >= invite.maxUses) {
      return res.status(400).json({ error: 'Invite code has reached maximum uses' });
    }

    const existing = await prisma.gymMembership.findUnique({
      where: {
        userId_gymId: {
          userId: req.user.id,
          gymId: invite.gymId
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Already a member of this gym' });
    }

    const membership = await prisma.gymMembership.create({
      data: {
        userId: req.user.id,
        gymId: invite.gymId,
        role: 'member',
      },
      include: { gym: true }
    });

    await prisma.gymInvite.update({
      where: { id: invite.id },
      data: { uses: { increment: 1 } }
    });

    res.status(201).json(membership);
  } catch (error) {
    console.error('Join gym error:', error);
    res.status(500).json({ error: 'Failed to join gym' });
  }
});

export default router;
