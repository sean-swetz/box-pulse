import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, ArrowRight, User, Save } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/authStore';

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
  
  const { user } = useAuthStore();
  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Calculate points
  const calculatePoints = () => {
    let points = 0;
    // Daily goals: 5 pts per day
    Object.values(formData.dailyGoals).forEach(week => {
      points += week.filter(Boolean).length * 5;
    });
    // Weekly milestones: 15 pts each
    if (formData.weekly.attendClasses) points += 15;
    if (formData.weekly.noRestrictedFoods) points += 15;
    return points;
  };

  const currentPoints = calculatePoints();

  // Load draft on mount
  useEffect(() => {
    loadDraft();
  }, []);

  // Save draft when formData changes
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
    // TODO: Submit to API
    console.log('Submitting:', formData, 'Points:', currentPoints);
    await clearDraft();
    router.push('/checkin/success');
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
      </ScrollView>

      {/* Footer with Points Counter */}
      <View className="bg-surface-dark border-t border-slate-700 px-6 py-4 pb-8">
        <View className="flex-row gap-3">
          {currentStep > 1 && (
            <TouchableOpacity onPress={() => setCurrentStep(currentStep - 1)} className="flex-1 bg-slate-700 py-4 rounded-xl">
              <Text className="text-white text-center font-bold">Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleNext} className="flex-1 bg-primary py-4 rounded-xl">
            <View className="flex-row items-center justify-center gap-3">
              <Text className="text-background-dark font-bold text-base">
                {currentStep === totalSteps ? 'Submit' : 'Continue'}
              </Text>
              {currentStep < totalSteps && <ArrowRight size={20} color="#102216" strokeWidth={2} />}
              <View className="bg-background-dark/20 px-3 py-1 rounded-full">
                <Text className="text-background-dark font-bold text-sm">{currentPoints} pts</Text>
              </View>
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
