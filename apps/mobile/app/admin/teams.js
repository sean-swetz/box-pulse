import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Plus, Users, X, Check } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { teamAPI, gymAPI } from '../../lib/api';

const TEAM_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#0df259',
];

export default function TeamsAdmin() {
  const { selectedGym } = useAuthStore();
  const [teams, setTeams] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '', color: '#ef4444', challengeId: '',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [teamsRes, challengesRes] = await Promise.all([
        teamAPI.getByGym(selectedGym.id),
        gymAPI.getChallenges(selectedGym.id),
      ]);
      setTeams(teamsRes.data);
      setChallenges(challengesRes.data);
    } catch (e) {
      console.error('Fetch teams error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!createForm.name) {
      Alert.alert('Required', 'Team name is required');
      return;
    }
    setSaving(true);
    try {
      await teamAPI.create({
        gymId: selectedGym.id,
        name: createForm.name,
        color: createForm.color,
        challengeId: createForm.challengeId || undefined,
      });
      setShowCreateModal(false);
      setCreateForm({ name: '', color: '#ef4444', challengeId: '' });
      fetchData();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to create team');
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
      <View className="bg-surface-dark px-6 pt-16 pb-4 border-b border-slate-700">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
              <ArrowLeft size={24} color="#ffffff" strokeWidth={2} />
            </TouchableOpacity>
            <Users size={24} color="#0df259" strokeWidth={2} />
            <Text className="text-white text-2xl font-bold">Teams</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            className="w-10 h-10 bg-primary rounded-xl items-center justify-center"
          >
            <Plus size={20} color="#102216" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {teams.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Users size={48} color="#475569" strokeWidth={1.5} />
            <Text className="text-slate-400 text-base mt-4">No teams yet</Text>
            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              className="mt-4 bg-primary px-6 py-3 rounded-xl"
            >
              <Text className="text-background-dark font-bold">Create First Team</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-3">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create Team Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-surface-dark rounded-t-3xl px-6 pt-6 pb-12">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-white text-xl font-bold">New Team</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color="#94a3b8" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-400 text-sm mb-1">Team Name *</Text>
            <TextInput
              value={createForm.name}
              onChangeText={(v) => setCreateForm((f) => ({ ...f, name: v }))}
              placeholder="e.g. Red Team"
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-white px-4 py-3 rounded-xl mb-5"
            />

            <Text className="text-slate-400 text-sm mb-3">Team Color</Text>
            <View className="flex-row flex-wrap gap-3 mb-5">
              {TEAM_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setCreateForm((f) => ({ ...f, color }))}
                  className="w-11 h-11 rounded-full items-center justify-center"
                  style={{ backgroundColor: color }}
                >
                  {createForm.color === color && (
                    <Check size={18} color="#ffffff" strokeWidth={3} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {challenges.length > 0 && (
              <>
                <Text className="text-slate-400 text-sm mb-2">Link to Challenge (optional)</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-5"
                >
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => setCreateForm((f) => ({ ...f, challengeId: '' }))}
                      className={`px-4 py-2 rounded-lg ${!createForm.challengeId ? 'bg-primary' : 'bg-slate-800'}`}
                    >
                      <Text
                        className={`text-sm font-semibold ${!createForm.challengeId ? 'text-background-dark' : 'text-slate-400'}`}
                      >
                        None
                      </Text>
                    </TouchableOpacity>
                    {challenges.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => setCreateForm((f) => ({ ...f, challengeId: c.id }))}
                        className={`px-4 py-2 rounded-lg ${createForm.challengeId === c.id ? 'bg-primary' : 'bg-slate-800'}`}
                      >
                        <Text
                          className={`text-sm font-semibold ${createForm.challengeId === c.id ? 'text-background-dark' : 'text-slate-400'}`}
                        >
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            <TouchableOpacity
              onPress={handleCreateTeam}
              disabled={saving}
              className="bg-primary py-4 rounded-xl items-center"
            >
              {saving ? (
                <ActivityIndicator color="#102216" />
              ) : (
                <Text className="text-background-dark font-bold text-base">Create Team</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TeamCard({ team }) {
  const memberCount = team.members?.length ?? 0;

  return (
    <View className="bg-surface-dark rounded-xl border border-slate-700 overflow-hidden">
      {/* Color accent stripe */}
      <View
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: team.color }}
      />
      <View className="px-4 py-4 ml-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: team.color + '33' }}
            >
              <Text className="font-bold text-base" style={{ color: team.color }}>
                {team.name.substring(0, 1)}
              </Text>
            </View>
            <View>
              <Text className="text-white font-bold">{team.name}</Text>
              <Text className="text-slate-400 text-sm">
                {memberCount} member{memberCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          {team.challenge && (
            <View className="bg-slate-700 px-2 py-1 rounded-lg">
              <Text className="text-slate-300 text-xs" numberOfLines={1}>
                {team.challenge.name}
              </Text>
            </View>
          )}
        </View>

        {memberCount > 0 && (
          <View className="mt-3 flex-row flex-wrap gap-1.5">
            {team.members.slice(0, 6).map((m) => (
              <View key={m.id} className="bg-slate-800 px-2 py-0.5 rounded">
                <Text className="text-slate-300 text-xs">{m.user.name}</Text>
              </View>
            ))}
            {memberCount > 6 && (
              <View className="bg-slate-800 px-2 py-0.5 rounded">
                <Text className="text-slate-500 text-xs">+{memberCount - 6} more</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
