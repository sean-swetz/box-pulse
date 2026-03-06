import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft, CheckCircle2, Clock, Users, Trophy,
  AlertCircle,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { adminAPI, gymAPI } from '../../lib/api';

const TABS = ['All', 'Submitted', 'Missing'];

export default function CheckinStatusScreen() {
  const { selectedGym } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('All');
  const [challengeId, setChallengeId] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!selectedGym?.id) return;
    if (isRefresh) setRefreshing(true);
    try {
      // Resolve active challenge if we don't have it yet
      let cId = challengeId;
      if (!cId) {
        const challengesRes = await gymAPI.getChallenges(selectedGym.id);
        const active = challengesRes.data?.find(c => c.isActive);
        if (!active) {
          setData(null);
          return;
        }
        cId = active.id;
        setChallengeId(cId);
      }

      const res = await adminAPI.getCheckinStatus(selectedGym.id, cId);
      setData(res.data);
    } catch (e) {
      console.error('Failed to load check-in status:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedGym?.id, challengeId]);

  useEffect(() => { load(); }, [load]);

  const filteredMembers = () => {
    if (!data?.members) return [];
    const sorted = [...data.members].sort((a, b) => {
      // Submitted first, then by score desc; missing alphabetical
      if (a.hasCheckedIn !== b.hasCheckedIn) return a.hasCheckedIn ? -1 : 1;
      if (a.hasCheckedIn) return (b.checkinScore ?? 0) - (a.checkinScore ?? 0);
      return a.name.localeCompare(b.name);
    });
    if (tab === 'Submitted') return sorted.filter(m => m.hasCheckedIn);
    if (tab === 'Missing') return sorted.filter(m => !m.hasCheckedIn);
    return sorted;
  };

  const pct = data ? Math.round((data.summary.submitted / Math.max(data.summary.total, 1)) * 100) : 0;

  return (
    <View className="flex-1 bg-background-dark">
      {/* Header */}
      <View className="bg-surface-dark px-6 pt-16 pb-5 border-b border-slate-700">
        <View className="flex-row items-center gap-3 mb-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1 -ml-1">
            <ArrowLeft size={24} color="#94a3b8" strokeWidth={2} />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold flex-1">Check-in Status</Text>
          {data && (
            <WindowBadge isOpen={data.windowState.isOpen} />
          )}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0df259" size="large" />
        </View>
      ) : !data ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <AlertCircle size={40} color="#475569" strokeWidth={1.5} />
          <Text className="text-white text-xl font-bold text-center">No Active Challenge</Text>
          <Text className="text-slate-500 text-center text-sm">
            Create and activate a challenge to track check-in status.
          </Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#0df259" />
          }
        >
          {/* Summary card */}
          <View className="mx-6 mt-5 bg-surface-dark rounded-2xl p-5 border border-slate-700">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-slate-400 text-xs uppercase tracking-wide mb-1">This Window</Text>
                <View className="flex-row items-end gap-1">
                  <Text className="text-white text-4xl font-bold">{data.summary.submitted}</Text>
                  <Text className="text-slate-500 text-xl mb-1">/ {data.summary.total}</Text>
                </View>
                <Text className="text-slate-400 text-sm mt-0.5">members checked in</Text>
              </View>
              <View className="items-center">
                <Text className="text-primary text-3xl font-bold">{pct}%</Text>
                <Text className="text-slate-500 text-xs">completion</Text>
              </View>
            </View>

            {/* Progress bar */}
            <View className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${pct}%` }}
              />
            </View>

            {/* Counts row */}
            <View className="flex-row gap-3 mt-4">
              <View className="flex-1 flex-row items-center gap-2">
                <CheckCircle2 size={16} color="#0df259" strokeWidth={2} />
                <Text className="text-white font-semibold">{data.summary.submitted} submitted</Text>
              </View>
              <View className="flex-1 flex-row items-center gap-2">
                <Clock size={16} color="#f59e0b" strokeWidth={2} />
                <Text className="text-slate-400 font-semibold">{data.summary.missing} missing</Text>
              </View>
            </View>

            {data.windowState.lastOpened && (
              <Text className="text-slate-600 text-xs mt-3">
                Window opened {formatRelative(data.windowState.lastOpened)}
              </Text>
            )}
          </View>

          {/* Filter tabs */}
          <View className="flex-row mx-6 mt-5 bg-slate-800 rounded-xl p-1 gap-1">
            {TABS.map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-lg items-center ${tab === t ? 'bg-surface-dark' : ''}`}
              >
                <Text className={`text-sm font-semibold ${tab === t ? 'text-white' : 'text-slate-500'}`}>
                  {t}
                  {t === 'Submitted' && ` (${data.summary.submitted})`}
                  {t === 'Missing' && ` (${data.summary.missing})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Member list */}
          <View className="mx-6 mt-4 mb-8 gap-2">
            {filteredMembers().length === 0 ? (
              <View className="items-center py-10">
                <Users size={32} color="#475569" strokeWidth={1.5} />
                <Text className="text-slate-500 mt-3">
                  {tab === 'Missing' ? 'Everyone has checked in!' : 'No members yet'}
                </Text>
              </View>
            ) : (
              filteredMembers().map(member => (
                <MemberRow key={member.id} member={member} />
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function MemberRow({ member }) {
  const initials = member.name
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View className="bg-surface-dark rounded-xl px-4 py-3.5 border border-slate-700 flex-row items-center gap-3">
      {/* Avatar */}
      <View className="w-10 h-10 rounded-full bg-slate-700 items-center justify-center">
        <Text className="text-white text-sm font-bold">{initials}</Text>
      </View>

      {/* Name + team */}
      <View className="flex-1 min-w-0">
        <Text className="text-white font-semibold" numberOfLines={1}>{member.name}</Text>
        {member.team ? (
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: member.team.color ?? '#64748b' }}
            />
            <Text className="text-slate-500 text-xs" numberOfLines={1}>{member.team.name}</Text>
          </View>
        ) : (
          <Text className="text-slate-600 text-xs mt-0.5">No team</Text>
        )}
      </View>

      {/* Status */}
      {member.hasCheckedIn ? (
        <View className="items-end gap-1">
          <View className="flex-row items-center gap-1.5">
            <CheckCircle2 size={16} color="#0df259" strokeWidth={2.5} />
            <Text className="text-primary font-bold text-sm">Done</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Trophy size={11} color="#64748b" strokeWidth={2} />
            <Text className="text-slate-500 text-xs">{member.checkinScore} pts</Text>
          </View>
        </View>
      ) : (
        <View className="flex-row items-center gap-1.5">
          <Clock size={16} color="#f59e0b" strokeWidth={2} />
          <Text className="text-amber-400 font-semibold text-sm">Missing</Text>
        </View>
      )}
    </View>
  );
}

function WindowBadge({ isOpen }) {
  return (
    <View
      className={`px-3 py-1.5 rounded-full flex-row items-center gap-1.5 ${
        isOpen ? 'bg-primary/10 border border-primary/30' : 'bg-slate-700/50 border border-slate-600'
      }`}
    >
      <View
        className={`w-2 h-2 rounded-full ${isOpen ? 'bg-primary' : 'bg-slate-500'}`}
      />
      <Text
        className={`text-xs font-bold ${isOpen ? 'text-primary' : 'text-slate-400'}`}
      >
        {isOpen ? 'OPEN' : 'CLOSED'}
      </Text>
    </View>
  );
}

function formatRelative(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
