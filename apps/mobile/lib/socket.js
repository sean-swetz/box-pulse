import { io } from 'socket.io-client';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = Constants.expoConfig?.extra?.apiUrl?.replace('/api', '') || 'http://localhost:3000';

let socket = null;

export const initializeSocket = (token) => {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

// Chat event helpers
export const joinConversation = (conversationId) => {
  if (socket) {
    socket.emit('join_conversation', conversationId);
  }
};

export const leaveConversation = (conversationId) => {
  if (socket) {
    socket.emit('leave_conversation', conversationId);
  }
};

export const sendMessage = (conversationId, data) => {
  if (socket) {
    socket.emit('send_message', { conversationId, ...data });
  }
};

export const sendTyping = (conversationId, isTyping) => {
  if (socket) {
    socket.emit('typing', { conversationId, isTyping });
  }
};

export const addReaction = (messageId, emoji) => {
  if (socket) {
    socket.emit('add_reaction', { messageId, emoji });
  }
};

export default {
  initializeSocket,
  disconnectSocket,
  getSocket,
  joinConversation,
  leaveConversation,
  sendMessage,
  sendTyping,
  addReaction,
};
