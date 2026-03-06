import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, CheckSquare, ChevronDown, ChevronUp,
  Calendar, Trophy, ClipboardList,
} from 'lucide-react-native';
import { checkinAPI } from '../../lib/api';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CheckinHistoryScreen() {
  const { challengeId } = useLocalSearchParams();
  const [checkins, setCheckins] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [challengeName, setChallengeName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedIds, setExpandedIds] = useState({});

  const load = useCallback(async (isRefresh = false) => {
    if (!challengeId) return;
    if (isRefresh) setRefreshing(true);
    try {
      const res = await checkinAPI.getHistory(challengeId);
      setCheckins(res.data.checkins);
      setCriteria(res.data.criteria);
      setChallengeName(res.data.challengeName);
    } catch (e) {
      console.error('Failed to load check-in history:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [challengeId]);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = (id) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background-dark items-center justify-center">
        <ActivityIndicator color="#0df259" size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background-dark"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#0df259" />
      }
    >
      {/* Header */}
      <View className="bg-surface-dark px-6 pt-16 pb-5 border-b border-slate-700">
        <View className="flex-row items-center gap-3 mb-1">
          <TouchableOpacity onPress={() => router.back()} className="p-1 -ml-1">
            <ArrowLeft size={24} color="#94a3b8" strokeWidth={2} />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Check-in History</Text>
        </View>
        {challengeName ? (
          <Text className="text-slate-400 text-sm ml-9">{challengeName}</Text>
        ) : null}
      </View>

      <View className="px-6 py-5">
        {checkins.length === 0 ? (
          <EmptyState />
        ) : (
          <View className="gap-3">
            {checkins.map((checkin, idx) => (
              <CheckinCard
                key={checkin.id}
                checkin={checkin}
                criteria={criteria}
                isExpanded={!!expandedIds[checkin.id]}
                onToggle={() => toggleExpand(checkin.id)}
                weekNumber={checkins.length - idx}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function CheckinCard({ checkin, criteria, isExpanded, onToggle, weekNumber }) {
  const date = new Date(checkin.createdAt);

  return (
    <View className="bg-surface-dark rounded-2xl border border-slate-700 overflow-hidden">
      {/* Card header — always visible */}
      <TouchableOpacity onPress={onToggle} className="px-5 py-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 bg-primary/10 rounded-xl items-center justify-center border border-primary/20">
              <CheckSquare size={20} color="#0df259" strokeWidth={2} />
            </View>
            <View>
              <Text className="text-white font-bold text-base">Week {weekNumber}</Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <Calendar size={12} color="#64748b" strokeWidth={2} />
                <Text className="text-slate-500 text-xs">{formatDate(date)}</Text>
              </View>
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            <View className="items-end">
              <View className="flex-row items-center gap-1">
                <Trophy size={14} color="#0df259" strokeWidth={2} />
                <Text className="text-primary font-bold text-lg">
                  {checkin.weeklyScore.toLocaleString()}
                </Text>
              </View>
              <Text className="text-slate-500 text-xs">pts</Text>
            </View>
            {isExpanded ? (
              <ChevronUp size={18} color="#64748b" strokeWidth={2} />
            ) : (
              <ChevronDown size={18} color="#64748b" strokeWidth={2} />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded breakdown */}
      {isExpanded && (
        <View className="border-t border-slate-700 px-5 py-4 gap-4">
          {criteria.map(c => (
            <CriterionBreakdown
              key={c.id}
              criterion={c}
              value={checkin.criteriaData?.[c.id]}
            />
          ))}
          {criteria.length === 0 && (
            <Text className="text-slate-500 text-sm text-center py-2">No criteria data</Text>
          )}
        </View>
      )}
    </View>
  );
}

function CriterionBreakdown({ criterion, value }) {
  const { name, type, points, maxCount } = criterion;

  return (
    <View>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-white font-medium text-sm flex-1 mr-4">{name}</Text>
        <PointsBadge criterion={criterion} value={value} />
      </View>

      {type === 'daily' && Array.isArray(value) && (
        <View className="flex-row gap-1.5">
          {DAY_LABELS.map((day, i) => (
            <View key={day} className="items-center gap-1">
              <View
                className={`w-8 h-8 rounded-lg items-center justify-center ${
                  value[i] ? 'bg-primary/20 border border-primary/40' : 'bg-slate-800 border border-slate-700'
                }`}
              >
                <Text className={`text-xs font-bold ${value[i] ? 'text-primary' : 'text-slate-600'}`}>
                  {value[i] ? '✓' : '·'}
                </Text>
              </View>
              <Text className="text-slate-600 text-xs">{day}</Text>
            </View>
          ))}
        </View>
      )}

      {type === 'daily' && !Array.isArray(value) && (
        <Text className="text-slate-600 text-sm">Not recorded</Text>
      )}

      {type === 'weekly' && (
        <View className="flex-row items-center gap-2">
          <View
            className={`w-7 h-7 rounded-lg items-center justify-center ${
              value === true ? 'bg-primary/20 border border-primary/40' : 'bg-slate-800 border border-slate-700'
            }`}
          >
            <Text className={value === true ? 'text-primary' : 'text-slate-600'}>
              {value === true ? '✓' : '✗'}
            </Text>
          </View>
          <Text className={`text-sm ${value === true ? 'text-white' : 'text-slate-500'}`}>
            {value === true ? 'Completed' : 'Not completed'}
          </Text>
        </View>
      )}

      {type === 'counter' && (
        <View className="flex-row items-center gap-2">
          <View className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
            <Text className="text-white font-bold">
              {typeof value === 'number' ? value : 0}
              {maxCount != null ? ` / ${maxCount}` : ''}
            </Text>
          </View>
          <Text className="text-slate-500 text-sm">× {points} pts each</Text>
        </View>
      )}
    </View>
  );
}

function PointsBadge({ criterion, value }) {
  const { type, points, maxCount } = criterion;
  let earned = 0;

  if (type === 'daily' && Array.isArray(value)) {
    earned = value.filter(Boolean).length * points;
  } else if (type === 'weekly' && value === true) {
    earned = points;
  } else if (type === 'counter' && typeof value === 'number') {
    const capped = maxCount != null ? Math.min(value, maxCount) : value;
    earned = Math.max(0, capped) * points;
  }

  return (
    <View className={`px-2.5 py-1 rounded-lg ${earned > 0 ? 'bg-primary/10' : 'bg-slate-800'}`}>
      <Text className={`text-xs font-bold ${earned > 0 ? 'text-primary' : 'text-slate-500'}`}>
        {earned > 0 ? `+${earned}` : '0'} pts
      </Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View className="items-center py-16 gap-4">
      <View className="w-20 h-20 bg-slate-800 rounded-2xl items-center justify-center border border-slate-700">
        <ClipboardList size={36} color="#475569" strokeWidth={1.5} />
      </View>
      <Text className="text-white text-xl font-bold">No check-ins yet</Text>
      <Text className="text-slate-500 text-center text-sm px-8">
        Your weekly check-in submissions will appear here.
      </Text>
    </View>
  );
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
