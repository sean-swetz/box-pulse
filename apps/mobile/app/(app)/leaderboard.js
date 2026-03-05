import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Trophy, Users, User, ChevronDown, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { gymAPI, leaderboardAPI } from '../../lib/api';

export default function LeaderboardScreen() {
  const [view, setView] = useState('individual');
  const [expandedTeams, setExpandedTeams] = useState([]);
  const [individualRankings, setIndividualRankings] = useState([]);
  const [teamRankings, setTeamRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, selectedGym } = useAuthStore();

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    if (!selectedGym?.id) return;
    try {
      const challengeRes = await gymAPI.getChallenges(selectedGym.id);
      const active = challengeRes.data.find(c => c.isActive);
      if (!active) { setLoading(false); return; }

      const [indRes, teamRes] = await Promise.all([
        leaderboardAPI.individual(active.id, selectedGym.id),
        leaderboardAPI.teams(active.id, selectedGym.id),
      ]);
      setIndividualRankings(indRes.data);
      setTeamRankings(teamRes.data);
    } catch (e) {
      console.error('Failed to load leaderboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleTeam = (teamId) => {
    setExpandedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const getRankColor = (rank) => {
    if (rank === 1) return 'bg-yellow-500';
    if (rank === 2) return 'bg-slate-300';
    if (rank === 3) return 'bg-orange-600';
    return 'bg-slate-700';
  };

  return (
    <View className="flex-1 bg-background-dark">
      {/* Header */}
      <View className="bg-surface-dark px-6 pt-16 pb-4 border-b border-slate-700">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-3">
            <Trophy size={32} color="#0df259" strokeWidth={2} />
            <Text className="text-white text-3xl font-bold">Leaderboard</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => router.push('/(app)/profile')}
            className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden"
          >
            {user?.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} className="w-full h-full" />
            ) : (
              <View className="w-full h-full items-center justify-center bg-primary/20">
                <User size={20} color="#0df259" strokeWidth={2} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Toggle View */}
        <View className="flex-row bg-slate-800 rounded-xl p-1 gap-1">
          <TouchableOpacity
            onPress={() => setView('individual')}
            className={`flex-1 py-3 rounded-lg flex-row items-center justify-center gap-2 ${
              view === 'individual' ? 'bg-primary' : ''
            }`}
          >
            <User size={18} color={view === 'individual' ? '#102216' : '#94a3b8'} strokeWidth={2} />
            <Text className={`font-bold ${view === 'individual' ? 'text-background-dark' : 'text-slate-400'}`}>
              Individual
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setView('team')}
            className={`flex-1 py-3 rounded-lg flex-row items-center justify-center gap-2 ${
              view === 'team' ? 'bg-primary' : ''
            }`}
          >
            <Users size={18} color={view === 'team' ? '#102216' : '#94a3b8'} strokeWidth={2} />
            <Text className={`font-bold ${view === 'team' ? 'text-background-dark' : 'text-slate-400'}`}>
              Teams
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1">
        {loading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#0df259" />
          </View>
        ) : individualRankings.length === 0 && teamRankings.length === 0 ? (
          <View className="items-center justify-center py-20 px-8">
            <Trophy size={56} color="#475569" strokeWidth={1.5} />
            <Text className="text-white text-xl font-bold mt-4">No Rankings Yet</Text>
            <Text className="text-slate-400 text-sm mt-2 text-center">
              Complete your weekly check-in to appear on the leaderboard
            </Text>
          </View>
        ) : view === 'individual' ? (
          <IndividualView rankings={individualRankings} currentUserId={user?.id} getRankColor={getRankColor} />
        ) : (
          <TeamView
            rankings={teamRankings}
            getRankColor={getRankColor}
            expandedTeams={expandedTeams}
            toggleTeam={toggleTeam}
            currentUserId={user?.id}
          />
        )}
      </ScrollView>
    </View>
  );
}

function IndividualView({ rankings, currentUserId, getRankColor }) {
  const handleProfileTap = (personId) => {
    // TODO: Navigate to user profile
    console.log('Navigate to profile:', personId);
  };

  return (
    <View className="py-4">
      <View className="gap-2">
        {rankings.map((person) => {
          const isCurrentUser = person.id === currentUserId;
          
          return (
            <TouchableOpacity
              key={person.id}
              onPress={() => handleProfileTap(person.id)}
              className={`px-6 py-4 border-l-4 active:bg-slate-800/50 ${
                isCurrentUser 
                  ? 'bg-primary/5 border-primary' 
                  : 'border-transparent'
              }`}
            >
              <View className="flex-row items-center gap-4">
                {/* Rank Badge */}
                <View className={`w-12 h-12 rounded-full items-center justify-center ${getRankColor(person.rank)}`}>
                  <Text className="text-white font-bold text-xl">{person.rank}</Text>
                </View>

                {/* Avatar */}
                <View className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden">
                  <View className="w-full h-full items-center justify-center bg-primary/20">
                    <Text className="text-primary text-lg font-bold">
                      {person.name.substring(0, 1)}
                    </Text>
                  </View>
                </View>

                {/* Info */}
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white font-bold text-base">{person.name}</Text>
                    {isCurrentUser && (
                      <View className="bg-primary/20 px-2 py-0.5 rounded">
                        <Text className="text-primary text-xs font-bold">YOU</Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-row items-center gap-2 mt-1">
                    <View 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: person.teamColor }}
                    />
                    <Text className="text-slate-400 text-sm">{person.team}</Text>
                  </View>
                </View>

                {/* Points */}
                <Text className="text-primary text-2xl font-bold">{person.points}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function TeamView({ rankings, getRankColor, expandedTeams, toggleTeam, currentUserId }) {
  const handleMemberTap = (memberId) => {
    console.log('Navigate to profile:', memberId);
  };

  return (
    <View className="px-6 py-4">
      <View className="gap-4">
        {rankings.map((team) => {
          const isExpanded = expandedTeams.includes(team.id);
          
          return (
            <View
              key={team.id}
              className="bg-primary/5 rounded-2xl border-2 border-primary/20 overflow-hidden"
            >
              {/* Team Header - Tappable */}
              <TouchableOpacity 
                onPress={() => toggleTeam(team.id)}
                className="p-6 active:bg-primary/10"
              >
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center gap-3 flex-1">
                    <View className={`w-12 h-12 rounded-full items-center justify-center ${getRankColor(team.rank)}`}>
                      <Text className="text-white font-bold text-xl">{team.rank}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-white text-xl font-bold">{team.name}</Text>
                      <Text className="text-slate-400 text-sm mt-0.5">{team.members} members</Text>
                    </View>
                  </View>
                  
                  <View className="pr-4">
                    {isExpanded ? (
                      <ChevronDown size={24} color="#0df259" strokeWidth={2} />
                    ) : (
                      <ChevronRight size={24} color="#0df259" strokeWidth={2} />
                    )}
                  </View>
                </View>

                {/* Stats */}
                <View className="flex-row gap-3">
                  <View className="flex-1 bg-primary/10 rounded-xl p-4 border border-primary/20">
                    <Text className="text-slate-400 text-xs uppercase mb-1">Total</Text>
                    <Text className="text-white text-2xl font-bold">{team.points}</Text>
                  </View>
                  <View className="flex-1 bg-primary/10 rounded-xl p-4 border border-primary/20">
                    <Text className="text-slate-400 text-xs uppercase mb-1">Average</Text>
                    <Text className="text-primary text-2xl font-bold">{team.avgPoints}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Expanded Members List */}
              {isExpanded && (
                <View className="border-t border-primary/20 px-6 py-4 bg-primary/10">
                  <Text className="text-slate-400 text-xs uppercase mb-3">Team Members</Text>
                  <View className="gap-2">
                    {team.memberList.map((member) => (
                      <TouchableOpacity
                        key={member.id}
                        onPress={() => handleMemberTap(member.id)}
                        className="flex-row items-center justify-between py-3 px-4 bg-surface-dark rounded-xl active:bg-slate-700 border border-slate-700"
                      >
                        <View className="flex-row items-center gap-3">
                          <View className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden">
                            <View className="w-full h-full items-center justify-center bg-primary/20">
                              <Text className="text-primary text-sm font-bold">
                                {member.name.substring(0, 1)}
                              </Text>
                            </View>
                          </View>
                          <View className="flex-row items-center gap-2">
                            <Text className="text-white font-semibold">{member.name}</Text>
                            {member.id === currentUserId && (
                              <View className="bg-primary/20 px-2 py-0.5 rounded">
                                <Text className="text-primary text-xs font-bold">YOU</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <Text className="text-primary font-bold">{member.points}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
