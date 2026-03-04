import express from 'express';
import { prisma } from '../db/client.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

function validateGoal(type, body) {
  if (!['weight', 'lift', 'other'].includes(type)) {
    return 'type must be "weight", "lift", or "other"';
  }
  if (type === 'weight') {
    if (!body.direction || !['gain', 'lose'].includes(body.direction)) {
      return 'Weight goals require direction ("gain" or "lose")';
    }
    if (body.targetWeight == null) return 'Weight goals require targetWeight';
    if (!body.unit || !['lbs', 'kg'].includes(body.unit)) {
      return 'Weight goals require unit ("lbs" or "kg")';
    }
  }
  if (type === 'lift') {
    if (!body.liftName?.trim()) return 'Lift goals require liftName';
    if (body.targetWeight == null) return 'Lift goals require targetWeight';
    if (!body.unit || !['lbs', 'kg'].includes(body.unit)) {
      return 'Lift goals require unit ("lbs" or "kg")';
    }
  }
  if (type === 'other') {
    if (!body.text?.trim()) return 'Other goals require text';
  }
  return null;
}

// GET / — return all goals for the current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const goals = await prisma.userGoal.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(goals);
  } catch (error) {
    console.error('List goals error:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// POST / — create a goal
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type, isPublic, direction, targetWeight, unit, liftName, text } = req.body;

    const validationError = validateGoal(type, req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const goal = await prisma.userGoal.create({
      data: {
        userId: req.user.id,
        type,
        isPublic: isPublic ?? false,
        direction: type === 'weight' ? direction : null,
        targetWeight: ['weight', 'lift'].includes(type) ? parseFloat(targetWeight) : null,
        unit: ['weight', 'lift'].includes(type) ? unit : null,
        liftName: type === 'lift' ? liftName.trim() : null,
        text: type === 'other' ? text.trim() : null,
      },
    });

    res.status(201).json(goal);
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// PUT /:id — update a goal
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await prisma.userGoal.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Goal not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const { isPublic, direction, targetWeight, unit, liftName, text, currentValue, progressNote } = req.body;

    const goal = await prisma.userGoal.update({
      where: { id: req.params.id },
      data: {
        ...(isPublic !== undefined && { isPublic }),
        ...(direction !== undefined && { direction }),
        ...(targetWeight !== undefined && { targetWeight: parseFloat(targetWeight) }),
        ...(unit !== undefined && { unit }),
        ...(liftName !== undefined && { liftName: liftName?.trim() ?? null }),
        ...(text !== undefined && { text: text?.trim() ?? null }),
        ...(currentValue !== undefined && { currentValue: currentValue != null ? parseFloat(currentValue) : null }),
        ...(progressNote !== undefined && { progressNote: progressNote?.trim() ?? null }),
      },
    });

    res.json(goal);
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// DELETE /:id — delete a goal
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await prisma.userGoal.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Goal not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    await prisma.userGoal.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// GET /user/:userId — public goals for another user
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const goals = await prisma.userGoal.findMany({
      where: { userId: req.params.userId, isPublic: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(goals);
  } catch (error) {
    console.error('Get user goals error:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

export default router;
