import express from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const recipeSchema = z.object({
  gymId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  category: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  ingredients: z.array(z.object({ amount: z.string(), item: z.string() })).min(1),
  instructions: z.array(z.object({ step: z.number(), text: z.string() })).min(1),
  macros: z.object({
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
  }).optional(),
});

// ===== GET / — List recipes for a gym =====
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { gymId, category } = req.query;
    if (!gymId) return res.status(400).json({ error: 'gymId is required' });

    const membership = await prisma.gymMembership.findUnique({
      where: { userId_gymId: { userId: req.user.id, gymId } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this gym' });

    const where = { gymId, ...(category && category !== 'All' ? { category } : {}) };

    const recipes = await prisma.recipe.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, photoUrl: true } },
        likes: { where: { userId: req.user.id }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(recipes.map(r => ({
      ...r,
      likedByMe: r.likes.length > 0,
      likes: undefined,
    })));
  } catch (error) {
    console.error('List recipes error:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// ===== POST / — Create recipe =====
router.post('/', authenticateToken, async (req, res) => {
  try {
    const data = recipeSchema.parse(req.body);

    const membership = await prisma.gymMembership.findUnique({
      where: { userId_gymId: { userId: req.user.id, gymId: data.gymId } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this gym' });

    const recipe = await prisma.recipe.create({
      data: { ...data, authorId: req.user.id, imageUrl: data.imageUrl || null },
      include: { author: { select: { id: true, name: true, photoUrl: true } } },
    });

    res.status(201).json({ ...recipe, likedByMe: false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create recipe error:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

// ===== GET /:id — Recipe detail =====
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, name: true, photoUrl: true } },
        likes: { where: { userId: req.user.id }, select: { id: true } },
      },
    });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const membership = await prisma.gymMembership.findUnique({
      where: { userId_gymId: { userId: req.user.id, gymId: recipe.gymId } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this gym' });

    res.json({ ...recipe, likedByMe: recipe.likes.length > 0, likes: undefined });
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// ===== PUT /:id — Update recipe (author or admin only) =====
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id } });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const membership = await prisma.gymMembership.findUnique({
      where: { userId_gymId: { userId: req.user.id, gymId: recipe.gymId } },
    });
    const isAdmin = membership?.role === 'owner' || membership?.role === 'admin';
    if (recipe.authorId !== req.user.id && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to edit this recipe' });
    }

    const data = recipeSchema.partial().parse(req.body);
    const updated = await prisma.recipe.update({
      where: { id: req.params.id },
      data: { ...data, gymId: undefined }, // prevent gym reassignment
      include: { author: { select: { id: true, name: true, photoUrl: true } } },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update recipe error:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// ===== DELETE /:id — Delete recipe (author or admin only) =====
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id } });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const membership = await prisma.gymMembership.findUnique({
      where: { userId_gymId: { userId: req.user.id, gymId: recipe.gymId } },
    });
    const isAdmin = membership?.role === 'owner' || membership?.role === 'admin';
    if (recipe.authorId !== req.user.id && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this recipe' });
    }

    await prisma.recipe.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete recipe error:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

// ===== POST /:id/like — Toggle like =====
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const recipeId = req.params.id;

    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const existing = await prisma.recipeLike.findUnique({
      where: { recipeId_userId: { recipeId, userId: req.user.id } },
    });

    if (existing) {
      await prisma.recipeLike.delete({ where: { id: existing.id } });
      await prisma.recipe.update({
        where: { id: recipeId },
        data: { likesCount: { decrement: 1 } },
      });
      res.json({ liked: false });
    } else {
      await prisma.recipeLike.create({ data: { recipeId, userId: req.user.id } });
      await prisma.recipe.update({
        where: { id: recipeId },
        data: { likesCount: { increment: 1 } },
      });
      res.json({ liked: true });
    }
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

export default router;
