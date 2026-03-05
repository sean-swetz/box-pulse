import express from 'express';
import { prisma } from '../db/client.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Server-side point calculation — mirrors mobile logic
function calculatePoints(criteriaData) {
  let points = 0;
  if (criteriaData?.dailyGoals) {
    Object.values(criteriaData.dailyGoals).forEach(week => {
      if (Array.isArray(week)) {
        points += week.filter(Boolean).length * 5;
      }
    });
  }
  if (criteriaData?.weekly?.attendClasses) points += 15;
  if (criteriaData?.weekly?.noRestrictedFoods) points += 15;
  return points;
}

// ===== POST /checkins — Submit check-in =====
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { challengeId, criteriaData } = req.body;
    if (!challengeId || !criteriaData) {
      return res.status(400).json({ error: 'challengeId and criteriaData are required' });
    }

    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    // Verify gym membership
    const membership = await prisma.gymMembership.findUnique({
      where: { userId_gymId: { userId: req.user.id, gymId: challenge.gymId } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this gym' });

    // Check window is open
    const windowState = await prisma.checkinWindowState.findUnique({ where: { challengeId } });
    if (!windowState?.isOpen) {
      return res.status(403).json({ error: 'Check-in window is currently closed' });
    }

    // Prevent duplicate since window opened
    const existing = await prisma.checkin.findFirst({
      where: {
        userId: req.user.id,
        challengeId,
        createdAt: { gte: windowState.lastOpened ?? new Date(0) },
      },
    });
    if (existing) {
      return res.status(409).json({ error: 'Already submitted a check-in this week' });
    }

    const pointsEarned = calculatePoints(criteriaData);

    const checkin = await prisma.checkin.create({
      data: { userId: req.user.id, challengeId, weeklyScore: pointsEarned, criteriaData },
    });

    // Update team + membership points if user is on a team for this challenge
    const teamMembership = await prisma.teamMembership.findFirst({
      where: { userId: req.user.id, team: { challengeId } },
    });
    if (teamMembership) {
      await prisma.teamMembership.update({
        where: { id: teamMembership.id },
        data: { points: { increment: pointsEarned } },
      });
      await prisma.team.update({
        where: { id: teamMembership.teamId },
        data: { totalPoints: { increment: pointsEarned } },
      });
    }

    // Stamp user's last check-in
    await prisma.user.update({
      where: { id: req.user.id },
      data: { lastCheckinAt: new Date() },
    });

    // Notify clients to refresh leaderboard
    const io = req.app.get('io');
    io?.to(`gym:${challenge.gymId}`).emit('leaderboard_updated', { challengeId });

    res.status(201).json({ checkin, pointsEarned });
  } catch (error) {
    console.error('Submit check-in error:', error);
    res.status(500).json({ error: 'Failed to submit check-in' });
  }
});

// ===== GET /checkins/draft =====
router.get('/draft', authenticateToken, async (req, res) => {
  try {
    const { challengeId } = req.query;
    if (!challengeId) return res.status(400).json({ error: 'challengeId is required' });

    const draft = await prisma.checkinDraft.findUnique({
      where: { userId_challengeId: { userId: req.user.id, challengeId } },
    });
    res.json(draft ?? null);
  } catch (error) {
    console.error('Get draft error:', error);
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
});

// ===== PUT /checkins/draft =====
router.put('/draft', authenticateToken, async (req, res) => {
  try {
    const { challengeId, criteriaData } = req.body;
    if (!challengeId || !criteriaData) {
      return res.status(400).json({ error: 'challengeId and criteriaData are required' });
    }

    const draft = await prisma.checkinDraft.upsert({
      where: { userId_challengeId: { userId: req.user.id, challengeId } },
      update: { criteriaData },
      create: { userId: req.user.id, challengeId, criteriaData },
    });
    res.json(draft);
  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

export default router;
