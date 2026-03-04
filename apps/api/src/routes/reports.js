import express from 'express';
import { prisma } from '../db/client.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ===== HELPERS =====

function weekNumber(checkinDate, challengeStartDate) {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((new Date(checkinDate) - new Date(challengeStartDate)) / msPerWeek) + 1;
}

function buildWeeklyBreakdown(checkins, challengeStartDate) {
  const byWeek = {};
  for (const c of checkins) {
    const w = weekNumber(c.createdAt, challengeStartDate);
    byWeek[w] = (byWeek[w] || 0) + c.weeklyScore;
  }
  return Object.entries(byWeek)
    .map(([week, points]) => ({ week: parseInt(week), points }))
    .sort((a, b) => a.week - b.week);
}

async function isCoachOrAdmin(userId, gymId) {
  const [coach, membership] = await Promise.all([
    prisma.gymCoach.findFirst({ where: { userId, gymId } }),
    prisma.gymMembership.findUnique({ where: { userId_gymId: { userId, gymId } } }),
  ]);
  return !!(coach || (membership && (membership.role === 'owner' || membership.role === 'admin')));
}

async function isAdmin(userId, gymId) {
  const membership = await prisma.gymMembership.findUnique({
    where: { userId_gymId: { userId, gymId } },
  });
  return !!(membership && (membership.role === 'owner' || membership.role === 'admin'));
}

async function getMemberReport(userId, gymId, challengeId) {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) return null;

  const [teamMembership, checkins, goals] = await Promise.all([
    prisma.teamMembership.findFirst({
      where: { userId, team: { challengeId } },
      include: { user: { select: { id: true, name: true, photoUrl: true } } },
    }),
    prisma.checkin.findMany({
      where: { userId, challengeId },
      select: { weeklyScore: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.userGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const user = teamMembership?.user ?? await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, photoUrl: true },
  });

  return {
    user,
    totalPoints: teamMembership?.points ?? 0,
    weeklyBreakdown: buildWeeklyBreakdown(checkins, challenge.startDate),
    goals,
  };
}

// ===== GET /reports/member/:userId?gymId=&challengeId= =====
router.get('/member/:userId', authenticateToken, async (req, res) => {
  try {
    const { gymId, challengeId } = req.query;
    if (!gymId || !challengeId) {
      return res.status(400).json({ error: 'gymId and challengeId are required' });
    }

    const authorized = await isCoachOrAdmin(req.user.id, gymId);
    if (!authorized) return res.status(403).json({ error: 'Coach or admin access required' });

    const report = await getMemberReport(req.params.userId, gymId, challengeId);
    if (!report) return res.status(404).json({ error: 'Challenge not found' });

    res.json(report);
  } catch (error) {
    console.error('Member report error:', error);
    res.status(500).json({ error: 'Failed to generate member report' });
  }
});

// ===== GET /reports/team/:teamId?challengeId= =====
router.get('/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const { challengeId } = req.query;
    if (!challengeId) return res.status(400).json({ error: 'challengeId is required' });

    const team = await prisma.team.findUnique({
      where: { id: req.params.teamId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, photoUrl: true } } },
          orderBy: { points: 'desc' },
        },
      },
    });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    // Verify caller coaches this team or is admin of the gym
    const [coachRecord, membership] = await Promise.all([
      prisma.gymCoach.findFirst({ where: { userId: req.user.id, gymId: team.gymId } }),
      prisma.gymMembership.findUnique({
        where: { userId_gymId: { userId: req.user.id, gymId: team.gymId } },
      }),
    ]);
    const authorized = !!(coachRecord || (membership && (membership.role === 'owner' || membership.role === 'admin')));
    if (!authorized) return res.status(403).json({ error: 'Coach or admin access required' });

    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const members = await Promise.all(
      team.members.map(async (m) => {
        const [checkins, goals] = await Promise.all([
          prisma.checkin.findMany({
            where: { userId: m.userId, challengeId },
            select: { weeklyScore: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          }),
          prisma.userGoal.findMany({
            where: { userId: m.userId },
            orderBy: { createdAt: 'desc' },
          }),
        ]);
        return {
          user: m.user,
          points: m.points,
          weeklyBreakdown: buildWeeklyBreakdown(checkins, challenge.startDate),
          goals,
        };
      })
    );

    res.json({
      team: {
        id: team.id,
        name: team.name,
        color: team.color,
        totalPoints: team.totalPoints,
      },
      members,
    });
  } catch (error) {
    console.error('Team report error:', error);
    res.status(500).json({ error: 'Failed to generate team report' });
  }
});

// ===== GET /reports/gym/:gymId?challengeId= =====
router.get('/gym/:gymId', authenticateToken, async (req, res) => {
  try {
    const { challengeId } = req.query;
    if (!challengeId) return res.status(400).json({ error: 'challengeId is required' });

    const admin = await isAdmin(req.user.id, req.params.gymId);
    if (!admin) return res.status(403).json({ error: 'Owner or admin access required' });

    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const teams = await prisma.team.findMany({
      where: { gymId: req.params.gymId, challengeId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, photoUrl: true } } },
          orderBy: { points: 'desc' },
        },
      },
      orderBy: { totalPoints: 'desc' },
    });

    const teamsWithData = await Promise.all(
      teams.map(async (team) => {
        const members = await Promise.all(
          team.members.map(async (m) => {
            const [checkins, goals] = await Promise.all([
              prisma.checkin.findMany({
                where: { userId: m.userId, challengeId },
                select: { weeklyScore: true, createdAt: true },
                orderBy: { createdAt: 'asc' },
              }),
              prisma.userGoal.findMany({
                where: { userId: m.userId },
                orderBy: { createdAt: 'desc' },
              }),
            ]);
            return {
              user: m.user,
              points: m.points,
              weeklyBreakdown: buildWeeklyBreakdown(checkins, challenge.startDate),
              goals,
            };
          })
        );
        return {
          team: {
            id: team.id,
            name: team.name,
            color: team.color,
            totalPoints: team.totalPoints,
          },
          members,
        };
      })
    );

    res.json({ gymId: req.params.gymId, challengeId, teams: teamsWithData });
  } catch (error) {
    console.error('Gym report error:', error);
    res.status(500).json({ error: 'Failed to generate gym report' });
  }
});

export default router;
