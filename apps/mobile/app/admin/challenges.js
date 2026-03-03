import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Plus, Trophy, X, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { gymAPI, challengeAPI } from '../../lib/api';

const CRITERIA_TYPES = ['daily', 'weekly', 'counter'];

export default function ChallengesAdmin() {
  const { selectedGym } = useAuthStore();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [activeChallengeId, setActiveChallengeId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '', description: '', startDate: '', endDate: '',
  });
  const [criteriaForm, setCriteriaForm] = useState({
    name: '', type: 'daily', points: '3', maxCount: '',
  });

  useEffect(() => { fetchChallenges(); }, []);

  const fetchChallenges = async () => {
    try {
      const res = await gymAPI.getChallenges(selectedGym.id);
      setChallenges(res.data);
    } catch (e) {
      console.error('Fetch challenges error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChallenge = async () => {
    if (!createForm.name || !createForm.startDate || !createForm.endDate) {
      Alert.alert('Required', 'Name, start date, and end date are required.');
      return;
    }
    setSaving(true);
    try {
      await challengeAPI.create({
        gymId: selectedGym.id,
        name: createForm.name,
        description: createForm.description || undefined,
        startDate: new Date(createForm.startDate).toISOString(),
        endDate: new Date(createForm.endDate + 'T23:59:59').toISOString(),
      });
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '', startDate: '', endDate: '' });
      fetchChallenges();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to create challenge');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleWindow = async (challenge) => {
    const newState = !challenge.checkinWindowOpen;
    try {
      await challengeAPI.toggleWindow(challenge.id, newState);
      setChallenges((prev) =>
        prev.map((c) =>
          c.id === challenge.id ? { ...c, checkinWindowOpen: newState } : c
        )
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to toggle check-in window');
    }
  };

  const handleAddCriteria = async () => {
    if (!criteriaForm.name || !criteriaForm.points) {
      Alert.alert('Required', 'Name and points are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await challengeAPI.addCriteria(activeChallengeId, {
        name: criteriaForm.name,
        type: criteriaForm.type,
        points: parseInt(criteriaForm.points),
        maxCount:
          criteriaForm.type === 'counter' && criteriaForm.maxCount
            ? parseInt(criteriaForm.maxCount)
            : undefined,
      });
      setChallenges((prev) =>
        prev.map((c) =>
          c.id === activeChallengeId
            ? { ...c, criteria: [...(c.criteria || []), res.data] }
            : c
        )
      );
      setShowCriteriaModal(false);
      setCriteriaForm({ name: '', type: 'daily', points: '3', maxCount: '' });
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to add criteria');
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
            <Trophy size={24} color="#0df259" strokeWidth={2} />
            <Text className="text-white text-2xl font-bold">Challenges</Text>
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
        {challenges.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Trophy size={48} color="#475569" strokeWidth={1.5} />
            <Text className="text-slate-400 text-base mt-4">No challenges yet</Text>
            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              className="mt-4 bg-primary px-6 py-3 rounded-xl"
            >
              <Text className="text-background-dark font-bold">Create First Challenge</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-4">
            {challenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                isExpanded={expandedId === challenge.id}
                onToggleExpand={() =>
                  setExpandedId(expandedId === challenge.id ? null : challenge.id)
                }
                onToggleWindow={() => handleToggleWindow(challenge)}
                onAddCriteria={() => {
                  setActiveChallengeId(challenge.id);
                  setShowCriteriaModal(true);
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create Challenge Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-surface-dark rounded-t-3xl px-6 pt-6 pb-12">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-white text-xl font-bold">New Challenge</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color="#94a3b8" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-400 text-sm mb-1">Challenge Name *</Text>
            <TextInput
              value={createForm.name}
              onChangeText={(v) => setCreateForm((f) => ({ ...f, name: v }))}
              placeholder="e.g. Reset 2026"
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-white px-4 py-3 rounded-xl mb-4"
            />

            <Text className="text-slate-400 text-sm mb-1">Description</Text>
            <TextInput
              value={createForm.description}
              onChangeText={(v) => setCreateForm((f) => ({ ...f, description: v }))}
              placeholder="Optional..."
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-white px-4 py-3 rounded-xl mb-4"
              multiline
            />

            <View className="flex-row gap-4 mb-6">
              <View className="flex-1">
                <Text className="text-slate-400 text-sm mb-1">Start Date *</Text>
                <TextInput
                  value={createForm.startDate}
                  onChangeText={(v) => setCreateForm((f) => ({ ...f, startDate: v }))}
                  placeholder="2026-01-01"
                  placeholderTextColor="#64748b"
                  className="bg-slate-800 text-white px-4 py-3 rounded-xl"
                />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-sm mb-1">End Date *</Text>
                <TextInput
                  value={createForm.endDate}
                  onChangeText={(v) => setCreateForm((f) => ({ ...f, endDate: v }))}
                  placeholder="2026-03-31"
                  placeholderTextColor="#64748b"
                  className="bg-slate-800 text-white px-4 py-3 rounded-xl"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleCreateChallenge}
              disabled={saving}
              className="bg-primary py-4 rounded-xl items-center"
            >
              {saving ? (
                <ActivityIndicator color="#102216" />
              ) : (
                <Text className="text-background-dark font-bold text-base">Create Challenge</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Criteria Modal */}
      <Modal visible={showCriteriaModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-surface-dark rounded-t-3xl px-6 pt-6 pb-12">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-white text-xl font-bold">Add Criteria</Text>
              <TouchableOpacity onPress={() => setShowCriteriaModal(false)}>
                <X size={24} color="#94a3b8" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-400 text-sm mb-1">Criteria Name *</Text>
            <TextInput
              value={criteriaForm.name}
              onChangeText={(v) => setCriteriaForm((f) => ({ ...f, name: v }))}
              placeholder="e.g. Daily Check-in"
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-white px-4 py-3 rounded-xl mb-4"
            />

            <Text className="text-slate-400 text-sm mb-2">Type</Text>
            <View className="flex-row gap-2 mb-4">
              {CRITERIA_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setCriteriaForm((f) => ({ ...f, type }))}
                  className={`flex-1 py-2 rounded-lg items-center ${criteriaForm.type === type ? 'bg-primary' : 'bg-slate-800'}`}
                >
                  <Text
                    className={`font-semibold capitalize text-sm ${criteriaForm.type === type ? 'text-background-dark' : 'text-slate-400'}`}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row gap-4 mb-6">
              <View className="flex-1">
                <Text className="text-slate-400 text-sm mb-1">Points *</Text>
                <TextInput
                  value={criteriaForm.points}
                  onChangeText={(v) => setCriteriaForm((f) => ({ ...f, points: v }))}
                  placeholder="3"
                  placeholderTextColor="#64748b"
                  keyboardType="numbers-and-punctuation"
                  className="bg-slate-800 text-white px-4 py-3 rounded-xl"
                />
              </View>
              {criteriaForm.type === 'counter' && (
                <View className="flex-1">
                  <Text className="text-slate-400 text-sm mb-1">Max Count</Text>
                  <TextInput
                    value={criteriaForm.maxCount}
                    onChangeText={(v) => setCriteriaForm((f) => ({ ...f, maxCount: v }))}
                    placeholder="10"
                    placeholderTextColor="#64748b"
                    keyboardType="number-pad"
                    className="bg-slate-800 text-white px-4 py-3 rounded-xl"
                  />
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={handleAddCriteria}
              disabled={saving}
              className="bg-primary py-4 rounded-xl items-center"
            >
              {saving ? (
                <ActivityIndicator color="#102216" />
              ) : (
                <Text className="text-background-dark font-bold text-base">Add Criteria</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ChallengeCard({ challenge, isExpanded, onToggleExpand, onToggleWindow, onAddCriteria }) {
  const fmt = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View className="bg-surface-dark rounded-xl border border-slate-700 overflow-hidden">
      <View className="p-4">
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 pr-3">
            <Text className="text-white font-bold text-base">{challenge.name}</Text>
            <Text className="text-slate-400 text-xs mt-0.5">
              {fmt(challenge.startDate)} – {fmt(challenge.endDate)}
            </Text>
          </View>
          <View
            className={`px-3 py-1 rounded-full ${
              challenge.checkinWindowOpen ? 'bg-primary/20' : 'bg-slate-700'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                challenge.checkinWindowOpen ? 'text-primary' : 'text-slate-400'
              }`}
            >
              {challenge.checkinWindowOpen ? 'Open' : 'Closed'}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={onToggleWindow}
            className={`flex-1 py-2.5 rounded-lg items-center border ${
              challenge.checkinWindowOpen
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-primary/10 border-primary/30'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                challenge.checkinWindowOpen ? 'text-red-400' : 'text-primary'
              }`}
            >
              {challenge.checkinWindowOpen ? 'Close Window' : 'Open Window'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onToggleExpand}
            className="flex-1 py-2.5 rounded-lg items-center bg-slate-800 border border-slate-700 flex-row justify-center gap-1"
          >
            <Text className="text-slate-300 text-sm font-semibold">
              Criteria ({challenge.criteria?.length ?? 0})
            </Text>
            {isExpanded ? (
              <ChevronUp size={15} color="#94a3b8" strokeWidth={2} />
            ) : (
              <ChevronDown size={15} color="#94a3b8" strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {isExpanded && (
        <View className="border-t border-slate-700 p-4">
          {(!challenge.criteria || challenge.criteria.length === 0) ? (
            <Text className="text-slate-600 text-sm text-center py-1 mb-3">No criteria yet</Text>
          ) : (
            <View className="gap-2 mb-3">
              {challenge.criteria.map((c) => (
                <View
                  key={c.id}
                  className="flex-row items-center justify-between bg-slate-800 px-3 py-2 rounded-lg"
                >
                  <View className="flex-row items-center gap-2 flex-1">
                    <View className="bg-slate-700 px-2 py-0.5 rounded">
                      <Text className="text-slate-400 text-xs capitalize">{c.type}</Text>
                    </View>
                    <Text className="text-white text-sm flex-1" numberOfLines={1}>{c.name}</Text>
                  </View>
                  <Text
                    className={`text-sm font-bold ml-2 ${c.points >= 0 ? 'text-primary' : 'text-red-400'}`}
                  >
                    {c.points >= 0 ? '+' : ''}{c.points} pts
                  </Text>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity
            onPress={onAddCriteria}
            className="flex-row items-center justify-center gap-2 py-2.5 border border-dashed border-slate-600 rounded-lg"
          >
            <Plus size={15} color="#94a3b8" strokeWidth={2} />
            <Text className="text-slate-400 text-sm">Add Criteria</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
