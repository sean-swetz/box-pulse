import express from 'express';
import { prisma } from '../db/client.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

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

    // TODO: Emit socket event to other participants
    // io.to(conversationId).emit('new_message', formattedMessage);

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
      isMine: true
    };

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
