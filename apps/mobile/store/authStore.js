import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  selectedGym: null,
  
  setAuth: async (user, token) => {
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user, token });
  },
  
  setSelectedGym: async (gym) => {
    await AsyncStorage.setItem('selectedGym', JSON.stringify(gym));
    set({ selectedGym: gym });
  },
  
  logout: async () => {
    await AsyncStorage.multiRemove(['token', 'user', 'selectedGym']);
    set({ user: null, token: null, selectedGym: null });
  },
  
  loadAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      const gymStr = await AsyncStorage.getItem('selectedGym');
      
      if (token && userStr) {
        set({ 
          token, 
          user: JSON.parse(userStr),
          selectedGym: gymStr ? JSON.parse(gymStr) : null
        });
      }
    } catch (error) {
      console.error('Load auth error:', error);
    }
  },
}));
