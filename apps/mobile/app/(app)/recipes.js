import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, TextInput } from 'react-native';
import { router } from 'expo-router';
import { BookOpen, Plus, Heart, Search, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { recipeAPI } from '../../lib/api';

const CATEGORIES = ['All', 'High Protein', 'Vegetarian', 'Snack', 'Meal Prep', 'Breakfast', 'Other'];

export default function RecipesScreen() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const { selectedGym, user } = useAuthStore();

  useEffect(() => {
    loadRecipes();
  }, [selectedCategory]);

  const loadRecipes = async () => {
    if (!selectedGym?.id) return;
    setLoading(true);
    try {
      const res = await recipeAPI.list(selectedGym.id, selectedCategory);
      setRecipes(res.data);
    } catch (e) {
      console.error('Failed to load recipes:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (recipeId) => {
    try {
      const res = await recipeAPI.like(recipeId);
      setRecipes(prev => prev.map(r =>
        r.id === recipeId
          ? { ...r, likedByMe: res.data.liked, likesCount: r.likesCount + (res.data.liked ? 1 : -1) }
          : r
      ));
    } catch (e) {
      console.error('Like error:', e);
    }
  };

  const filtered = recipes.filter(r =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.author?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View className="flex-1 bg-background-dark">
      {/* Header */}
      <View className="bg-surface-dark px-6 pt-14 pb-3 border-b border-slate-700">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-3">
            <BookOpen size={26} color="#0df259" strokeWidth={2} />
            <Text className="text-white text-2xl font-bold">Recipes</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/recipes/create')}
            className="w-9 h-9 rounded-full bg-primary items-center justify-center"
          >
            <Plus size={20} color="#102216" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-slate-800 rounded-xl px-3 py-2 gap-2 mb-3">
          <Search size={16} color="#94a3b8" strokeWidth={2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search recipes..."
            placeholderTextColor="#64748b"
            className="flex-1 text-white text-sm"
          />
        </View>

        {/* Category chips — compact, inside header */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingBottom: 2 }}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full border ${
                selectedCategory === cat
                  ? 'bg-primary border-primary'
                  : 'bg-slate-800 border-slate-600'
              }`}
            >
              <Text className={`text-xs font-semibold ${
                selectedCategory === cat ? 'text-background-dark' : 'text-slate-400'
              }`}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0df259" />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <BookOpen size={56} color="#475569" strokeWidth={1.5} />
          <Text className="text-white text-xl font-bold mt-4">No Recipes Yet</Text>
          <Text className="text-slate-400 text-sm mt-2 text-center">
            Be the first to share a recipe with the gym!
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/recipes/create')}
            className="mt-6 bg-primary px-6 py-3 rounded-xl"
          >
            <Text className="text-background-dark font-bold">Add Recipe</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12 }}>
          {filtered.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              currentUserId={user?.id}
              onLike={() => handleLike(recipe.id)}
              onPress={() => router.push(`/recipes/${recipe.id}`)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function RecipeCard({ recipe, currentUserId, onLike, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-surface-dark rounded-2xl border border-slate-700 overflow-hidden active:bg-slate-800"
    >
      {recipe.imageUrl ? (
        <Image source={{ uri: recipe.imageUrl }} className="w-full h-44" resizeMode="cover" />
      ) : (
        <View className="w-full h-44 bg-slate-800 items-center justify-center">
          <BookOpen size={40} color="#475569" strokeWidth={1.5} />
        </View>
      )}

      <View className="p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-white font-bold text-lg" numberOfLines={1}>{recipe.title}</Text>
            <Text className="text-slate-400 text-sm mt-0.5">by {recipe.author?.name}</Text>
          </View>
          {recipe.category && (
            <View className="bg-primary/10 px-3 py-1 rounded-full border border-primary/30">
              <Text className="text-primary text-xs font-semibold">{recipe.category}</Text>
            </View>
          )}
        </View>

        {recipe.macros && (
          <View className="flex-row gap-3 mt-3">
            {recipe.macros.calories != null && (
              <MacroPill label="Cal" value={recipe.macros.calories} />
            )}
            {recipe.macros.protein != null && (
              <MacroPill label="Protein" value={`${recipe.macros.protein}g`} />
            )}
            {recipe.macros.carbs != null && (
              <MacroPill label="Carbs" value={`${recipe.macros.carbs}g`} />
            )}
            {recipe.macros.fat != null && (
              <MacroPill label="Fat" value={`${recipe.macros.fat}g`} />
            )}
          </View>
        )}

        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-700">
          <TouchableOpacity
            onPress={onLike}
            className="flex-row items-center gap-2"
          >
            <Heart
              size={18}
              color={recipe.likedByMe ? '#ef4444' : '#94a3b8'}
              fill={recipe.likedByMe ? '#ef4444' : 'none'}
              strokeWidth={2}
            />
            <Text className="text-slate-400 text-sm">{recipe.likesCount}</Text>
          </TouchableOpacity>
          <View className="flex-row items-center gap-1">
            <Text className="text-slate-500 text-xs">
              {recipe.ingredients?.length ?? 0} ingredients
            </Text>
            <ChevronRight size={14} color="#475569" strokeWidth={2} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MacroPill({ label, value }) {
  return (
    <View className="bg-slate-800 rounded-lg px-2 py-1">
      <Text className="text-slate-500 text-xs">{label}</Text>
      <Text className="text-white text-sm font-bold">{value}</Text>
    </View>
  );
}
