import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import { sendPushToGymMembers } from '../services/pushNotifications.js';

const router = express.Router();

// GET /api/announcements?gymId= — list for a gym (any member)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { gymId } = req.query;
    if (!gymId) return res.status(400).json({ error: 'gymId required' });

    const membership = await prisma.gymMembership.findUnique({
      where: { userId_gymId: { userId: req.user.id, gymId } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this gym' });

    const announcements = await prisma.announcement.findMany({
      where: { gymId },
      include: {
        author: { select: { id: true, name: true, photoUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(announcements);
  } catch (error) {
    console.error('List announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// POST /api/announcements — create (admin or coach)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { gymId, title, body } = req.body;
    if (!gymId || !title?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'gymId, title, and body are required' });
    }

    const [membership, coach] = await Promise.all([
      prisma.gymMembership.findUnique({
        where: { userId_gymId: { userId: req.user.id, gymId } },
      }),
      prisma.gymCoach.findFirst({ where: { userId: req.user.id, gymId } }),
    ]);

    const isAdmin = membership?.role === 'owner' || membership?.role === 'admin';
    if (!isAdmin && !coach) {
      return res.status(403).json({ error: 'Coach or admin access required' });
    }

    const announcement = await prisma.announcement.create({
      data: { gymId, authorId: req.user.id, title: title.trim(), body: body.trim() },
      include: {
        author: { select: { id: true, name: true, photoUrl: true } },
      },
    });

    // Fire-and-forget push to all gym members (exclude author)
    sendPushToGymMembers(gymId, {
      title: `📣 New Announcement`,
      body: title.trim(),
      data: { type: 'announcement', gymId, announcementId: announcement.id },
    }, req.user.id).catch(console.error);

    res.status(201).json(announcement);
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

export default router;
