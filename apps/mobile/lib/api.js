import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// User endpoints
export const userAPI = {
  getStats: (gymId) => api.get(`/users/me/stats?gymId=${gymId}`),
  updateProfile: (data) => api.put('/users/me', data),
};

// Gym endpoints
export const gymAPI = {
  create: (data) => api.post('/gyms', data),
  getMyGyms: () => api.get('/gyms/user/my-gyms'),
  getBySlug: (slug) => api.get(`/gyms/slug/${slug}`),
  getById: (id) => api.get(`/gyms/${id}`),
  getChallenges: (gymId) => api.get(`/gyms/${gymId}/challenges`),
  getInvites: (gymId) => api.get(`/gyms/${gymId}/invites`),
  update: (id, data) => api.put(`/gyms/${id}`, data),
  createInvite: (gymId, data) => api.post(`/gyms/${gymId}/invites`, data),
  joinWithCode: (code) => api.post(`/gyms/join/${code}`),
};

// Challenge endpoints
export const challengeAPI = {
  create: (data) => api.post('/challenges', data),
  get: (id) => api.get(`/challenges/${id}`),
  update: (id, data) => api.put(`/challenges/${id}`, data),
  toggleWindow: (id, isOpen) => api.post(`/challenges/${id}/checkin-window/toggle`, { isOpen }),
  addCriteria: (challengeId, data) => api.post(`/challenges/${challengeId}/criteria`, data),
};

// Checkin endpoints  
export const checkinAPI = {
  submit: (data) => api.post('/checkins', data),
  getDraft: (challengeId) => api.get(`/checkins/draft?challengeId=${challengeId}`),
  saveDraft: (data) => api.put('/checkins/draft', data),
};

// Leaderboard endpoints
export const leaderboardAPI = {
  individual: (challengeId, gymId) => api.get(`/leaderboard/individual?challengeId=${challengeId}&gymId=${gymId}`),
  teams: (challengeId, gymId) => api.get(`/leaderboard/teams?challengeId=${challengeId}&gymId=${gymId}`),
};

// Team endpoints
export const teamAPI = {
  create: (data) => api.post('/teams', data),
  getByGym: (gymId) => api.get(`/teams?gymId=${gymId}`),
  getById: (id) => api.get(`/teams/${id}`),
};

// Admin endpoints
export const adminAPI = {
  getStats: (gymId) => api.get(`/admin/stats?gymId=${gymId}`),
  getMembers: (gymId) => api.get(`/admin/members?gymId=${gymId}`),
  assignTeam: (userId, gymId, teamId) => api.put(`/admin/users/${userId}/team`, { gymId, teamId }),
  adjustPoints: (data) => api.post('/admin/points', data),
  setCoach: (userId, gymId, isCoach) => api.put(`/admin/users/${userId}/coach`, { gymId, isCoach }),
};

// Coach endpoints
export const coachAPI = {
  getMyTeams: () => api.get('/coaches/my-teams'),
};

// Message endpoints
export const messageAPI = {
  getLockerRoom: (gymId) => api.get(`/messages/locker-room?gymId=${gymId}`),
  postLockerRoom: (data) => api.post('/messages/locker-room', data),
  getTeam: (teamId) => api.get(`/messages/team/${teamId}`),
  postTeam: (teamId, data) => api.post(`/messages/team/${teamId}`, data),
};

// Recipe endpoints
export const recipeAPI = {
  list: (gymId, category) => api.get(`/recipes?gymId=${gymId}${category && category !== 'All' ? `&category=${encodeURIComponent(category)}` : ''}`),
  create: (data) => api.post('/recipes', data),
  get: (id) => api.get(`/recipes/${id}`),
  update: (id, data) => api.put(`/recipes/${id}`, data),
  delete: (id) => api.delete(`/recipes/${id}`),
  like: (id) => api.post(`/recipes/${id}/like`),
};

// Report endpoints (coach/admin)
export const reportAPI = {
  member: (userId, gymId, challengeId) =>
    api.get(`/reports/member/${userId}?gymId=${gymId}&challengeId=${challengeId}`),
  team: (teamId, challengeId) =>
    api.get(`/reports/team/${teamId}?challengeId=${challengeId}`),
  gym: (gymId, challengeId) =>
    api.get(`/reports/gym/${gymId}?challengeId=${challengeId}`),
};

// Goal endpoints
export const goalAPI = {
  list: () => api.get('/goals'),
  create: (data) => api.post('/goals', data),
  update: (id, data) => api.put(`/goals/${id}`, data),
  delete: (id) => api.delete(`/goals/${id}`),
  getForUser: (userId) => api.get(`/goals/user/${userId}`),
};

export default api;
