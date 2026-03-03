import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Dumbbell, Plus, Hash, X, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { gymAPI } from '../lib/api';

export default function GymSelectScreen() {
  const { user, setSelectedGym } = useAuthStore();
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '', slug: '', ownerName: user?.name || '',
  });
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => { fetchGyms(); }, []);

  const fetchGyms = async () => {
    try {
      const res = await gymAPI.getMyGyms();
      setGyms(res.data);
    } catch (e) {
      console.error('Fetch gyms error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGym = async (gym) => {
    await setSelectedGym(gym);
    router.replace('/(app)/dashboard');
  };

  const autoSlug = (name) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleCreateGym = async () => {
    if (!createForm.name || !createForm.slug || !createForm.ownerName) {
      Alert.alert('Required', 'Name, URL slug, and owner name are required');
      return;
    }
    setSaving(true);
    try {
      const res = await gymAPI.create(createForm);
      const newGym = { ...res.data, role: 'owner' };
      await setSelectedGym(newGym);
      router.replace('/(app)/dashboard');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to create gym');
    } finally {
      setSaving(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Required', 'Enter an invite code');
      return;
    }
    setSaving(true);
    try {
      await gymAPI.joinWithCode(joinCode.trim());
      setShowJoinModal(false);
      setJoinCode('');
      // Reload gym list so user can select the newly joined gym
      setLoading(true);
      await fetchGyms();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Invalid invite code');
    } finally {
      setSaving(false);
    }
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
      <View className="bg-surface-dark px-6 pt-16 pb-6 border-b border-slate-700">
        <View className="flex-row items-center gap-3">
          <Dumbbell size={28} color="#0df259" strokeWidth={2} />
          <View>
            <Text className="text-white text-2xl font-bold">Select Your Gym</Text>
            <Text className="text-slate-400 text-sm">
              Hi {user?.name} — choose a gym to continue
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {gyms.length > 0 ? (
          <>
            <Text className="text-slate-500 text-xs uppercase tracking-widest mb-3">
              Your Gyms
            </Text>
            <View className="gap-3 mb-6">
              {gyms.map((gym) => (
                <TouchableOpacity
                  key={gym.id}
                  onPress={() => handleSelectGym(gym)}
                  className="bg-surface-dark rounded-xl border border-slate-700 p-4 flex-row items-center gap-4 active:bg-slate-800"
                >
                  <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center">
                    <Text className="text-primary text-xl font-bold">
                      {gym.name.substring(0, 1)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-base">{gym.name}</Text>
                    <Text className="text-slate-400 text-sm capitalize">{gym.role}</Text>
                  </View>
                  <ChevronRight size={20} color="#475569" strokeWidth={2} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <View className="items-center py-10">
            <Dumbbell size={56} color="#475569" strokeWidth={1.5} />
            <Text className="text-white text-xl font-bold mt-4">No Gym Yet</Text>
            <Text className="text-slate-400 text-sm mt-2 text-center px-8">
              Create your gym or join one with an invite code from your admin
            </Text>
          </View>
        )}

        <View className="gap-3 mt-2">
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            className="bg-primary p-5 rounded-xl flex-row items-center gap-4"
          >
            <Plus size={24} color="#102216" strokeWidth={2.5} />
            <View>
              <Text className="text-background-dark font-bold text-base">Create a Gym</Text>
              <Text className="text-background-dark/70 text-sm">
                Set up your gym as the owner
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowJoinModal(true)}
            className="bg-surface-dark p-5 rounded-xl border border-slate-700 flex-row items-center gap-4"
          >
            <Hash size={24} color="#0df259" strokeWidth={2} />
            <View>
              <Text className="text-white font-bold text-base">Join with Invite Code</Text>
              <Text className="text-slate-400 text-sm">
                Enter a code from your gym admin
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Create Gym Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-surface-dark rounded-t-3xl px-6 pt-6 pb-12">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-white text-xl font-bold">Create Gym</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color="#94a3b8" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-400 text-sm mb-1">Gym Name *</Text>
            <TextInput
              value={createForm.name}
              onChangeText={(v) =>
                setCreateForm((f) => ({ ...f, name: v, slug: autoSlug(v) }))
              }
              placeholder="e.g. CrossFit Prosperity"
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-white px-4 py-3 rounded-xl mb-4"
            />

            <Text className="text-slate-400 text-sm mb-1">URL Slug *</Text>
            <TextInput
              value={createForm.slug}
              onChangeText={(v) =>
                setCreateForm((f) => ({
                  ...f,
                  slug: v.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                }))
              }
              placeholder="e.g. crossfit-prosperity"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              className="bg-slate-800 text-white px-4 py-3 rounded-xl mb-4"
            />

            <Text className="text-slate-400 text-sm mb-1">Owner Name *</Text>
            <TextInput
              value={createForm.ownerName}
              onChangeText={(v) => setCreateForm((f) => ({ ...f, ownerName: v }))}
              placeholder="Your full name"
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-white px-4 py-3 rounded-xl mb-6"
            />

            <TouchableOpacity
              onPress={handleCreateGym}
              disabled={saving}
              className="bg-primary py-4 rounded-xl items-center"
            >
              {saving ? (
                <ActivityIndicator color="#102216" />
              ) : (
                <Text className="text-background-dark font-bold text-base">Create Gym</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Join Modal */}
      <Modal visible={showJoinModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-surface-dark rounded-t-3xl px-6 pt-6 pb-12">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-white text-xl font-bold">Join a Gym</Text>
              <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                <X size={24} color="#94a3b8" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-400 text-sm mb-1">Invite Code *</Text>
            <TextInput
              value={joinCode}
              onChangeText={(v) => setJoinCode(v.toUpperCase())}
              placeholder="ENTER CODE"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              className="bg-slate-800 text-white px-4 py-4 rounded-xl mb-6 text-center text-2xl font-bold tracking-widest"
            />

            <TouchableOpacity
              onPress={handleJoin}
              disabled={saving}
              className="bg-primary py-4 rounded-xl items-center"
            >
              {saving ? (
                <ActivityIndicator color="#102216" />
              ) : (
                <Text className="text-background-dark font-bold text-base">Join Gym</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
