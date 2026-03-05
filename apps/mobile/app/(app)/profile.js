import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, TextInput,
  Alert, ActivityIndicator, Modal, Animated, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import {
  User, Camera, LogOut, Trophy, Award, Edit2, Check, X,
  Dumbbell, Salad, Target, CheckSquare, Plus, Eye, EyeOff,
  ArrowLeft, Scale, Trash2,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { userAPI, goalAPI } from '../../lib/api';

export default function ProfileScreen() {
  const { user, selectedGym, logout, setAuth } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? '',
    favoriteMovement: user?.favoriteMovement ?? '',
    favoriteVeggie: user?.favoriteVeggie ?? '',
    challengeGoal: user?.challengeGoal ?? '',
  });

  // Goals state
  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);

  useEffect(() => {
    if (selectedGym?.id) loadStats();
    loadGoals();
  }, [selectedGym?.id]);

  const loadStats = async () => {
    try {
      const res = await userAPI.getStats(selectedGym.id);
      setStats(res.data);
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadGoals = async () => {
    try {
      const res = await goalAPI.list();
      setGoals(res.data);
    } catch (e) {
      console.error('Failed to load goals:', e);
    } finally {
      setGoalsLoading(false);
    }
  };

  const handleTogglePublic = async (goal) => {
    try {
      const res = await goalAPI.update(goal.id, { isPublic: !goal.isPublic });
      setGoals(prev => prev.map(g => g.id === goal.id ? res.data : g));
    } catch (e) {
      Alert.alert('Error', 'Failed to update goal');
    }
  };

  const handleDeleteGoal = (goal) => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await goalAPI.delete(goal.id);
            setGoals(prev => prev.filter(g => g.id !== goal.id));
          } catch (e) {
            Alert.alert('Error', 'Failed to delete goal');
          }
        },
      },
    ]);
  };

  const handleGoalCreated = (goal) => {
    setGoals(prev => [goal, ...prev]);
    setShowGoalModal(false);
  };

  const handleEdit = () => {
    setForm({
      name: user?.name ?? '',
      favoriteMovement: user?.favoriteMovement ?? '',
      favoriteVeggie: user?.favoriteVeggie ?? '',
      challengeGoal: user?.challengeGoal ?? '',
    });
    setEditing(true);
  };

  const handleCancel = () => setEditing(false);

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Required', 'Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const res = await userAPI.updateProfile(form);
      await setAuth(res.data, useAuthStore.getState().token);
      setEditing(false);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to change your profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      try {
        const res = await userAPI.updateProfile({ photoUrl: uri });
        await setAuth(res.data, useAuthStore.getState().token);
      } catch (e) {
        Alert.alert('Error', 'Failed to update profile photo');
      }
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView className="flex-1 bg-background-dark">
      {/* Header */}
      <View className="bg-surface-dark px-6 pt-16 pb-8 border-b border-slate-700">
        <View className="items-center mb-4">
          <View className="relative mb-4">
            <View className="w-28 h-28 rounded-full bg-slate-700 overflow-hidden border-4 border-slate-800">
              {user?.photoUrl ? (
                <Image source={{ uri: user.photoUrl }} className="w-full h-full" />
              ) : (
                <View className="w-full h-full items-center justify-center bg-primary/20">
                  <User size={44} color="#0df259" strokeWidth={2} />
                </View>
              )}
            </View>
            <TouchableOpacity onPress={handlePickPhoto} className="absolute bottom-0 right-0 w-9 h-9 bg-primary rounded-full items-center justify-center border-4 border-surface-dark">
              <Camera size={16} color="#102216" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {editing ? (
            <TextInput
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
              className="text-white text-2xl font-bold text-center bg-slate-800 px-4 py-2 rounded-xl border border-slate-600 mb-1"
              autoFocus
            />
          ) : (
            <Text className="text-white text-2xl font-bold">{user?.name}</Text>
          )}

          <Text className="text-slate-400 text-sm mt-1">{user?.email}</Text>

          {selectedGym && (
            <View className="bg-primary/10 px-4 py-1.5 rounded-full mt-2 border border-primary/20">
              <Text className="text-primary font-semibold text-sm">{selectedGym.name}</Text>
            </View>
          )}
        </View>

        {editing ? (
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleCancel}
              className="flex-1 py-3 rounded-xl border border-slate-600 flex-row items-center justify-center gap-2"
            >
              <X size={18} color="#94a3b8" strokeWidth={2} />
              <Text className="text-slate-400 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-primary flex-row items-center justify-center gap-2"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#102216" />
              ) : (
                <>
                  <Check size={18} color="#102216" strokeWidth={2.5} />
                  <Text className="text-background-dark font-bold">Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleEdit}
            className="flex-row items-center justify-center gap-2 py-3 rounded-xl border border-slate-600"
          >
            <Edit2 size={16} color="#94a3b8" strokeWidth={2} />
            <Text className="text-slate-400 font-semibold">Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View className="px-6 py-6">
        <Text className="text-white text-xl font-bold mb-4">Your Stats</Text>
        {statsLoading ? (
          <View className="items-center py-6">
            <ActivityIndicator color="#0df259" />
          </View>
        ) : (
          <>
            <View className="flex-row gap-4 mb-4">
              <View className="flex-1 bg-surface-dark rounded-xl p-5 border border-slate-700">
                <View className="flex-row items-center gap-2 mb-2">
                  <Trophy size={18} color="#0df259" strokeWidth={2} />
                  <Text className="text-slate-400 text-sm">Points</Text>
                </View>
                <Text className="text-white text-3xl font-bold">
                  {stats?.points?.toLocaleString() ?? '0'}
                </Text>
              </View>
              <View className="flex-1 bg-surface-dark rounded-xl p-5 border border-slate-700">
                <View className="flex-row items-center gap-2 mb-2">
                  <Award size={18} color="#0df259" strokeWidth={2} />
                  <Text className="text-slate-400 text-sm">Rank</Text>
                </View>
                <Text className="text-primary text-3xl font-bold">
                  {stats?.rank ? `#${stats.rank}` : '—'}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-4">
              <View className="flex-1 bg-surface-dark rounded-xl p-5 border border-slate-700">
                <View className="flex-row items-center gap-2 mb-2">
                  <CheckSquare size={18} color="#0df259" strokeWidth={2} />
                  <Text className="text-slate-400 text-sm">Check-ins</Text>
                </View>
                <Text className="text-white text-3xl font-bold">{stats?.checkinsCount ?? 0}</Text>
              </View>
              {stats?.team && (
                <View className="flex-1 bg-surface-dark rounded-xl p-5 border border-slate-700">
                  <Text className="text-slate-400 text-xs uppercase mb-2">Team</Text>
                  <View className="flex-row items-center gap-2">
                    <View className="w-3 h-3 rounded-full" style={{ backgroundColor: stats.team.color }} />
                    <Text className="text-white font-bold" numberOfLines={1}>{stats.team.name}</Text>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {/* Goals Section */}
      <View className="px-6 pb-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-white text-xl font-bold">My Goals</Text>
          <TouchableOpacity
            onPress={() => setShowGoalModal(true)}
            className="w-9 h-9 bg-primary/20 rounded-full items-center justify-center border border-primary/30"
          >
            <Plus size={20} color="#0df259" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {goalsLoading ? (
          <View className="items-center py-6">
            <ActivityIndicator color="#0df259" />
          </View>
        ) : goals.length === 0 ? (
          <View className="bg-surface-dark rounded-xl p-6 border border-slate-700 items-center">
            <Target size={32} color="#475569" strokeWidth={1.5} />
            <Text className="text-slate-500 mt-3 text-center">Tap + to add your first goal</Text>
          </View>
        ) : (
          <View className="gap-3">
            {goals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onTogglePublic={() => handleTogglePublic(goal)}
                onDelete={() => handleDeleteGoal(goal)}
              />
            ))}
          </View>
        )}
      </View>

      {/* About / editable fields */}
      <View className="px-6 pb-6">
        <Text className="text-white text-xl font-bold mb-4">About</Text>
        <View className="gap-3">
          <ProfileField
            icon={<Dumbbell size={18} color="#0df259" strokeWidth={2} />}
            label="Favorite Movement"
            value={form.favoriteMovement}
            placeholder="e.g. Deadlifts"
            editing={editing}
            onChange={v => setForm(f => ({ ...f, favoriteMovement: v }))}
            displayValue={user?.favoriteMovement}
          />
          <ProfileField
            icon={<Salad size={18} color="#0df259" strokeWidth={2} />}
            label="Favorite Veggie"
            value={form.favoriteVeggie}
            placeholder="e.g. Broccoli"
            editing={editing}
            onChange={v => setForm(f => ({ ...f, favoriteVeggie: v }))}
            displayValue={user?.favoriteVeggie}
          />
          <ProfileField
            icon={<Target size={18} color="#0df259" strokeWidth={2} />}
            label="Challenge Goal"
            value={form.challengeGoal}
            placeholder="e.g. Lose 10 lbs"
            editing={editing}
            onChange={v => setForm(f => ({ ...f, challengeGoal: v }))}
            displayValue={user?.challengeGoal}
          />
        </View>
      </View>

      {/* Log Out */}
      <View className="px-6 pb-10">
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-500/10 rounded-xl p-5 border border-red-500/20 flex-row items-center gap-4"
        >
          <LogOut size={22} color="#ef4444" strokeWidth={2} />
          <Text className="text-red-400 font-semibold">Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Add Goal Modal */}
      <AddGoalModal
        visible={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        onCreated={handleGoalCreated}
      />
    </ScrollView>
  );
}

// ===== GOAL CARD =====

function goalLabel(goal) {
  if (goal.type === 'weight') {
    const dir = goal.direction === 'lose' ? 'Lose' : 'Gain';
    return `⚖ ${dir} ${goal.targetWeight} ${goal.unit}`;
  }
  if (goal.type === 'lift') {
    return `🏋 ${goal.liftName} — ${goal.targetWeight} ${goal.unit}`;
  }
  return `🎯 ${goal.text}`;
}

function currentProgressText(goal) {
  if (goal.type === 'weight' && goal.currentValue != null) return `Current: ${goal.currentValue} ${goal.unit}`;
  if (goal.type === 'lift' && goal.currentValue != null) return `Current best: ${goal.currentValue} ${goal.unit}`;
  if (goal.progressNote) return goal.progressNote;
  return null;
}

function GoalCard({ goal, onTogglePublic, onDelete }) {
  const progress = currentProgressText(goal);
  return (
    <View className="bg-surface-dark rounded-xl px-4 py-4 border border-slate-700">
      <View className="flex-row items-center justify-between">
        <Text className="text-white font-medium flex-1 mr-3" numberOfLines={2}>
          {goalLabel(goal)}
        </Text>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={onTogglePublic}>
            {goal.isPublic ? (
              <Eye size={20} color="#0df259" strokeWidth={2} />
            ) : (
              <EyeOff size={20} color="#475569" strokeWidth={2} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete}>
            <Trash2 size={18} color="#ef4444" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
      {progress && (
        <Text className="text-primary text-sm mt-1">{progress}</Text>
      )}
    </View>
  );
}

// ===== ADD GOAL MODAL =====

function AddGoalModal({ visible, onClose, onCreated }) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const [step, setStep] = useState(1);
  const [goalType, setGoalType] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [direction, setDirection] = useState('lose');
  const [targetWeight, setTargetWeight] = useState('');
  const [unit, setUnit] = useState('lbs');
  const [liftName, setLiftName] = useState('');
  const [otherText, setOtherText] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (visible) {
      setStep(1);
      setGoalType(null);
      setDirection('lose');
      setTargetWeight('');
      setUnit('lbs');
      setLiftName('');
      setOtherText('');
      setIsPublic(false);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleSelectType = (type) => {
    setGoalType(type);
    setStep(2);
  };

  const handleBack = () => setStep(1);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = { type: goalType, isPublic };
      if (goalType === 'weight') {
        Object.assign(payload, { direction, targetWeight: parseFloat(targetWeight), unit });
      } else if (goalType === 'lift') {
        Object.assign(payload, { liftName, targetWeight: parseFloat(targetWeight), unit });
      } else {
        Object.assign(payload, { text: otherText });
      }
      const res = await goalAPI.create(payload);
      onCreated(res.data);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <TouchableOpacity
          className="flex-1 bg-black/60"
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={{ transform: [{ translateY: slideAnim }] }}
          className="bg-surface-dark rounded-t-3xl px-6 pt-4 pb-10 border-t border-slate-700"
        >
          {/* Handle bar */}
          <View className="w-12 h-1 bg-slate-600 rounded-full self-center mb-5" />

          {step === 1 ? (
            <>
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-white text-xl font-bold">New Goal</Text>
                <TouchableOpacity onPress={onClose}>
                  <X size={22} color="#94a3b8" strokeWidth={2} />
                </TouchableOpacity>
              </View>

              <Text className="text-slate-400 text-sm mb-4">Choose a goal type</Text>

              <TouchableOpacity
                onPress={() => handleSelectType('weight')}
                className="bg-slate-800 border border-slate-600 rounded-2xl p-5 mb-3 flex-row items-center gap-4"
              >
                <Text className="text-3xl">⚖</Text>
                <View>
                  <Text className="text-white font-bold text-lg">Weight</Text>
                  <Text className="text-slate-400 text-sm">Set a gain or lose target</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSelectType('lift')}
                className="bg-slate-800 border border-slate-600 rounded-2xl p-5 mb-3 flex-row items-center gap-4"
              >
                <Text className="text-3xl">🏋</Text>
                <View>
                  <Text className="text-white font-bold text-lg">Lift</Text>
                  <Text className="text-slate-400 text-sm">Chase a lifting PR</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSelectType('other')}
                className="bg-slate-800 border border-slate-600 rounded-2xl p-5 flex-row items-center gap-4"
              >
                <Text className="text-3xl">🎯</Text>
                <View>
                  <Text className="text-white font-bold text-lg">Other</Text>
                  <Text className="text-slate-400 text-sm">Any custom goal</Text>
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View className="flex-row items-center gap-3 mb-6">
                <TouchableOpacity onPress={handleBack}>
                  <ArrowLeft size={22} color="#94a3b8" strokeWidth={2} />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold">
                  {goalType === 'weight' ? '⚖ Weight Goal' : goalType === 'lift' ? '🏋 Lift Goal' : '🎯 Other Goal'}
                </Text>
              </View>

              {goalType === 'weight' && (
                <>
                  <Text className="text-slate-400 text-xs uppercase tracking-wide mb-2">Direction</Text>
                  <View className="flex-row bg-slate-800 rounded-xl p-1 mb-4">
                    {['lose', 'gain'].map(opt => (
                      <TouchableOpacity
                        key={opt}
                        onPress={() => setDirection(opt)}
                        className={`flex-1 py-2.5 rounded-lg items-center ${direction === opt ? 'bg-primary' : ''}`}
                      >
                        <Text className={`font-semibold capitalize ${direction === opt ? 'text-background-dark' : 'text-slate-400'}`}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text className="text-slate-400 text-xs uppercase tracking-wide mb-2">
                    Amount to {direction === 'lose' ? 'Lose' : 'Gain'}
                  </Text>
                  <TextInput
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                    keyboardType="numeric"
                    placeholder="e.g. 15"
                    placeholderTextColor="#475569"
                    className="bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-600 mb-4 text-base"
                  />

                  <Text className="text-slate-400 text-xs uppercase tracking-wide mb-2">Unit</Text>
                  <View className="flex-row bg-slate-800 rounded-xl p-1 mb-5">
                    {['lbs', 'kg'].map(opt => (
                      <TouchableOpacity
                        key={opt}
                        onPress={() => setUnit(opt)}
                        className={`flex-1 py-2.5 rounded-lg items-center ${unit === opt ? 'bg-primary' : ''}`}
                      >
                        <Text className={`font-semibold ${unit === opt ? 'text-background-dark' : 'text-slate-400'}`}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {goalType === 'lift' && (
                <>
                  <Text className="text-slate-400 text-xs uppercase tracking-wide mb-2">Lift Name</Text>
                  <TextInput
                    value={liftName}
                    onChangeText={setLiftName}
                    placeholder="e.g. Snatch, Clean & Jerk"
                    placeholderTextColor="#475569"
                    className="bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-600 mb-4 text-base"
                  />

                  <Text className="text-slate-400 text-xs uppercase tracking-wide mb-2">Target Weight</Text>
                  <TextInput
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                    keyboardType="numeric"
                    placeholder="e.g. 135"
                    placeholderTextColor="#475569"
                    className="bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-600 mb-4 text-base"
                  />

                  <Text className="text-slate-400 text-xs uppercase tracking-wide mb-2">Unit</Text>
                  <View className="flex-row bg-slate-800 rounded-xl p-1 mb-5">
                    {['lbs', 'kg'].map(opt => (
                      <TouchableOpacity
                        key={opt}
                        onPress={() => setUnit(opt)}
                        className={`flex-1 py-2.5 rounded-lg items-center ${unit === opt ? 'bg-primary' : ''}`}
                      >
                        <Text className={`font-semibold ${unit === opt ? 'text-background-dark' : 'text-slate-400'}`}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {goalType === 'other' && (
                <>
                  <Text className="text-slate-400 text-xs uppercase tracking-wide mb-2">Goal</Text>
                  <TextInput
                    value={otherText}
                    onChangeText={setOtherText}
                    placeholder="Describe your goal..."
                    placeholderTextColor="#475569"
                    multiline
                    numberOfLines={3}
                    className="bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-600 mb-5 text-base"
                    style={{ minHeight: 80, textAlignVertical: 'top' }}
                  />
                </>
              )}

              <View className="flex-row items-center justify-between bg-slate-800 rounded-xl px-4 py-3 mb-5 border border-slate-600">
                <View>
                  <Text className="text-white font-semibold">Make Public</Text>
                  <Text className="text-slate-400 text-xs">Visible on your profile to teammates</Text>
                </View>
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  trackColor={{ false: '#334155', true: '#0df259' }}
                  thumbColor={isPublic ? '#102216' : '#94a3b8'}
                />
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                className="bg-primary py-4 rounded-xl items-center"
              >
                {submitting ? (
                  <ActivityIndicator color="#102216" />
                ) : (
                  <Text className="text-background-dark font-bold text-base">Save Goal</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ===== PROFILE FIELD =====

function ProfileField({ icon, label, value, placeholder, editing, onChange, displayValue }) {
  return (
    <View className="bg-surface-dark rounded-xl p-4 border border-slate-700">
      <View className="flex-row items-center gap-2 mb-2">
        {icon}
        <Text className="text-slate-400 text-xs uppercase tracking-wide">{label}</Text>
      </View>
      {editing ? (
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#475569"
          className="text-white text-base bg-slate-800 px-3 py-2 rounded-lg border border-slate-600"
        />
      ) : (
        <Text className={`text-base ${displayValue ? 'text-white' : 'text-slate-600 italic'}`}>
          {displayValue || placeholder}
        </Text>
      )}
    </View>
  );
}
