import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Dumbbell } from 'lucide-react-native';
import { authAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      await setAuth(response.data.user, response.data.token);
      router.replace('/gym-select');
    } catch (error) {
      Alert.alert('Login Failed', error.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background-dark"
    >
      <View className="flex-1 justify-center px-6">
        {/* Logo */}
        <View className="items-center mb-12">
          <View className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl mb-4">
            <Dumbbell size={48} color="#0df259" strokeWidth={2} />
          </View>
          <Text className="font-display text-4xl font-extrabold text-white">
            Box<Text className="text-primary">Pulse</Text>
          </Text>
          <Text className="text-slate-400 font-medium uppercase tracking-widest text-xs mt-2">
            CrossFit Challenge Tracker
          </Text>
        </View>

        {/* Login Form */}
        <View className="space-y-4">
          <View>
            <Text className="text-slate-400 text-sm font-medium mb-2">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              keyboardType="email-address"
              className="bg-slate-800 text-white px-4 py-4 rounded-xl border border-slate-700 focus:border-primary"
            />
          </View>

          <View>
            <Text className="text-slate-400 text-sm font-medium mb-2">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
              className="bg-slate-800 text-white px-4 py-4 rounded-xl border border-slate-700 focus:border-primary"
            />
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className={`bg-primary py-4 rounded-xl mt-4 ${loading ? 'opacity-50' : ''}`}
          >
            <Text className="text-background-dark text-center font-bold text-lg">
              {loading ? 'Logging in...' : 'Login'}
            </Text>
          </TouchableOpacity>

          <View className="flex-row justify-center mt-6">
            <Text className="text-slate-400">Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text className="text-primary font-bold">Sign up</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-4">
            <TouchableOpacity onPress={() => router.push('/(auth)/join')}>
              <Text className="text-slate-400 font-medium">Join with invite code →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
