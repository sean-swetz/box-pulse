import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Plus, Megaphone, X } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { announcementAPI } from '../../lib/api';

export default function AdminAnnouncements() {
  const { selectedGym } = useAuthStore();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', body: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await announcementAPI.list(selectedGym.id);
      setAnnouncements(res.data);
    } catch (e) {
      console.error('Fetch announcements error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      Alert.alert('Required', 'Please enter a title and message');
      return;
    }
    setSaving(true);
    try {
      const res = await announcementAPI.create({
        gymId: selectedGym.id,
        title: form.title.trim(),
        body: form.body.trim(),
      });
      setAnnouncements((prev) => [res.data, ...prev]);
      setShowModal(false);
      setForm({ title: '', body: '' });
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to post announcement');
    } finally {
      setSaving(false);
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background-dark items-center justify-center">
        <ActivityIndicator size="large" color="#0df259" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-dark">
      {/* Header */}
      <View className="bg-surface-dark px-6 pt-16 pb-4 border-b border-slate-700">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
              <ArrowLeft size={24} color="#ffffff" strokeWidth={2} />
            </TouchableOpacity>
            <Megaphone size={22} color="#0df259" strokeWidth={2} />
            <Text className="text-white text-2xl font-bold">Announcements</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            className="w-10 h-10 bg-primary rounded-xl items-center justify-center"
          >
            <Plus size={20} color="#102216" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {announcements.length === 0 ? (
          <View className="items-center py-20">
            <Megaphone size={48} color="#334155" strokeWidth={1.5} />
            <Text className="text-slate-400 text-base mt-4">No announcements yet</Text>
            <TouchableOpacity
              onPress={() => setShowModal(true)}
              className="mt-4 bg-primary px-6 py-3 rounded-xl"
            >
              <Text className="text-background-dark font-bold">Post First Announcement</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-4">
            {announcements.map((item) => (
              <View key={item.id} className="bg-surface-dark rounded-2xl p-5 border border-slate-700">
                <Text className="text-white font-bold text-base mb-1">{item.title}</Text>
                <Text className="text-slate-400 text-sm leading-relaxed">{item.body}</Text>
                <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-slate-700/60">
                  <Text className="text-slate-500 text-xs flex-1">{item.author?.name}</Text>
                  <Text className="text-slate-600 text-xs">{timeAgo(item.createdAt)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Compose Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-surface-dark rounded-t-3xl px-6 pt-6 pb-12">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-white text-xl font-bold">New Announcement</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setForm({ title: '', body: '' }); }}>
                <X size={24} color="#94a3b8" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-400 text-sm mb-1">Title *</Text>
            <TextInput
              value={form.title}
              onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
              placeholder="e.g. Week 3 Challenge is Open!"
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-white px-4 py-3 rounded-xl mb-5"
            />

            <Text className="text-slate-400 text-sm mb-1">Message *</Text>
            <TextInput
              value={form.body}
              onChangeText={(v) => setForm((f) => ({ ...f, body: v }))}
              placeholder="Write your announcement here..."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-slate-800 text-white px-4 py-3 rounded-xl mb-6"
              style={{ minHeight: 100 }}
            />

            <TouchableOpacity
              onPress={handlePost}
              disabled={saving}
              className="bg-primary py-4 rounded-xl items-center"
            >
              {saving ? (
                <ActivityIndicator color="#102216" />
              ) : (
                <Text className="text-background-dark font-bold text-base">Post Announcement</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
