import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Camera, Plus, Trash2, ChevronDown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { recipeAPI } from '../../lib/api';

const CATEGORIES = ['High Protein', 'Vegetarian', 'Snack', 'Meal Prep', 'Breakfast', 'Other'];

export default function CreateRecipeScreen() {
  const { editId } = useLocalSearchParams();
  const { selectedGym } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    category: '',
    macros: { calories: '', protein: '', carbs: '', fat: '' },
    ingredients: [{ amount: '', item: '' }],
    instructions: [{ step: 1, text: '' }],
  });

  useEffect(() => {
    if (editId) loadExisting();
  }, [editId]);

  const loadExisting = async () => {
    try {
      const res = await recipeAPI.get(editId);
      const r = res.data;
      setForm({
        title: r.title ?? '',
        description: r.description ?? '',
        imageUrl: r.imageUrl ?? '',
        category: r.category ?? '',
        macros: {
          calories: r.macros?.calories?.toString() ?? '',
          protein: r.macros?.protein?.toString() ?? '',
          carbs: r.macros?.carbs?.toString() ?? '',
          fat: r.macros?.fat?.toString() ?? '',
        },
        ingredients: r.ingredients?.length ? r.ingredients : [{ amount: '', item: '' }],
        instructions: r.instructions?.length ? r.instructions : [{ step: 1, text: '' }],
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to load recipe');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setForm(f => ({ ...f, imageUrl: result.assets[0].uri }));
    }
  };

  const addIngredient = () =>
    setForm(f => ({ ...f, ingredients: [...f.ingredients, { amount: '', item: '' }] }));

  const removeIngredient = (i) =>
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }));

  const updateIngredient = (i, field, val) =>
    setForm(f => ({
      ...f,
      ingredients: f.ingredients.map((ing, idx) => idx === i ? { ...ing, [field]: val } : ing),
    }));

  const addStep = () =>
    setForm(f => ({
      ...f,
      instructions: [...f.instructions, { step: f.instructions.length + 1, text: '' }],
    }));

  const removeStep = (i) =>
    setForm(f => ({
      ...f,
      instructions: f.instructions
        .filter((_, idx) => idx !== i)
        .map((s, idx) => ({ ...s, step: idx + 1 })),
    }));

  const updateStep = (i, val) =>
    setForm(f => ({
      ...f,
      instructions: f.instructions.map((s, idx) => idx === i ? { ...s, text: val } : s),
    }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Required', 'Please add a recipe title');
      return;
    }
    if (form.ingredients.every(i => !i.item.trim())) {
      Alert.alert('Required', 'Please add at least one ingredient');
      return;
    }
    if (form.instructions.every(s => !s.text.trim())) {
      Alert.alert('Required', 'Please add at least one instruction step');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        gymId: selectedGym.id,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl || undefined,
        category: form.category || undefined,
        tags: [],
        ingredients: form.ingredients.filter(i => i.item.trim()),
        instructions: form.instructions.filter(s => s.text.trim()),
        macros: {
          calories: form.macros.calories ? Number(form.macros.calories) : undefined,
          protein: form.macros.protein ? Number(form.macros.protein) : undefined,
          carbs: form.macros.carbs ? Number(form.macros.carbs) : undefined,
          fat: form.macros.fat ? Number(form.macros.fat) : undefined,
        },
      };

      if (editId) {
        await recipeAPI.update(editId, payload);
      } else {
        await recipeAPI.create(payload);
      }
      router.back();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View className="bg-surface-dark px-6 pt-14 pb-4 border-b border-slate-700">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold flex-1">
            {editId ? 'Edit Recipe' : 'New Recipe'}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6" keyboardShouldPersistTaps="handled">
        {/* Photo */}
        <TouchableOpacity onPress={pickImage} className="mb-6">
          {form.imageUrl ? (
            <Image source={{ uri: form.imageUrl }} className="w-full h-48 rounded-2xl" resizeMode="cover" />
          ) : (
            <View className="w-full h-48 rounded-2xl bg-slate-800 border-2 border-dashed border-slate-600 items-center justify-center gap-2">
              <Camera size={32} color="#94a3b8" strokeWidth={2} />
              <Text className="text-slate-400 font-medium">Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Title */}
        <FormLabel>Recipe Title *</FormLabel>
        <TextInput
          value={form.title}
          onChangeText={v => setForm(f => ({ ...f, title: v }))}
          placeholder="e.g. High Protein Overnight Oats"
          placeholderTextColor="#64748b"
          className="bg-slate-800 text-white px-4 py-4 rounded-xl mb-4 border border-slate-700"
        />

        {/* Description */}
        <FormLabel>Description</FormLabel>
        <TextInput
          value={form.description}
          onChangeText={v => setForm(f => ({ ...f, description: v }))}
          placeholder="Brief description..."
          placeholderTextColor="#64748b"
          multiline
          numberOfLines={3}
          className="bg-slate-800 text-white px-4 py-3 rounded-xl mb-4 h-20 border border-slate-700"
        />

        {/* Category */}
        <FormLabel>Category</FormLabel>
        <TouchableOpacity
          onPress={() => setShowCategories(!showCategories)}
          className="bg-slate-800 border border-slate-700 px-4 py-4 rounded-xl mb-1 flex-row items-center justify-between"
        >
          <Text className={form.category ? 'text-white' : 'text-slate-500'}>
            {form.category || 'Select category...'}
          </Text>
          <ChevronDown size={18} color="#94a3b8" strokeWidth={2} />
        </TouchableOpacity>
        {showCategories && (
          <View className="bg-slate-800 border border-slate-700 rounded-xl mb-4 overflow-hidden">
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => { setForm(f => ({ ...f, category: cat })); setShowCategories(false); }}
                className="px-4 py-3 border-b border-slate-700"
              >
                <Text className={`${form.category === cat ? 'text-primary font-bold' : 'text-white'}`}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {!showCategories && <View className="mb-4" />}

        {/* Macros */}
        <FormLabel>Macros (per serving)</FormLabel>
        <View className="flex-row gap-3 mb-6">
          {[
            { key: 'calories', label: 'Calories' },
            { key: 'protein', label: 'Protein (g)' },
            { key: 'carbs', label: 'Carbs (g)' },
            { key: 'fat', label: 'Fat (g)' },
          ].map(({ key, label }) => (
            <View key={key} className="flex-1">
              <Text className="text-slate-500 text-xs mb-1">{label}</Text>
              <TextInput
                value={form.macros[key]}
                onChangeText={v => setForm(f => ({ ...f, macros: { ...f.macros, [key]: v } }))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#64748b"
                className="bg-slate-800 text-white px-3 py-3 rounded-xl text-center border border-slate-700"
              />
            </View>
          ))}
        </View>

        {/* Ingredients */}
        <View className="flex-row items-center justify-between mb-3">
          <FormLabel noMargin>Ingredients *</FormLabel>
          <TouchableOpacity onPress={addIngredient} className="flex-row items-center gap-1">
            <Plus size={16} color="#0df259" strokeWidth={2} />
            <Text className="text-primary text-sm font-semibold">Add</Text>
          </TouchableOpacity>
        </View>
        <View className="gap-2 mb-6">
          {form.ingredients.map((ing, i) => (
            <View key={i} className="flex-row gap-2 items-center">
              <TextInput
                value={ing.amount}
                onChangeText={v => updateIngredient(i, 'amount', v)}
                placeholder="Amount"
                placeholderTextColor="#64748b"
                className="bg-slate-800 text-white px-3 py-3 rounded-xl border border-slate-700 w-24"
              />
              <TextInput
                value={ing.item}
                onChangeText={v => updateIngredient(i, 'item', v)}
                placeholder="Ingredient"
                placeholderTextColor="#64748b"
                className="bg-slate-800 text-white px-3 py-3 rounded-xl border border-slate-700 flex-1"
              />
              {form.ingredients.length > 1 && (
                <TouchableOpacity onPress={() => removeIngredient(i)} className="p-2">
                  <Trash2 size={18} color="#ef4444" strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Instructions */}
        <View className="flex-row items-center justify-between mb-3">
          <FormLabel noMargin>Instructions *</FormLabel>
          <TouchableOpacity onPress={addStep} className="flex-row items-center gap-1">
            <Plus size={16} color="#0df259" strokeWidth={2} />
            <Text className="text-primary text-sm font-semibold">Add Step</Text>
          </TouchableOpacity>
        </View>
        <View className="gap-3 mb-8">
          {form.instructions.map((step, i) => (
            <View key={i} className="flex-row gap-3 items-start">
              <View className="w-8 h-8 rounded-full bg-primary items-center justify-center flex-shrink-0 mt-2">
                <Text className="text-background-dark font-bold text-sm">{step.step}</Text>
              </View>
              <TextInput
                value={step.text}
                onChangeText={v => updateStep(i, v)}
                placeholder={`Step ${step.step}...`}
                placeholderTextColor="#64748b"
                multiline
                className="bg-slate-800 text-white px-3 py-3 rounded-xl border border-slate-700 flex-1 min-h-[48px]"
              />
              {form.instructions.length > 1 && (
                <TouchableOpacity onPress={() => removeStep(i)} className="p-2 mt-1">
                  <Trash2 size={18} color="#ef4444" strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Save button */}
      <View className="bg-surface-dark border-t border-slate-700 px-6 py-4 pb-8">
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className={`bg-primary py-4 rounded-xl items-center ${saving ? 'opacity-60' : ''}`}
        >
          {saving ? (
            <ActivityIndicator color="#102216" />
          ) : (
            <Text className="text-background-dark font-bold text-base">
              {editId ? 'Save Changes' : 'Post Recipe'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function FormLabel({ children, noMargin }) {
  return (
    <Text className={`text-slate-400 text-sm font-medium ${noMargin ? '' : 'mb-2'}`}>
      {children}
    </Text>
  );
}
