import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, TextInput } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, ArrowRight, User, Save } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/authStore';
import { gymAPI, checkinAPI, goalAPI } from '../../lib/api';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Build initial formData from criteria array
function buildInitialData(criteria) {
  const data = {};
  for (const c of criteria) {
    if (c.type === 'daily') data[c.id] = [false, false, false, false, false, false, false];
    else if (c.type === 'weekly') data[c.id] = false;
    else if (c.type === 'counter') data[c.id] = 0;
  }
  return data;
}

function calculatePoints(criteria, formData) {
  let pts = 0;
  for (const c of criteria) {
    const val = formData[c.id];
    if (val === undefined || val === null) continue;
    if (c.type === 'daily' && Array.isArray(val)) {
      pts += val.filter(Boolean).length * c.points;
    } else if (c.type === 'weekly' && val === true) {
      pts += c.points;
    } else if (c.type === 'counter' && typeof val === 'number') {
      const capped = c.maxCount != null ? Math.min(val, c.maxCount) : val;
      pts += Math.max(0, capped) * c.points;
    }
  }
  return Math.max(0, pts);
}

export default function CheckinScreen() {
  const { user, selectedGym } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [formData, setFormData] = useState({});
  const [goals, setGoals] = useState([]);
  const [goalUpdates, setGoalUpdates] = useState({});
  const [draftSaved, setDraftSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const dailyCriteria = useMemo(() => criteria.filter(c => c.type === 'daily'), [criteria]);
  const milestoneCriteria = useMemo(() => criteria.filter(c => c.type === 'weekly' || c.type === 'counter'), [criteria]);

  // Steps: daily (if any), milestones (if any), goals (if any)
  const steps = useMemo(() => {
    const s = [];
    if (dailyCriteria.length > 0) s.push('daily');
    if (milestoneCriteria.length > 0) s.push('milestones');
    if (goals.length > 0) s.push('goals');
    return s;
  }, [dailyCriteria, milestoneCriteria, goals]);

  const totalSteps = steps.length || 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const currentPoints = useMemo(() => calculatePoints(criteria, formData), [criteria, formData]);
  const draftKey = `checkin_draft_${activeChallenge?.id}`;

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    if (!selectedGym?.id) return;
    try {
      const [challengeRes, goalRes] = await Promise.all([
        gymAPI.getChallenges(selectedGym.id),
        goalAPI.list(),
      ]);
      const active = challengeRes.data.find(c => c.isActive);
      setActiveChallenge(active ?? null);
      setGoals(goalRes.data);

      if (active?.criteria?.length) {
        setCriteria(active.criteria);
        const initial = buildInitialData(active.criteria);
        // Try to restore draft
        const draftKey = `checkin_draft_${active.id}`;
        const saved = await AsyncStorage.getItem(draftKey);
        setFormData(saved ? { ...initial, ...JSON.parse(saved) } : initial);
      }
    } catch (e) {
      console.error('Failed to load check-in data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-save draft when formData changes
  useEffect(() => {
    if (!activeChallenge?.id || Object.keys(formData).length === 0) return;
    AsyncStorage.setItem(draftKey, JSON.stringify(formData))
      .then(() => { setDraftSaved(true); setTimeout(() => setDraftSaved(false), 2000); })
      .catch(() => {});
  }, [formData]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(s => s + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!activeChallenge) {
      Alert.alert('No Active Challenge', 'There is no active challenge right now.');
      return;
    }
    setSubmitting(true);
    try {
      const goalEntries = Object.entries(goalUpdates).filter(([, v]) => v.currentValue !== '' || v.progressNote !== '');
      if (goalEntries.length > 0) {
        await Promise.allSettled(
          goalEntries.map(([goalId, update]) => {
            const payload = {};
            if (update.currentValue !== '') payload.currentValue = parseFloat(update.currentValue);
            if (update.progressNote !== '') payload.progressNote = update.progressNote;
            return goalAPI.update(goalId, payload);
          })
        );
      }

      await checkinAPI.submit({
        challengeId: activeChallenge.id,
        criteriaData: formData,
        weeklyScore: currentPoints,
      });
      await AsyncStorage.removeItem(draftKey);
      router.replace(`/checkin/success?points=${currentPoints}`);
    } catch (e) {
      Alert.alert('Submission Error', e.response?.data?.error || 'Failed to submit check-in');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background-dark items-center justify-center">
        <ActivityIndicator size="large" color="#0df259" />
      </View>
    );
  }

  if (!activeChallenge) {
    return (
      <View className="flex-1 bg-background-dark">
        <View className="bg-surface-dark px-6 pt-16 pb-4 border-b border-slate-700">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 mb-2">
            <ArrowLeft size={24} color="#ffffff" strokeWidth={2} />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Weekly Check-In</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">🏋️</Text>
          <Text className="text-white text-xl font-bold text-center mb-2">No Active Challenge</Text>
          <Text className="text-slate-400 text-center">Your gym hasn't started a challenge yet. Check back soon!</Text>
        </View>
      </View>
    );
  }

  if (criteria.length === 0) {
    return (
      <View className="flex-1 bg-background-dark">
        <View className="bg-surface-dark px-6 pt-16 pb-4 border-b border-slate-700">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 mb-2">
            <ArrowLeft size={24} color="#ffffff" strokeWidth={2} />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Weekly Check-In</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">📋</Text>
          <Text className="text-white text-xl font-bold text-center mb-2">No Criteria Set Up</Text>
          <Text className="text-slate-400 text-center">Your admin hasn't added check-in criteria yet. Ask them to set it up in the admin panel.</Text>
        </View>
      </View>
    );
  }

  const currentStepKey = steps[currentStep];

  return (
    <View className="flex-1 bg-background-dark">
      {/* Header */}
      <View className="bg-surface-dark px-6 pt-16 pb-4 border-b border-slate-700">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#ffffff" strokeWidth={2} />
          </TouchableOpacity>
          <View className="flex-row items-center gap-3">
            {draftSaved && (
              <View className="flex-row items-center gap-2 bg-primary/10 px-3 py-1 rounded-full">
                <Save size={14} color="#0df259" strokeWidth={2} />
                <Text className="text-primary text-xs font-bold">Saved</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => router.push('/(app)/profile')} className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden">
              {user?.photoUrl ? (
                <Image source={{ uri: user.photoUrl }} className="w-full h-full" />
              ) : (
                <View className="w-full h-full items-center justify-center bg-primary/20">
                  <User size={20} color="#0df259" strokeWidth={2} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-white text-2xl font-bold">Weekly Check-In</Text>
          <Text className="text-slate-400 text-sm mt-1">
            {activeChallenge.name} · Step {currentStep + 1} of {totalSteps}
          </Text>
        </View>

        <View className="bg-slate-800 h-2 rounded-full overflow-hidden">
          <View className="bg-primary h-full rounded-full" style={{ width: `${progress}%` }} />
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        {currentStepKey === 'daily' && (
          <DailyStep criteria={dailyCriteria} formData={formData} setFormData={setFormData} />
        )}
        {currentStepKey === 'milestones' && (
          <MilestonesStep criteria={milestoneCriteria} formData={formData} setFormData={setFormData} />
        )}
        {currentStepKey === 'goals' && (
          <GoalsStep goals={goals} goalUpdates={goalUpdates} setGoalUpdates={setGoalUpdates} />
        )}
      </ScrollView>

      {/* Footer */}
      <View className="bg-surface-dark border-t border-slate-700 px-6 py-4 pb-8">
        <View className="flex-row gap-3">
          {currentStep > 0 && (
            <TouchableOpacity
              onPress={() => setCurrentStep(s => s - 1)}
              className="flex-1 bg-slate-700 py-4 rounded-xl"
            >
              <Text className="text-white text-center font-bold">Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleNext}
            disabled={submitting}
            className={`flex-1 bg-primary py-4 rounded-xl ${submitting ? 'opacity-60' : ''}`}
          >
            <View className="flex-row items-center justify-center gap-3">
              {submitting ? (
                <ActivityIndicator color="#102216" />
              ) : (
                <>
                  <Text className="text-background-dark font-bold text-base">
                    {currentStep === totalSteps - 1 ? 'Submit' : 'Continue'}
                  </Text>
                  {currentStep < totalSteps - 1 && <ArrowRight size={20} color="#102216" strokeWidth={2} />}
                  <View className="bg-background-dark/20 px-3 py-1 rounded-full">
                    <Text className="text-background-dark font-bold text-sm">{currentPoints} pts</Text>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ===== STEP: Daily criteria (7-day checkboxes) =====
function DailyStep({ criteria, formData, setFormData }) {
  const toggle = (criterionId, dayIdx) => {
    setFormData(prev => ({
      ...prev,
      [criterionId]: prev[criterionId].map((v, i) => i === dayIdx ? !v : v),
    }));
  };

  return (
    <View className="gap-5">
      <Text className="text-white text-xl font-bold">Daily Habits</Text>
      {criteria.map(c => (
        <View key={c.id} className="bg-surface-dark rounded-2xl p-5 border border-slate-700">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 pr-3">
              <Text className="text-white font-bold text-base">{c.name}</Text>
              {c.description ? <Text className="text-slate-400 text-sm mt-0.5">{c.description}</Text> : null}
            </View>
            <View className="bg-primary/10 px-3 py-1 rounded-full">
              <Text className="text-primary font-bold text-sm">+{c.points} pts/day</Text>
            </View>
          </View>
          <View className="flex-row justify-between">
            {DAYS.map((day, i) => {
              const checked = formData[c.id]?.[i] ?? false;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => toggle(c.id, i)}
                  className={`w-10 h-10 rounded-full items-center justify-center border-2 ${checked ? 'bg-primary border-primary' : 'border-slate-600'}`}
                >
                  <Text className={`font-bold text-sm ${checked ? 'text-background-dark' : 'text-slate-500'}`}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

// ===== STEP: Weekly (checkbox) + Counter criteria =====
function MilestonesStep({ criteria, formData, setFormData }) {
  const weekly = criteria.filter(c => c.type === 'weekly');
  const counters = criteria.filter(c => c.type === 'counter');

  const toggleWeekly = (id) => {
    setFormData(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const adjustCounter = (id, delta, maxCount) => {
    setFormData(prev => {
      const current = prev[id] ?? 0;
      const next = current + delta;
      const capped = maxCount != null ? Math.min(next, maxCount) : next;
      return { ...prev, [id]: Math.max(0, capped) };
    });
  };

  return (
    <View className="gap-5">
      <Text className="text-white text-xl font-bold">Weekly Goals</Text>

      {weekly.map(c => {
        const checked = formData[c.id] ?? false;
        return (
          <TouchableOpacity
            key={c.id}
            onPress={() => toggleWeekly(c.id)}
            className={`rounded-2xl p-6 border-2 ${checked ? 'bg-primary/10 border-primary' : 'bg-surface-dark border-slate-700'}`}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className={`font-bold text-base ${checked ? 'text-primary' : 'text-white'}`}>{c.name}</Text>
                {c.description ? <Text className="text-slate-400 text-sm mt-1">{c.description}</Text> : null}
              </View>
              <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${checked ? 'bg-primary border-primary' : 'border-slate-600'}`}>
                {checked && <View className="w-3 h-3 bg-background-dark rounded-full" />}
              </View>
            </View>
            <View className="mt-3 bg-primary/10 self-start px-3 py-1 rounded-full">
              <Text className="text-primary font-bold text-sm">+{c.points} pts</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {counters.map(c => {
        const val = formData[c.id] ?? 0;
        const maxCount = c.maxCount ?? 99;
        return (
          <View key={c.id} className="bg-surface-dark rounded-2xl p-5 border border-slate-700">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-white font-bold text-base flex-1 pr-3">{c.name}</Text>
              <View className="bg-primary/10 px-3 py-1 rounded-full">
                <Text className="text-primary font-bold text-sm">+{c.points} pts each</Text>
              </View>
            </View>
            {c.description ? <Text className="text-slate-400 text-sm mb-4">{c.description}</Text> : <View className="mb-4" />}
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => adjustCounter(c.id, -1, maxCount)}
                className="w-12 h-12 bg-slate-700 rounded-xl items-center justify-center"
              >
                <Text className="text-white font-bold text-2xl">-</Text>
              </TouchableOpacity>
              <View className="items-center">
                <Text className="text-primary text-4xl font-bold">{val}</Text>
                {c.maxCount != null && (
                  <Text className="text-slate-500 text-xs mt-1">max {c.maxCount}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => adjustCounter(c.id, 1, maxCount)}
                disabled={val >= maxCount}
                className={`w-12 h-12 rounded-xl items-center justify-center ${val >= maxCount ? 'bg-slate-700' : 'bg-primary'}`}
              >
                <Text className={`font-bold text-2xl ${val >= maxCount ? 'text-slate-500' : 'text-background-dark'}`}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ===== STEP: Personal goals =====
function GoalsStep({ goals, goalUpdates, setGoalUpdates }) {
  const update = (goalId, field, value) => {
    setGoalUpdates(prev => ({
      ...prev,
      [goalId]: { ...(prev[goalId] || { currentValue: '', progressNote: '' }), [field]: value },
    }));
  };

  return (
    <View className="gap-5">
      <View>
        <Text className="text-white text-xl font-bold">Your Goals</Text>
        <Text className="text-slate-400 text-sm mt-1">Optional — update any goals you have progress on</Text>
      </View>
      {goals.map(goal => {
        const upd = goalUpdates[goal.id] || { currentValue: '', progressNote: '' };
        const emoji = goal.type === 'weight' ? '⚖️' : goal.type === 'lift' ? '🏋️' : '🎯';
        const label = goal.type === 'weight'
          ? `${goal.direction === 'lose' ? 'Lose' : 'Gain'} ${goal.targetWeight} ${goal.unit}`
          : goal.type === 'lift'
          ? `${goal.liftName} — ${goal.targetWeight} ${goal.unit}`
          : goal.text;

        return (
          <View key={goal.id} className="bg-surface-dark rounded-2xl p-5 border border-slate-700">
            <View className="flex-row items-center gap-2 mb-3">
              <Text className="text-xl">{emoji}</Text>
              <Text className="text-slate-400 text-xs uppercase tracking-wide flex-1" numberOfLines={1}>{label}</Text>
            </View>

            {goal.type !== 'other' ? (
              <View>
                <Text className="text-white text-sm font-medium mb-2">
                  {goal.type === 'weight' ? 'Current weight' : 'Current best'}
                </Text>
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={upd.currentValue}
                    onChangeText={v => update(goal.id, 'currentValue', v)}
                    keyboardType="numeric"
                    placeholder={goal.currentValue != null ? String(goal.currentValue) : 'Enter value'}
                    placeholderTextColor="#475569"
                    className="flex-1 bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-600"
                  />
                  <Text className="text-slate-400 font-medium w-8">{goal.unit}</Text>
                </View>
                {goal.currentValue != null && (
                  <Text className="text-slate-500 text-xs mt-1">Last: {goal.currentValue} {goal.unit}</Text>
                )}
              </View>
            ) : (
              <View>
                <Text className="text-white text-sm font-medium mb-2">Progress note</Text>
                <TextInput
                  value={upd.progressNote}
                  onChangeText={v => update(goal.id, 'progressNote', v)}
                  placeholder={goal.progressNote || 'How is it going?'}
                  placeholderTextColor="#475569"
                  multiline
                  numberOfLines={2}
                  className="bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-600"
                  style={{ minHeight: 64, textAlignVertical: 'top' }}
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
