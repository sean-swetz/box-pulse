import jwt from 'jsonwebtoken';
import { prisma } from '../db/client.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        nickname: true,
        photoUrl: true,
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    }
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

export const authenticateAdmin = async (req, res, next) => {
  try {
    await authenticateToken(req, res, async () => {
      const membership = await prisma.gymMembership.findFirst({
        where: { 
          userId: req.user.id,
          role: { in: ['owner', 'admin'] }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      req.isAdmin = true;
      next();
    });
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(500).json({ error: 'Admin authentication failed' });
  }
};
