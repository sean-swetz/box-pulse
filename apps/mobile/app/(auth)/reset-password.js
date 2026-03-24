import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { authAPI } from '../../lib/api';

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams();
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!code || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (code.length !== 6) {
      Alert.alert('Error', 'Enter the 6-digit code from your email');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({ email, code, newPassword });
      Alert.alert('Success', 'Your password has been reset.', [
        { text: 'Log In', onPress: () => router.replace('/(auth)/login') }
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Invalid or expired code');
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

        <Text className="text-white font-bold text-3xl mb-2">Reset Password</Text>
        <Text className="text-slate-400 mb-8">
          Enter the 6-digit code sent to{' '}
          <Text className="text-primary">{email}</Text>
        </Text>

        <View className="space-y-4">
          <View>
            <Text className="text-slate-400 text-sm font-medium mb-2">Reset Code</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="000000"
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              maxLength={6}
              className="bg-slate-800 text-white px-4 py-4 rounded-xl border border-slate-700 text-center text-2xl tracking-widest"
            />
          </View>

          <View>
            <Text className="text-slate-400 text-sm font-medium mb-2">New Password</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
              className="bg-slate-800 text-white px-4 py-4 rounded-xl border border-slate-700"
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
              className="bg-slate-800 text-white px-4 py-4 rounded-xl border border-slate-700"
            />
          </View>

          <TouchableOpacity
            onPress={handleReset}
            disabled={loading}
            className={`bg-primary py-4 rounded-xl mt-4 ${loading ? 'opacity-50' : ''}`}
          >
            <Text className="text-background-dark text-center font-bold text-lg">
              {loading ? 'Resetting...' : 'Reset Password'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
