import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, Platform, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Plus, Trophy, X, ChevronDown, ChevronUp, Calendar, Trash2, FlagOff, Clock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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

  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [showPicker, setShowPicker] = useState(null); // 'start' | 'end' | null
  const [criteriaForm, setCriteriaForm] = useState({
    name: '', type: 'daily', points: '3', maxCount: '',
  });

  // Schedule state for create modal
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [schedule, setSchedule] = useState({
    openDay: 'sunday', openTime: '17:00',
    closeDay: 'monday', closeTime: '17:00',
  });

  // Inline schedule editor on existing challenges
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [editSchedule, setEditSchedule] = useState({
    enabled: false, openDay: 'sunday', openTime: '17:00',
    closeDay: 'monday', closeTime: '17:00',
  });

  const fmtDate = (d) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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
    if (!createForm.name) {
      Alert.alert('Required', 'Challenge name is required.');
      return;
    }
    if (endDate <= startDate) {
      Alert.alert('Invalid Dates', 'End date must be after start date.');
      return;
    }
    setSaving(true);
    try {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      await challengeAPI.create({
        gymId: selectedGym.id,
        name: createForm.name,
        description: createForm.description || undefined,
        startDate: startDate.toISOString(),
        endDate: end.toISOString(),
        ...(autoSchedule && { checkinSchedule: schedule }),
      });
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '' });
      setAutoSchedule(false);
      setSchedule({ openDay: 'sunday', openTime: '17:00', closeDay: 'monday', closeTime: '17:00' });
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setStartDate(new Date());
      setEndDate(d);
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

  const handleDeleteCriteria = (challengeId, criteriaId) => {
    Alert.alert('Delete Criteria', 'Remove this criteria from the challenge?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await challengeAPI.deleteCriteria(challengeId, criteriaId);
            setChallenges(prev => prev.map(c =>
              c.id === challengeId
                ? { ...c, criteria: c.criteria.filter(cr => cr.id !== criteriaId) }
                : c
            ));
          } catch (e) {
            Alert.alert('Error', 'Failed to delete criteria');
          }
        },
      },
    ]);
  };

  const handleEndChallenge = (challenge) => {
    Alert.alert(
      'End Challenge',
      `Are you sure you want to end "${challenge.name}"? This will close the check-in window and mark the challenge as complete. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Challenge',
          style: 'destructive',
          onPress: async () => {
            try {
              await challengeAPI.end(challenge.id);
              setChallenges(prev =>
                prev.map(c => c.id === challenge.id
                  ? { ...c, isActive: false, checkinWindowOpen: false }
                  : c
                )
              );
            } catch (e) {
              Alert.alert('Error', e.response?.data?.error || 'Failed to end challenge');
            }
          },
        },
      ]
    );
  };

  const handleSaveSchedule = async (challengeId) => {
    try {
      const payload = editSchedule.enabled
        ? { checkinSchedule: { openDay: editSchedule.openDay, openTime: editSchedule.openTime, closeDay: editSchedule.closeDay, closeTime: editSchedule.closeTime } }
        : { checkinSchedule: null };
      await challengeAPI.update(challengeId, payload);
      setChallenges(prev => prev.map(c => {
        if (c.id !== challengeId) return c;
        return editSchedule.enabled
          ? { ...c, checkinAutoOpen: true, checkinOpenDay: editSchedule.openDay.toUpperCase(), checkinOpenTime: editSchedule.openTime, checkinCloseDay: editSchedule.closeDay.toUpperCase(), checkinCloseTime: editSchedule.closeTime }
          : { ...c, checkinAutoOpen: false, checkinOpenDay: null, checkinOpenTime: null, checkinCloseDay: null, checkinCloseTime: null };
      }));
      setEditingScheduleId(null);
    } catch (e) {
      Alert.alert('Error', 'Failed to save schedule');
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
                onDeleteCriteria={handleDeleteCriteria}
                onEndChallenge={() => handleEndChallenge(challenge)}
                isEditingSchedule={editingScheduleId === challenge.id}
                editSchedule={editSchedule}
                onEditScheduleChange={setEditSchedule}
                onOpenScheduleEdit={() => {
                  setEditingScheduleId(challenge.id);
                  setEditSchedule({
                    enabled: !!challenge.checkinAutoOpen,
                    openDay: challenge.checkinOpenDay?.toLowerCase() ?? 'sunday',
                    openTime: challenge.checkinOpenTime ?? '17:00',
                    closeDay: challenge.checkinCloseDay?.toLowerCase() ?? 'monday',
                    closeTime: challenge.checkinCloseTime ?? '17:00',
                  });
                }}
                onCancelScheduleEdit={() => setEditingScheduleId(null)}
                onSaveSchedule={() => handleSaveSchedule(challenge.id)}
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
              <TouchableOpacity onPress={() => { setShowCreateModal(false); setShowPicker(null); }}>
                <X size={24} color="#94a3b8" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-400 text-sm mb-1">Challenge Name *</Text>
            <TextInput
              value={createForm.name}
              onChangeText={(v) => setCreateForm((f) => ({ ...f, name: v }))}
              placeholder="e.g. BoxPulse Spring Challenge"
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

            <View className="flex-row gap-4 mb-2">
              <View className="flex-1">
                <Text className="text-slate-400 text-sm mb-1">Start Date *</Text>
                <TouchableOpacity
                  onPress={() => setShowPicker(showPicker === 'start' ? null : 'start')}
                  className={`bg-slate-800 border px-4 py-3 rounded-xl flex-row items-center justify-between ${showPicker === 'start' ? 'border-primary/60' : 'border-slate-700'}`}
                >
                  <Text className="text-white">{fmtDate(startDate)}</Text>
                  <Calendar size={16} color="#64748b" strokeWidth={2} />
                </TouchableOpacity>
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-sm mb-1">End Date *</Text>
                <TouchableOpacity
                  onPress={() => setShowPicker(showPicker === 'end' ? null : 'end')}
                  className={`bg-slate-800 border px-4 py-3 rounded-xl flex-row items-center justify-between ${showPicker === 'end' ? 'border-primary/60' : 'border-slate-700'}`}
                >
                  <Text className="text-white">{fmtDate(endDate)}</Text>
                  <Calendar size={16} color="#64748b" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Inline date picker — no nested modal */}
            {showPicker !== null && (
              <View className="mb-2 bg-slate-800 rounded-xl overflow-hidden">
                <DateTimePicker
                  value={showPicker === 'start' ? startDate : endDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant="dark"
                  style={Platform.OS === 'ios' ? { height: 180 } : undefined}
                  onChange={(_, date) => {
                    if (Platform.OS === 'android') setShowPicker(null);
                    if (!date) return;
                    if (showPicker === 'start') setStartDate(date);
                    else setEndDate(date);
                  }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    onPress={() => setShowPicker(null)}
                    className="items-center py-3 border-t border-slate-700"
                  >
                    <Text className="text-primary font-bold">Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Auto-schedule toggle */}
            <View className="flex-row items-center justify-between bg-slate-800 rounded-xl px-4 py-3 mt-2 mb-2 border border-slate-700">
              <View className="flex-row items-center gap-2">
                <Clock size={18} color="#0df259" strokeWidth={2} />
                <Text className="text-white font-semibold">Auto-schedule window</Text>
              </View>
              <Switch
                value={autoSchedule}
                onValueChange={setAutoSchedule}
                trackColor={{ false: '#334155', true: '#0df259' }}
                thumbColor={autoSchedule ? '#102216' : '#94a3b8'}
              />
            </View>

            {autoSchedule && (
              <ScheduleForm schedule={schedule} onChange={setSchedule} />
            )}

            <TouchableOpacity
              onPress={handleCreateChallenge}
              disabled={saving}
              className="bg-primary py-4 rounded-xl items-center mt-4"
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

function ChallengeCard({
  challenge, isExpanded, onToggleExpand, onToggleWindow, onAddCriteria,
  onDeleteCriteria, onEndChallenge,
  isEditingSchedule, editSchedule, onEditScheduleChange,
  onOpenScheduleEdit, onCancelScheduleEdit, onSaveSchedule,
}) {
  const fmt = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const isEnded = !challenge.isActive;

  return (
    <View className={`bg-surface-dark rounded-xl border overflow-hidden ${isEnded ? 'border-slate-700/50 opacity-70' : 'border-slate-700'}`}>
      <View className="p-4">
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 pr-3">
            <Text className={`font-bold text-base ${isEnded ? 'text-slate-400' : 'text-white'}`}>
              {challenge.name}
            </Text>
            <Text className="text-slate-500 text-xs mt-0.5">
              {fmt(challenge.startDate)} – {fmt(challenge.endDate)}
            </Text>
          </View>
          {isEnded ? (
            <View className="px-3 py-1 rounded-full bg-slate-700">
              <Text className="text-xs font-bold text-slate-400">Ended</Text>
            </View>
          ) : (
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
          )}
        </View>

        <View className="flex-row gap-2">
          {!isEnded && (
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
          )}

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

        {!isEnded && (
          <TouchableOpacity
            onPress={onEndChallenge}
            className="mt-2 py-2.5 rounded-lg items-center border border-red-500/30 bg-red-500/5 flex-row justify-center gap-2"
          >
            <FlagOff size={15} color="#ef4444" strokeWidth={2} />
            <Text className="text-red-400 text-sm font-semibold">End Challenge</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Schedule section — always visible on active challenges */}
      {!isEnded && (
        <View className="border-t border-slate-700 px-4 pt-3 pb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <Clock size={15} color="#0df259" strokeWidth={2} />
              <Text className="text-white font-semibold text-sm">Auto-schedule window</Text>
            </View>
            {!isEditingSchedule && (
              <TouchableOpacity onPress={onOpenScheduleEdit}>
                <Text className="text-primary text-xs font-semibold">Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {!isEditingSchedule ? (
            challenge.checkinAutoOpen ? (
              <View className="bg-slate-900 rounded-lg px-3 py-2 gap-1">
                <Text className="text-slate-400 text-xs">
                  Opens: <Text className="text-white capitalize">{challenge.checkinOpenDay?.toLowerCase()}</Text> at <Text className="text-white">{challenge.checkinOpenTime}</Text>
                </Text>
                <Text className="text-slate-400 text-xs">
                  Closes: <Text className="text-white capitalize">{challenge.checkinCloseDay?.toLowerCase()}</Text> at <Text className="text-white">{challenge.checkinCloseTime}</Text>
                </Text>
              </View>
            ) : (
              <Text className="text-slate-600 text-xs">Manual control only — tap Edit to set a schedule</Text>
            )
          ) : (
            <View>
              <View className="flex-row items-center justify-between bg-slate-800 rounded-lg px-3 py-2.5 mb-3 border border-slate-700">
                <Text className="text-white text-sm font-semibold">Auto-schedule enabled</Text>
                <Switch
                  value={editSchedule.enabled}
                  onValueChange={v => onEditScheduleChange(s => ({ ...s, enabled: v }))}
                  trackColor={{ false: '#334155', true: '#0df259' }}
                  thumbColor={editSchedule.enabled ? '#102216' : '#94a3b8'}
                />
              </View>
              {editSchedule.enabled && (
                <ScheduleForm schedule={editSchedule} onChange={onEditScheduleChange} />
              )}
              <View className="flex-row gap-2 mt-3">
                <TouchableOpacity
                  onPress={onCancelScheduleEdit}
                  className="flex-1 py-2.5 rounded-lg border border-slate-600 items-center"
                >
                  <Text className="text-slate-400 font-semibold text-sm">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onSaveSchedule}
                  className="flex-1 py-2.5 rounded-lg bg-primary items-center"
                >
                  <Text className="text-background-dark font-bold text-sm">Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

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
                  <View className="flex-row items-center gap-3 ml-2">
                    <Text
                      className={`text-sm font-bold ${c.points >= 0 ? 'text-primary' : 'text-red-400'}`}
                    >
                      {c.points >= 0 ? '+' : ''}{c.points} pts
                    </Text>
                    <TouchableOpacity onPress={() => onDeleteCriteria(challenge.id, c.id)} className="p-1">
                      <Trash2 size={14} color="#ef4444" strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
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

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_FULL = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function DayPicker({ value, onChange }) {
  return (
    <View className="flex-row gap-1 flex-wrap">
      {DAYS.map((d, i) => {
        const full = DAY_FULL[i];
        const selected = value === full;
        return (
          <TouchableOpacity
            key={full}
            onPress={() => onChange(full)}
            className={`px-2.5 py-1.5 rounded-md border ${selected ? 'bg-primary border-primary' : 'border-slate-600 bg-slate-800'}`}
          >
            <Text className={`text-xs font-semibold uppercase ${selected ? 'text-background-dark' : 'text-slate-400'}`}>
              {d}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ScheduleForm({ schedule, onChange }) {
  return (
    <View className="gap-4">
      <View>
        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Opens</Text>
        <DayPicker value={schedule.openDay} onChange={d => onChange(s => ({ ...s, openDay: d }))} />
        <View className="flex-row items-center gap-2 mt-2">
          <Text className="text-slate-400 text-sm">at</Text>
          <TextInput
            value={schedule.openTime}
            onChangeText={t => onChange(s => ({ ...s, openTime: t }))}
            placeholder="17:00"
            placeholderTextColor="#475569"
            className="flex-1 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm border border-slate-700"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
          <Text className="text-slate-500 text-xs">24h</Text>
        </View>
      </View>

      <View>
        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Closes</Text>
        <DayPicker value={schedule.closeDay} onChange={d => onChange(s => ({ ...s, closeDay: d }))} />
        <View className="flex-row items-center gap-2 mt-2">
          <Text className="text-slate-400 text-sm">at</Text>
          <TextInput
            value={schedule.closeTime}
            onChangeText={t => onChange(s => ({ ...s, closeTime: t }))}
            placeholder="17:00"
            placeholderTextColor="#475569"
            className="flex-1 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm border border-slate-700"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
          <Text className="text-slate-500 text-xs">24h</Text>
        </View>
      </View>
    </View>
  );
}
