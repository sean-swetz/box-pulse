import express from 'express';
import { prisma } from '../db/client.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

function formatMessage(msg, currentUserId) {
  return {
    id: msg.id,
    userId: msg.userId,
    userName: msg.user?.name,
    userPhoto: msg.user?.photoUrl,
    text: msg.text ?? null,
    gifUrl: msg.gifUrl ?? null,
    gifTitle: msg.gifTitle ?? null,
    reactions: {},
    timestamp: msg.createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    createdAt: msg.createdAt,
    isMine: msg.userId === currentUserId,
  };
}

// ===== GET /locker-room?gymId=xxx =====
router.get('/locker-room', authenticateToken, async (req, res) => {
  try {
    const { gymId } = req.query;
    if (!gymId) return res.status(400).json({ error: 'gymId is required' });

    // Verify membership
    const membership = await prisma.gymMembership.findUnique({
      where: { userId_gymId: { userId: req.user.id, gymId } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this gym' });

    const messages = await prisma.message.findMany({
      where: { gymId },
      include: { user: { select: { id: true, name: true, photoUrl: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    res.json(messages.map(m => formatMessage(m, req.user.id)));
  } catch (error) {
    console.error('Get locker room messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ===== POST /locker-room =====
router.post('/locker-room', authenticateToken, async (req, res) => {
  try {
    const { gymId, text, gifUrl, gifTitle } = req.body;
    if (!gymId) return res.status(400).json({ error: 'gymId is required' });

    const membership = await prisma.gymMembership.findUnique({
      where: { userId_gymId: { userId: req.user.id, gymId } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this gym' });

    const message = await prisma.message.create({
      data: { gymId, userId: req.user.id, text, gifUrl, gifTitle },
      include: { user: { select: { id: true, name: true, photoUrl: true } } },
    });

    res.status(201).json(formatMessage(message, req.user.id));
  } catch (error) {
    console.error('Post locker room message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ===== GET /team/:teamId =====
router.get('/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    // Verify user is on the team
    const membership = await prisma.teamMembership.findFirst({
      where: { teamId, userId: req.user.id },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this team' });

    const messages = await prisma.teamMessage.findMany({
      where: { teamId },
      include: { user: { select: { id: true, name: true, photoUrl: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    res.json(messages.map(m => formatMessage(m, req.user.id)));
  } catch (error) {
    console.error('Get team messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ===== POST /team/:teamId =====
router.post('/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { text, gifUrl, gifTitle } = req.body;

    const membership = await prisma.teamMembership.findFirst({
      where: { teamId, userId: req.user.id },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this team' });

    const message = await prisma.teamMessage.create({
      data: { teamId, userId: req.user.id, text, gifUrl, gifTitle },
      include: { user: { select: { id: true, name: true, photoUrl: true } } },
    });

    res.status(201).json(formatMessage(message, req.user.id));
  } catch (error) {
    console.error('Post team message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
