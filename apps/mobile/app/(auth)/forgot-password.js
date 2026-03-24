import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { authAPI } from '../../lib/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      router.push({ pathname: '/(auth)/reset-password', params: { email: email.trim().toLowerCase() } });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Something went wrong');
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
        <TouchableOpacity onPress={() => router.back()} className="absolute top-16 left-6">
          <Text className="text-slate-400 text-base">← Back</Text>
        </TouchableOpacity>

        <Text className="text-white font-bold text-3xl mb-2">Forgot Password</Text>
        <Text className="text-slate-400 mb-8">Enter your email and we'll send you a 6-digit reset code.</Text>

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
              className="bg-slate-800 text-white px-4 py-4 rounded-xl border border-slate-700"
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className={`bg-primary py-4 rounded-xl mt-4 ${loading ? 'opacity-50' : ''}`}
          >
            <Text className="text-background-dark text-center font-bold text-lg">
              {loading ? 'Sending...' : 'Send Reset Code'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
