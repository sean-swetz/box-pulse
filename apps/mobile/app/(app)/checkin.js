import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, TextInput } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, ArrowRight, User, Save, Target } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/authStore';
import { gymAPI, checkinAPI, goalAPI } from '../../lib/api';

const DRAFT_KEY = 'checkin_draft';

export default function CheckinScreen() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    dailyGoals: {
      water: [false, false, false, false, false, false, false],
      protein: [false, false, false, false, false, false, false],
      veggies: [false, false, false, false, false, false, false],
    },
    weekly: {
      attendClasses: false,
      noRestrictedFoods: false,
    },
    recovery: {
      workoutCount: 0,
      sleepQuality: 3,
    }
  });
  const [draftSaved, setDraftSaved] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Goals state
  const [goals, setGoals] = useState([]);
  const [goalUpdates, setGoalUpdates] = useState({}); // { [goalId]: { currentValue: '', progressNote: '' } }

  const { user, selectedGym } = useAuthStore();
  const totalSteps = goals.length > 0 ? 4 : 3;
  const progress = (currentStep / totalSteps) * 100;
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Calculate points
  const calculatePoints = () => {
    let points = 0;
    Object.values(formData.dailyGoals).forEach(week => {
      points += week.filter(Boolean).length * 5;
    });
    if (formData.weekly.attendClasses) points += 15;
    if (formData.weekly.noRestrictedFoods) points += 15;
    return points;
  };

  const currentPoints = calculatePoints();

  useEffect(() => {
    loadActiveChallenge();
    loadDraft();
    loadGoals();
  }, []);

  const loadActiveChallenge = async () => {
    if (!selectedGym?.id) return;
    try {
      const res = await gymAPI.getChallenges(selectedGym.id);
      const active = res.data.find(c => c.isActive);
      setActiveChallenge(active ?? null);
    } catch (e) {
      console.error('Failed to load challenge:', e);
    }
  };

  const loadGoals = async () => {
    try {
      const res = await goalAPI.list();
      setGoals(res.data);
    } catch (e) {
      console.error('Failed to load goals:', e);
    }
  };

  useEffect(() => {
    saveDraft();
  }, [formData]);

  const loadDraft = async () => {
    try {
      const draft = await AsyncStorage.getItem(DRAFT_KEY);
      if (draft) {
        setFormData(JSON.parse(draft));
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  };

  const saveDraft = async () => {
    try {
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  };

  const toggleDay = (goal, dayIndex) => {
    setFormData(prev => ({
      ...prev,
      dailyGoals: {
        ...prev.dailyGoals,
        [goal]: prev.dailyGoals[goal].map((val, i) => i === dayIndex ? !val : val)
      }
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!activeChallenge) {
      Alert.alert('No Active Challenge', 'There is no active challenge to submit to right now.');
      return;
    }
    setSubmitting(true);
    try {
      // Fire-and-forget goal progress updates
      const goalUpdateEntries = Object.entries(goalUpdates).filter(([, v]) => v.currentValue !== '' || v.progressNote !== '');
      if (goalUpdateEntries.length > 0) {
        await Promise.allSettled(
          goalUpdateEntries.map(([goalId, update]) => {
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
      await clearDraft();
      router.replace(`/checkin/success?points=${currentPoints}`);
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed to submit check-in';
      Alert.alert('Submission Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

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
          <Text className="text-slate-400 text-sm mt-1">Step {currentStep} of {totalSteps}</Text>
        </View>

        <View className="bg-slate-800 h-2 rounded-full overflow-hidden">
          <View className="bg-primary h-full rounded-full" style={{ width: `${progress}%` }} />
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        {currentStep === 1 && <Step1DailyGoals formData={formData} toggleDay={toggleDay} days={days} />}
        {currentStep === 2 && <Step2Weekly formData={formData} setFormData={setFormData} />}
        {currentStep === 3 && <Step3Recovery formData={formData} setFormData={setFormData} />}
        {currentStep === 4 && (
          <Step4Goals
            goals={goals}
            goalUpdates={goalUpdates}
            setGoalUpdates={setGoalUpdates}
          />
        )}
      </ScrollView>

      {/* Footer with Points Counter */}
      <View className="bg-surface-dark border-t border-slate-700 px-6 py-4 pb-8">
        <View className="flex-row gap-3">
          {currentStep > 1 && (
            <TouchableOpacity onPress={() => setCurrentStep(currentStep - 1)} className="flex-1 bg-slate-700 py-4 rounded-xl">
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
                    {currentStep === totalSteps ? 'Submit' : 'Continue'}
                  </Text>
                  {currentStep < totalSteps && <ArrowRight size={20} color="#102216" strokeWidth={2} />}
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

function Step1DailyGoals({ formData, toggleDay, days }) {
  const goals = [
    { key: 'water', title: 'Hit Water Goal', desc: '1 gallon (3.7L) daily', points: '+5 pts/day' },
    { key: 'protein', title: 'Hit Protein Goal', desc: '0.8-1g per lb body weight', points: '+5 pts/day' },
    { key: 'veggies', title: 'Hit Veggie Goal', desc: '5+ servings daily', points: '+5 pts/day' },
  ];

  return (
    <View className="gap-5">
      <Text className="text-white text-xl font-bold">Daily Nutrition Goals</Text>
      {goals.map((goal) => (
        <View key={goal.key} className="bg-surface-dark rounded-2xl p-5 border border-slate-700">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">{goal.title}</Text>
              <Text className="text-slate-400 text-sm mt-1">{goal.desc}</Text>
            </View>
            <View className="bg-primary/10 px-3 py-1 rounded-full">
              <Text className="text-primary font-bold text-sm">{goal.points}</Text>
            </View>
          </View>
          <View className="flex-row justify-between">
            {days.map((day, i) => (
              <TouchableOpacity key={i} onPress={() => toggleDay(goal.key, i)} className={`w-10 h-10 rounded-full items-center justify-center border-2 ${formData.dailyGoals[goal.key][i] ? 'bg-primary border-primary' : 'border-slate-600'}`}>
                <Text className={`font-bold text-sm ${formData.dailyGoals[goal.key][i] ? 'text-background-dark' : 'text-slate-500'}`}>{day}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function Step2Weekly({ formData, setFormData }) {
  const milestones = [
    { key: 'attendClasses', title: 'Attend 3 Classes', desc: 'This week', points: '+15 pts' },
    { key: 'noRestrictedFoods', title: 'No Restricted Foods', desc: 'All week long', points: '+15 pts' },
  ];

  return (
    <View className="gap-5">
      <Text className="text-white text-xl font-bold">Weekly Milestones</Text>
      {milestones.map((milestone) => (
        <TouchableOpacity key={milestone.key} onPress={() => setFormData(prev => ({ ...prev, weekly: { ...prev.weekly, [milestone.key]: !prev.weekly[milestone.key] }}))} className={`rounded-2xl p-6 border-2 ${formData.weekly[milestone.key] ? 'bg-primary/10 border-primary' : 'bg-surface-dark border-slate-700'}`}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className={`font-bold text-lg ${formData.weekly[milestone.key] ? 'text-primary' : 'text-white'}`}>{milestone.title}</Text>
              <Text className="text-slate-400 text-sm mt-1">{milestone.desc}</Text>
            </View>
            <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${formData.weekly[milestone.key] ? 'bg-primary border-primary' : 'border-slate-600'}`}>
              {formData.weekly[milestone.key] && <View className="w-3 h-3 bg-background-dark rounded-full" />}
            </View>
          </View>
          <View className="mt-3 bg-primary/10 self-start px-3 py-1 rounded-full">
            <Text className="text-primary font-bold text-sm">{milestone.points}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Step3Recovery({ formData, setFormData }) {
  return (
    <View className="gap-5">
      <Text className="text-white text-xl font-bold">Recovery & Training</Text>
      <View className="bg-surface-dark rounded-2xl p-5 border border-slate-700">
        <Text className="text-white font-bold text-lg mb-4">Workouts This Week</Text>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => setFormData(prev => ({ ...prev, recovery: { ...prev.recovery, workoutCount: Math.max(0, prev.recovery.workoutCount - 1) }}))} className="w-12 h-12 bg-slate-700 rounded-xl items-center justify-center">
            <Text className="text-white font-bold text-2xl">-</Text>
          </TouchableOpacity>
          <Text className="text-primary text-4xl font-bold">{formData.recovery.workoutCount}</Text>
          <TouchableOpacity onPress={() => setFormData(prev => ({ ...prev, recovery: { ...prev.recovery, workoutCount: Math.min(7, prev.recovery.workoutCount + 1) }}))} className="w-12 h-12 bg-primary rounded-xl items-center justify-center">
            <Text className="text-background-dark font-bold text-2xl">+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="bg-surface-dark rounded-2xl p-5 border border-slate-700">
        <Text className="text-white font-bold text-lg mb-4">Average Sleep Quality</Text>
        <View className="flex-row justify-between">
          {[1, 2, 3, 4, 5].map((rating) => (
            <TouchableOpacity key={rating} onPress={() => setFormData(prev => ({ ...prev, recovery: { ...prev.recovery, sleepQuality: rating }}))} className={`w-12 h-12 rounded-full items-center justify-center ${formData.recovery.sleepQuality >= rating ? 'bg-primary' : 'bg-slate-700'}`}>
              <Text className="text-2xl">{rating === 1 ? '😴' : rating === 2 ? '😐' : rating === 3 ? '🙂' : rating === 4 ? '😊' : '🤩'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

function goalTargetLabel(goal) {
  if (goal.type === 'weight') {
    return `${goal.direction === 'lose' ? 'Lose' : 'Gain'} ${goal.targetWeight} ${goal.unit}`;
  }
  if (goal.type === 'lift') {
    return `${goal.liftName} — ${goal.targetWeight} ${goal.unit}`;
  }
  return goal.text;
}

function goalEmoji(type) {
  if (type === 'weight') return '⚖';
  if (type === 'lift') return '🏋';
  return '🎯';
}

function Step4Goals({ goals, goalUpdates, setGoalUpdates }) {
  const updateGoal = (goalId, field, value) => {
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

      {goals.map((goal) => {
        const update = goalUpdates[goal.id] || { currentValue: '', progressNote: '' };
        return (
          <View key={goal.id} className="bg-surface-dark rounded-2xl p-5 border border-slate-700">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-xl">{goalEmoji(goal.type)}</Text>
              <Text className="text-slate-400 text-xs uppercase tracking-wide flex-1" numberOfLines={1}>
                {goalTargetLabel(goal)}
              </Text>
            </View>

            {goal.type === 'weight' && (
              <View className="mt-3">
                <Text className="text-white text-sm font-medium mb-2">Current weight</Text>
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={update.currentValue}
                    onChangeText={v => updateGoal(goal.id, 'currentValue', v)}
                    keyboardType="numeric"
                    placeholder={goal.currentValue != null ? String(goal.currentValue) : `e.g. 190`}
                    placeholderTextColor="#475569"
                    className="flex-1 bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-600 text-base"
                  />
                  <Text className="text-slate-400 font-medium w-8">{goal.unit}</Text>
                </View>
                {goal.currentValue != null && (
                  <Text className="text-slate-500 text-xs mt-1">Last: {goal.currentValue} {goal.unit}</Text>
                )}
              </View>
            )}

            {goal.type === 'lift' && (
              <View className="mt-3">
                <Text className="text-white text-sm font-medium mb-2">Current best</Text>
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={update.currentValue}
                    onChangeText={v => updateGoal(goal.id, 'currentValue', v)}
                    keyboardType="numeric"
                    placeholder={goal.currentValue != null ? String(goal.currentValue) : `e.g. 125`}
                    placeholderTextColor="#475569"
                    className="flex-1 bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-600 text-base"
                  />
                  <Text className="text-slate-400 font-medium w-8">{goal.unit}</Text>
                </View>
                {goal.currentValue != null && (
                  <Text className="text-slate-500 text-xs mt-1">Last: {goal.currentValue} {goal.unit}</Text>
                )}
              </View>
            )}

            {goal.type === 'other' && (
              <View className="mt-3">
                <Text className="text-white text-sm font-medium mb-2">Progress note</Text>
                <TextInput
                  value={update.progressNote}
                  onChangeText={v => updateGoal(goal.id, 'progressNote', v)}
                  placeholder={goal.progressNote || 'How is it going?'}
                  placeholderTextColor="#475569"
                  multiline
                  numberOfLines={2}
                  className="bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-600 text-base"
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
