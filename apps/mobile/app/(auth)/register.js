import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { authAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.register({ name, email, password });
      await setAuth(response.data.user, response.data.token);
      router.replace('/gym-select');
    } catch (error) {
      Alert.alert('Registration Failed', error.response?.data?.error || error.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background-dark"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">
          {/* Logo */}
          <View className="items-center mb-10">
            <View className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl mb-4">
              <Text className="text-4xl">🏋️</Text>
            </View>
            <Text className="font-display text-4xl font-extrabold text-white">
              Box<Text className="text-primary">Pulse</Text>
            </Text>
            <Text className="text-slate-400 font-medium uppercase tracking-widest text-xs mt-2">
              Create your account
            </Text>
          </View>

          {/* Register Form */}
          <View className="space-y-4">
            <View>
              <Text className="text-slate-400 text-sm font-medium mb-2">Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#64748b"
                autoCapitalize="words"
                className="bg-slate-800 text-white px-4 py-4 rounded-xl border border-slate-700 focus:border-primary"
              />
            </View>

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

            <View>
              <Text className="text-slate-400 text-sm font-medium mb-2">Confirm Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry
                className="bg-slate-800 text-white px-4 py-4 rounded-xl border border-slate-700 focus:border-primary"
              />
            </View>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              className={`bg-primary py-4 rounded-xl mt-4 ${loading ? 'opacity-50' : ''}`}
            >
              <Text className="text-background-dark text-center font-bold text-lg">
                {loading ? 'Creating account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <View className="flex-row justify-center mt-6">
              <Text className="text-slate-400">Already have an account? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text className="text-primary font-bold">Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
