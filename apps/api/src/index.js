import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes (we'll create these next)
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import gymRoutes from './routes/gyms.js';
import challengeRoutes from './routes/challenges.js';
import coachRoutes from './routes/coaches.js';
import conversationRoutes from './routes/conversations.js';
import checkinRoutes from './routes/checkins.js';
import criteriaRoutes from './routes/criteria.js';
import leaderboardRoutes from './routes/leaderboard.js';
import teamRoutes from './routes/teams.js';
import messageRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';

// Import socket handlers
import { setupSocketHandlers } from './socket/index.js';

// Import scheduler
import { setupCheckinWindowScheduler } from './scheduler/checkinWindow.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// ===== SOCKET.IO SETUP =====
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST']
  }
});

// Setup socket event handlers
setupSocketHandlers(io);

// Make io accessible in routes
app.set('io', io);

// ===== MIDDLEWARE =====

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// ===== ROUTES =====

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/gyms', gymRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/criteria', criteriaRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// ===== START SERVER =====

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`
🚀 Server running on port ${PORT}
📊 Environment: ${process.env.NODE_ENV || 'development'}
🔌 Socket.io enabled
🏢 Multi-tenant mode
  `);
  
  // Start check-in window scheduler
  setupCheckinWindowScheduler(io);
});

export { app, io };
