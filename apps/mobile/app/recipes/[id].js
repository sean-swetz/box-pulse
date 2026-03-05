import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Heart, Edit2, Trash2, ChefHat } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { recipeAPI } from '../../lib/api';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    try {
      const res = await recipeAPI.get(id);
      setRecipe(res.data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load recipe');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      const res = await recipeAPI.like(id);
      setRecipe(prev => ({
        ...prev,
        likedByMe: res.data.liked,
        likesCount: prev.likesCount + (res.data.liked ? 1 : -1),
      }));
    } catch (e) {
      console.error('Like error:', e);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Recipe', 'Are you sure you want to delete this recipe?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await recipeAPI.delete(id);
            router.back();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete recipe');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background-dark items-center justify-center">
        <ActivityIndicator size="large" color="#0df259" />
      </View>
    );
  }

  if (!recipe) return null;

  const isAuthor = recipe.authorId === user?.id;

  return (
    <View className="flex-1 bg-background-dark">
      <ScrollView className="flex-1" bounces={false}>
        {/* Hero image */}
        {recipe.imageUrl ? (
          <Image source={{ uri: recipe.imageUrl }} className="w-full h-64" resizeMode="cover" />
        ) : (
          <View className="w-full h-64 bg-slate-800 items-center justify-center">
            <ChefHat size={56} color="#475569" strokeWidth={1.5} />
          </View>
        )}

        {/* Header overlay buttons */}
        <View className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-4 pt-14">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-black/50 rounded-full items-center justify-center"
          >
            <ArrowLeft size={20} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
          {isAuthor && (
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => router.push(`/recipes/create?editId=${id}`)}
                className="w-10 h-10 bg-black/50 rounded-full items-center justify-center"
              >
                <Edit2 size={18} color="#fff" strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                className="w-10 h-10 bg-black/50 rounded-full items-center justify-center"
              >
                <Trash2 size={18} color="#ef4444" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View className="px-6 py-5">
          {/* Title + meta */}
          <View className="flex-row items-start justify-between gap-3 mb-1">
            <Text className="text-white text-2xl font-bold flex-1">{recipe.title}</Text>
            <TouchableOpacity onPress={handleLike} className="flex-row items-center gap-1 pt-1">
              <Heart
                size={22}
                color={recipe.likedByMe ? '#ef4444' : '#94a3b8'}
                fill={recipe.likedByMe ? '#ef4444' : 'none'}
                strokeWidth={2}
              />
              <Text className="text-slate-400 font-semibold">{recipe.likesCount}</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-slate-400 text-sm mb-2">by {recipe.author?.name}</Text>
          {recipe.category && (
            <View className="self-start bg-primary/10 border border-primary/30 px-3 py-1 rounded-full mb-4">
              <Text className="text-primary text-xs font-semibold">{recipe.category}</Text>
            </View>
          )}
          {recipe.description && (
            <Text className="text-slate-300 text-base leading-relaxed mb-5">{recipe.description}</Text>
          )}

          {/* Macros */}
          {recipe.macros && (
            <View className="bg-surface-dark rounded-2xl p-4 border border-slate-700 mb-6">
              <Text className="text-white font-bold text-base mb-3">Nutrition</Text>
              <View className="flex-row justify-between">
                {recipe.macros.calories != null && <MacroStat label="Calories" value={recipe.macros.calories} />}
                {recipe.macros.protein != null && <MacroStat label="Protein" value={`${recipe.macros.protein}g`} highlight />}
                {recipe.macros.carbs != null && <MacroStat label="Carbs" value={`${recipe.macros.carbs}g`} />}
                {recipe.macros.fat != null && <MacroStat label="Fat" value={`${recipe.macros.fat}g`} />}
              </View>
            </View>
          )}

          {/* Ingredients */}
          {recipe.ingredients?.length > 0 && (
            <View className="mb-6">
              <Text className="text-white font-bold text-lg mb-3">
                Ingredients ({recipe.ingredients.length})
              </Text>
              <View className="gap-2">
                {recipe.ingredients.map((ing, i) => (
                  <View key={i} className="flex-row items-center gap-3 bg-surface-dark rounded-xl px-4 py-3 border border-slate-700">
                    <View className="w-2 h-2 rounded-full bg-primary" />
                    <Text className="text-slate-400 font-medium w-20">{ing.amount}</Text>
                    <Text className="text-white flex-1">{ing.item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Instructions */}
          {recipe.instructions?.length > 0 && (
            <View className="mb-8">
              <Text className="text-white font-bold text-lg mb-3">Instructions</Text>
              <View className="gap-4">
                {recipe.instructions.map((inst, i) => (
                  <View key={i} className="flex-row gap-4">
                    <View className="w-8 h-8 rounded-full bg-primary items-center justify-center flex-shrink-0 mt-0.5">
                      <Text className="text-background-dark font-bold text-sm">{inst.step ?? i + 1}</Text>
                    </View>
                    <Text className="text-slate-200 text-base leading-relaxed flex-1">{inst.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function MacroStat({ label, value, highlight }) {
  return (
    <View className="items-center">
      <Text className={`text-xl font-bold ${highlight ? 'text-primary' : 'text-white'}`}>{value}</Text>
      <Text className="text-slate-400 text-xs mt-1">{label}</Text>
    </View>
  );
}
