import { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { ArrowLeft } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { announcementAPI } from '../../lib/api';

const TOOLBAR_ACTIONS = [
  actions.setBold,
  actions.setItalic,
  actions.setUnderline,
  actions.insertBulletsList,
  actions.insertOrderedList,
  actions.heading1,
  actions.heading2,
  actions.undo,
  actions.redo,
];

export default function AnnouncementCompose() {
  const { selectedGym } = useAuthStore();
  const richText = useRef(null);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePost = async () => {
    const html = await richText.current?.getContentHtml();
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title');
      return;
    }
    const stripped = html?.replace(/<[^>]*>/g, '').trim() ?? '';
    if (!stripped) {
      Alert.alert('Required', 'Please write a message');
      return;
    }

    setSaving(true);
    try {
      await announcementAPI.create({
        gymId: selectedGym.id,
        title: title.trim(),
        body: html,
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
      {/* Header */}
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

      {/* Title */}
      <View className="px-5 py-4 border-b border-slate-800">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor="#475569"
          style={{ color: '#ffffff', fontSize: 22, fontWeight: '700' }}
          returnKeyType="next"
          onSubmitEditing={() => richText.current?.focusContentEditor()}
        />
      </View>

      {/* Rich Editor */}
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <RichEditor
          ref={richText}
          placeholder="Write your announcement here…"
          editorStyle={{
            backgroundColor: '#0f1a12',
            color: '#e2e8f0',
            placeholderColor: '#475569',
            contentCSSText: `
              font-size: 16px;
              font-family: -apple-system, sans-serif;
              line-height: 1.65;
              padding: 4px 0 80px;
            `,
          }}
          style={{ minHeight: 400, backgroundColor: '#0f1a12' }}
          initialHeight={400}
          useContainer={false}
        />
      </ScrollView>

      {/* Formatting toolbar — sits above keyboard */}
      <RichToolbar
        editor={richText}
        actions={TOOLBAR_ACTIONS}
        style={{
          backgroundColor: '#1a2e1f',
          borderTopWidth: 1,
          borderTopColor: '#334155',
          height: 50,
        }}
        iconTint="#94a3b8"
        selectedIconTint="#0df259"
        selectedButtonStyle={{ backgroundColor: '#0df25920', borderRadius: 6 }}
        iconSize={20}
      />
    </KeyboardAvoidingView>
  );
}
