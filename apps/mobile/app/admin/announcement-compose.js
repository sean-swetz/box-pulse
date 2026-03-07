import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { announcementAPI } from '../../lib/api';

export default function AnnouncementCompose() {
  const { selectedGym } = useAuthStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePost = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title');
      return;
    }
    if (!body.trim()) {
      Alert.alert('Required', 'Please write a message');
      return;
    }

    setSaving(true);
    try {
      await announcementAPI.create({
        gymId: selectedGym.id,
        title: title.trim(),
        body: body.trim(),
      });
      router.back();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to post announcement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="bg-surface-dark px-5 pt-16 pb-4 border-b border-slate-700 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-2 p-1 -ml-1">
          <ArrowLeft size={22} color="#94a3b8" strokeWidth={2} />
          <Text className="text-slate-400 text-base">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">New Announcement</Text>
        <TouchableOpacity
          onPress={handlePost}
          disabled={saving}
          className="bg-primary px-4 py-2 rounded-xl min-w-[60px] items-center"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#102216" />
          ) : (
            <Text className="text-background-dark font-bold">Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 py-4">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor="#475569"
          style={{ color: '#ffffff', fontSize: 22, fontWeight: '700', marginBottom: 20 }}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Write your announcement here…"
          placeholderTextColor="#475569"
          multiline
          style={{
            color: '#e2e8f0',
            fontSize: 16,
            lineHeight: 26,
            minHeight: 200,
            textAlignVertical: 'top',
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
