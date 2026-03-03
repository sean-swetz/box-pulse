import jwt from 'jsonwebtoken';

export const setupSocketHandlers = (io) => {
  // Authentication middleware for sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // ===== TEAM CHAT =====
    
    socket.on('join_team', (teamId) => {
      socket.join(`team:${teamId}`);
      console.log(`User ${socket.userId} joined team ${teamId}`);
    });

    socket.on('leave_team', (teamId) => {
      socket.leave(`team:${teamId}`);
    });

    socket.on('team_message', (data) => {
      const { teamId, message } = data;
      // Broadcast to all users in the team room
      io.to(`team:${teamId}`).emit('new_team_message', {
        ...message,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });

    // ===== LOCKER ROOM (GLOBAL CHAT) =====
    
    socket.on('join_locker_room', () => {
      socket.join('locker_room');
    });

    socket.on('locker_room_message', (message) => {
      io.to('locker_room').emit('new_locker_room_message', {
        ...message,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });

    // ===== LEADERBOARD UPDATES =====
    
    socket.on('join_leaderboard', () => {
      socket.join('leaderboard');
    });

    // Called when someone checks in (from API)
    socket.on('checkin_completed', (data) => {
      // Broadcast leaderboard update to all users watching
      io.to('leaderboard').emit('leaderboard_update', {
        userId: socket.userId,
        points: data.points,
        timestamp: new Date().toISOString(),
      });
    });

    // ===== TYPING INDICATORS =====
    
    socket.on('typing_start', ({ teamId }) => {
      socket.to(`team:${teamId}`).emit('user_typing', {
        userId: socket.userId,
        teamId,
      });
    });

    socket.on('typing_stop', ({ teamId }) => {
      socket.to(`team:${teamId}`).emit('user_stopped_typing', {
        userId: socket.userId,
        teamId,
      });
    });

    // ===== DISCONNECT =====
    
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
};

// Helper function to emit to specific user (call from API routes)
export const emitToUser = (io, userId, event, data) => {
  io.to(`user:${userId}`).emit(event, data);
};

// Helper function to emit to team (call from API routes)
export const emitToTeam = (io, teamId, event, data) => {
  io.to(`team:${teamId}`).emit(event, data);
};
