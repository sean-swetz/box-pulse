import express from 'express';
import { prisma } from '../db/client.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendPushToUsers } from '../services/pushNotifications.js';

const router = express.Router();

// ===== LIST USER'S DM CONVERSATIONS =====
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { gymId } = req.query;

    const participations = await prisma.conversationParticipant.findMany({
      where: { userId: req.user.id },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: { select: { id: true, name: true, photoUrl: true } },
              },
            },
            messages: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const convs = participations
      .filter(p => p.conversation && p.conversation.type === 'dm' && (!gymId || p.conversation.gymId === gymId))
      .sort((a, b) => {
        const aTime = a.conversation.lastMessageAt ? new Date(a.conversation.lastMessageAt) : new Date(0);
        const bTime = b.conversation.lastMessageAt ? new Date(b.conversation.lastMessageAt) : new Date(0);
        return bTime - aTime;
      })
      .map(p => {
        const conv = p.conversation;
        const other = conv.participants.find(pt => pt.userId !== req.user.id);
        const lastMsg = conv.messages[0];
        return {
          id: conv.id,
          type: 'dm',
          name: other?.user?.name ?? 'Unknown',
          photoUrl: other?.user?.photoUrl ?? null,
          participantId: other?.user?.id ?? null,
          lastMessage: lastMsg?.text ?? (lastMsg?.gifUrl ? 'GIF' : null) ?? '',
          lastMessageAt: conv.lastMessageAt,
          unreadCount: p.unreadCount ?? 0,
        };
      });

    res.json(convs);
  } catch (error) {
    console.error('List conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// ===== CREATE OR FIND DM CONVERSATION =====
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { gymId, participantId } = req.body;
    if (!participantId) return res.status(400).json({ error: 'participantId required' });
    if (participantId === req.user.id) return res.status(400).json({ error: 'Cannot DM yourself' });

    const [myMembership, theirMembership] = await Promise.all([
      prisma.gymMembership.findUnique({ where: { userId_gymId: { userId: req.user.id, gymId } } }),
      prisma.gymMembership.findUnique({ where: { userId_gymId: { userId: participantId, gymId } } }),
    ]);
    if (!myMembership) return res.status(403).json({ error: 'Not a gym member' });
    if (!theirMembership) return res.status(404).json({ error: 'User not found in this gym' });

    // Find existing DM between these two users in this gym
    const myParticipations = await prisma.conversationParticipant.findMany({
      where: { userId: req.user.id },
      select: { conversationId: true },
    });
    const myConvIds = myParticipations.map(p => p.conversationId);

    const existing = await prisma.conversation.findFirst({
      where: {
        id: { in: myConvIds },
        type: 'dm',
        gymId,
        participants: { some: { userId: participantId } },
      },
    });

    if (existing) return res.json(existing);

    const conv = await prisma.conversation.create({
      data: {
        type: 'dm',
        gymId,
        participants: {
          create: [{ userId: req.user.id }, { userId: participantId }],
        },
      },
    });

    res.status(201).json(conv);
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// ===== GET CONVERSATION MESSAGES =====
router.get('/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Check if user has access to this conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: req.user.id
      }
    });

    if (!participant) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }

    // Get messages
    const messages = await prisma.conversationMessage.findMany({
      where: {
        conversationId,
        deletedAt: null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        },
        replyTo: {
          select: {
            id: true,
            text: true,
            user: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 100 // Last 100 messages
    });

    // Format messages
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      userId: msg.userId,
      userName: msg.user?.name,
      userPhoto: msg.user?.photoUrl,
      text: msg.text,
      imageUrl: msg.imageUrl,
      gifUrl: msg.gifUrl,
      gifTitle: msg.gifTitle,
      replyTo: msg.replyTo,
      reactions: msg.reactions || {},
      timestamp: msg.createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      createdAt: msg.createdAt,
      isMine: msg.userId === req.user.id
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ===== SEND MESSAGE =====
router.post('/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, imageUrl, gifUrl, gifTitle, replyToId } = req.body;

    // Check if user has access
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: req.user.id
      }
    });

    if (!participant) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }

    // Create message
    const message = await prisma.conversationMessage.create({
      data: {
        conversationId,
        userId: req.user.id,
        text,
        imageUrl,
        gifUrl,
        gifTitle,
        replyToId,
        reactions: {}
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        }
      }
    });

    // Update conversation last message time
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() }
    });

    // Notify other participants via socket + push
    const otherParticipants = await prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: req.user.id } },
      select: { userId: true },
    });

    const formattedMessage = {
      id: message.id,
      userId: message.userId,
      userName: message.user.name,
      userPhoto: message.user.photoUrl,
      text: message.text,
      imageUrl: message.imageUrl,
      gifUrl: message.gifUrl,
      reactions: {},
      timestamp: message.createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      conversationId,
      isMine: true
    };

    // Emit to all participants via socket
    const io = req.app.get('io');
    const allParticipants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    allParticipants.forEach(p => {
      io.to(`user:${p.userId}`).emit('new_dm_message', {
        ...formattedMessage,
        isMine: p.userId === req.user.id,
      });
    });

    // Push notification to recipients (not sender)
    if (otherParticipants.length > 0) {
      sendPushToUsers(otherParticipants.map(p => p.userId), {
        title: message.user.name,
        body: text || (gifUrl ? 'Sent a GIF 🎬' : imageUrl ? 'Sent a photo 📷' : ''),
        data: { type: 'dm', conversationId },
      }).catch(console.error);
    }

    res.status(201).json(formattedMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ===== ADD REACTION =====
router.post('/messages/:messageId/reactions', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await prisma.conversationMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Update reactions
    const reactions = message.reactions || {};
    if (!reactions[emoji]) reactions[emoji] = [];
    
    // Toggle reaction
    const userIndex = reactions[emoji].indexOf(req.user.id);
    if (userIndex > -1) {
      reactions[emoji].splice(userIndex, 1);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji].push(req.user.id);
    }

    await prisma.conversationMessage.update({
      where: { id: messageId },
      data: { reactions }
    });

    // TODO: Emit socket event
    // io.to(message.conversationId).emit('reaction_added', { messageId, userId: req.user.id, emoji });

    res.json({ reactions });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// ===== DELETE MESSAGE =====
router.delete('/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.conversationMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.userId !== req.user.id) {
      return res.status(403).json({ error: 'Can only delete your own messages' });
    }

    // Soft delete
    await prisma.conversationMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
