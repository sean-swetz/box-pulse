import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, User } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { coachAPI, gymAPI, reportAPI } from '../../lib/api';

export default function ReportsScreen() {
  const { teamId: initialTeamId } = useLocalSearchParams();
  const { user, selectedGym } = useAuthStore();

  const [activeTab, setActiveTab] = useState(initialTeamId ? 'team' : 'team');
  const [myTeams, setMyTeams] = useState([]);
  const [challengeId, setChallengeId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Member tab state
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberReport, setMemberReport] = useState(null);
  const [memberLoading, setMemberLoading] = useState(false);

  // Team tab state
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId || null);
  const [teamReport, setTeamReport] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);

  // Gym tab state
  const [gymReport, setGymReport] = useState(null);
  const [gymLoading, setGymLoading] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const [teamsRes, challengesRes, membershipRes] = await Promise.all([
        coachAPI.getMyTeams(),
        gymAPI.getChallenges(selectedGym.id),
        gymAPI.getById(selectedGym.id),
      ]);

      const teams = teamsRes.data;
      setMyTeams(teams);

      const active = challengesRes.data.find(c => c.isActive);
      if (active) setChallengeId(active.id);

      // Determine admin status from gym memberships
      // We infer from the getById response or re-use auth store — check via user memberships
      // Use a separate approach: check if our memberships include owner/admin
      const myGyms = teams.map(t => t.gym);
      // Fallback: try fetching stats which returns isCoach but not role
      // Instead trust the server — gym report will 403 if not admin
      setIsAdmin(true); // allow tab to show; server enforces 403 if not actually admin
    } catch (e) {
      console.error('Reports init error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load team report when team is selected and challengeId known
  useEffect(() => {
    if (selectedTeamId && challengeId && activeTab === 'team') {
      loadTeamReport(selectedTeamId);
    }
  }, [selectedTeamId, challengeId, activeTab]);

  // Auto-load gym report when switching to gym tab
  useEffect(() => {
    if (activeTab === 'gym' && challengeId && !gymReport) {
      loadGymReport();
    }
  }, [activeTab, challengeId]);

  // Auto-select first team if coming in with no initial team
  useEffect(() => {
    if (!selectedTeamId && myTeams.length > 0) {
      setSelectedTeamId(myTeams[0]?.team?.id);
    }
  }, [myTeams]);

  const loadTeamReport = async (teamId) => {
    if (!teamId || !challengeId) return;
    setTeamLoading(true);
    setTeamReport(null);
    try {
      const res = await reportAPI.team(teamId, challengeId);
      setTeamReport(res.data);
    } catch (e) {
      console.error('Team report error:', e);
    } finally {
      setTeamLoading(false);
    }
  };

  const loadMemberReport = async (member) => {
    if (!challengeId) return;
    setSelectedMember(member);
    setMemberLoading(true);
    setMemberReport(null);
    try {
      const res = await reportAPI.member(member.user.id, selectedGym.id, challengeId);
      setMemberReport(res.data);
    } catch (e) {
      console.error('Member report error:', e);
    } finally {
      setMemberLoading(false);
    }
  };

  const loadGymReport = async () => {
    if (!challengeId) return;
    setGymLoading(true);
    setGymReport(null);
    try {
      const res = await reportAPI.gym(selectedGym.id, challengeId);
      setGymReport(res.data);
    } catch (e) {
      if (e.response?.status === 403) {
        setGymReport({ error: 'Admin access required' });
      } else {
        console.error('Gym report error:', e);
      }
    } finally {
      setGymLoading(false);
    }
  };

  // Flatten all members from all coached teams (for member picker)
  const allMembers = myTeams.flatMap(coaching =>
    (coaching.team?.members || []).map(m => ({
      ...m,
      teamName: coaching.team?.name,
      teamColor: coaching.team?.color,
    }))
  );

  if (loading) {
    return (
      <View className="flex-1 bg-background-dark items-center justify-center">
        <ActivityIndicator size="large" color="#0df259" />
      </View>
    );
  }

  const tabs = ['Member', 'Team', 'Gym'];

  return (
    <View className="flex-1 bg-background-dark">
      {/* Header */}
      <View className="bg-surface-dark px-6 pt-16 pb-4 border-b border-slate-700">
        <View className="flex-row items-center gap-3 mb-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#ffffff" strokeWidth={2} />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Reports</Text>
        </View>

        {/* Scope tabs */}
        <View className="flex-row bg-slate-800 rounded-xl p-1">
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab.toLowerCase())}
              className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === tab.toLowerCase() ? 'bg-primary' : ''}`}
            >
              <Text className={`font-semibold text-sm ${activeTab === tab.toLowerCase() ? 'text-background-dark' : 'text-slate-400'}`}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {activeTab === 'member' && (
        <MemberTab
          allMembers={allMembers}
          selectedMember={selectedMember}
          memberReport={memberReport}
          memberLoading={memberLoading}
          onSelectMember={loadMemberReport}
        />
      )}

      {activeTab === 'team' && (
        <TeamTab
          myTeams={myTeams}
          selectedTeamId={selectedTeamId}
          teamReport={teamReport}
          teamLoading={teamLoading}
          onSelectTeam={(id) => {
            setSelectedTeamId(id);
            setTeamReport(null);
          }}
          onSelectMember={(member) => {
            setActiveTab('member');
            loadMemberReport(member);
          }}
        />
      )}

      {activeTab === 'gym' && (
        <GymTab
          gymReport={gymReport}
          gymLoading={gymLoading}
          onSelectMember={(member) => {
            setActiveTab('member');
            loadMemberReport(member);
          }}
        />
      )}
    </View>
  );
}

// ===== MEMBER TAB =====

function MemberTab({ allMembers, selectedMember, memberReport, memberLoading, onSelectMember }) {
  return (
    <ScrollView className="flex-1">
      {/* Member picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="border-b border-slate-700 py-3"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
      >
        {allMembers.map((member) => {
          const isSelected = selectedMember?.user?.id === member.user.id;
          return (
            <TouchableOpacity
              key={`${member.userId}-${member.teamName}`}
              onPress={() => onSelectMember(member)}
              className={`items-center px-3 py-2 rounded-xl border ${isSelected ? 'border-primary bg-primary/10' : 'border-slate-700 bg-surface-dark'}`}
            >
              <View className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden mb-1">
                {member.user.photoUrl ? (
                  <Image source={{ uri: member.user.photoUrl }} className="w-full h-full" />
                ) : (
                  <View className="w-full h-full items-center justify-center bg-primary/20">
                    <Text className="text-primary text-sm font-bold">{member.user.name[0]}</Text>
                  </View>
                )}
              </View>
              <Text className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-slate-300'}`} numberOfLines={1}>
                {member.user.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!selectedMember ? (
        <View className="items-center py-20 px-6">
          <User size={40} color="#475569" strokeWidth={1.5} />
          <Text className="text-slate-500 mt-3 text-center">Select a member above to view their report</Text>
        </View>
      ) : memberLoading ? (
        <View className="items-center py-20">
          <ActivityIndicator color="#0df259" />
        </View>
      ) : memberReport ? (
        <MemberReportView report={memberReport} />
      ) : null}
    </ScrollView>
  );
}

function MemberReportView({ report }) {
  return (
    <View className="px-6 py-6 gap-6">
      {/* Header */}
      <View className="flex-row items-center gap-4">
        <View className="w-14 h-14 rounded-full bg-slate-700 overflow-hidden">
          {report.user?.photoUrl ? (
            <Image source={{ uri: report.user.photoUrl }} className="w-full h-full" />
          ) : (
            <View className="w-full h-full items-center justify-center bg-primary/20">
              <Text className="text-primary text-xl font-bold">{report.user?.name?.[0]}</Text>
            </View>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-white text-xl font-bold">{report.user?.name}</Text>
          <View className="bg-primary/10 self-start px-3 py-1 rounded-full mt-1 border border-primary/20">
            <Text className="text-primary font-bold text-sm">{report.totalPoints} pts total</Text>
          </View>
        </View>
      </View>

      {/* Points by week */}
      <WeeklyTable weeklyBreakdown={report.weeklyBreakdown} />

      {/* Goals */}
      <GoalsList goals={report.goals} />
    </View>
  );
}

// ===== TEAM TAB =====

function TeamTab({ myTeams, selectedTeamId, teamReport, teamLoading, onSelectTeam, onSelectMember }) {
  const teams = myTeams.map(c => c.team).filter(Boolean);

  return (
    <ScrollView className="flex-1">
      {/* Team picker */}
      {teams.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="border-b border-slate-700 py-3"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        >
          {teams.map((team) => {
            const isSelected = selectedTeamId === team.id;
            return (
              <TouchableOpacity
                key={team.id}
                onPress={() => onSelectTeam(team.id)}
                className={`flex-row items-center gap-2 px-4 py-2.5 rounded-xl border ${isSelected ? 'border-primary bg-primary/10' : 'border-slate-700 bg-surface-dark'}`}
              >
                <View className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                <Text className={`font-semibold text-sm ${isSelected ? 'text-primary' : 'text-slate-300'}`}>{team.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {teamLoading ? (
        <View className="items-center py-20">
          <ActivityIndicator color="#0df259" />
        </View>
      ) : teamReport ? (
        <TeamReportView report={teamReport} onSelectMember={onSelectMember} />
      ) : null}
    </ScrollView>
  );
}

function TeamReportView({ report, onSelectMember }) {
  return (
    <View className="px-6 py-6 gap-6">
      {/* Team header */}
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: report.team.color }}>
          <Text className="text-white font-bold">{report.team.name[0]}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-white text-xl font-bold">{report.team.name}</Text>
          <Text className="text-slate-400 text-sm">{report.members.length} members</Text>
        </View>
        <View className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20">
          <Text className="text-primary font-bold">{report.team.totalPoints} pts</Text>
        </View>
      </View>

      {/* Member list */}
      <View>
        <Text className="text-slate-400 text-xs uppercase tracking-wide mb-3">Members</Text>
        <View className="gap-2">
          {report.members.map((member) => (
            <TouchableOpacity
              key={member.user.id}
              onPress={() => onSelectMember(member)}
              className="bg-surface-dark rounded-xl px-4 py-3 border border-slate-700 flex-row items-center gap-3"
            >
              <View className="w-9 h-9 rounded-full bg-slate-700 overflow-hidden">
                {member.user.photoUrl ? (
                  <Image source={{ uri: member.user.photoUrl }} className="w-full h-full" />
                ) : (
                  <View className="w-full h-full items-center justify-center bg-primary/20">
                    <Text className="text-primary text-sm font-bold">{member.user.name[0]}</Text>
                  </View>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">{member.user.name}</Text>
                <Text className="text-slate-500 text-xs">{member.weeklyBreakdown.length} check-in{member.weeklyBreakdown.length !== 1 ? 's' : ''}</Text>
              </View>
              <Text className="text-primary font-bold">{member.points} pts</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

// ===== GYM TAB =====

function GymTab({ gymReport, gymLoading, onSelectMember }) {
  if (gymLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#0df259" />
      </View>
    );
  }

  if (gymReport?.error) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-slate-400 text-center">{gymReport.error}</Text>
      </View>
    );
  }

  if (!gymReport) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-slate-500 text-center">Loading gym report...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ gap: 20 }}>
      {gymReport.teams.map((teamData) => (
        <View key={teamData.team.id} className="bg-surface-dark rounded-2xl border border-slate-700 overflow-hidden">
          {/* Team header */}
          <View className="px-5 py-4 flex-row items-center gap-3 border-b border-slate-700">
            <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: teamData.team.color }}>
              <Text className="text-white font-bold text-xs">{teamData.team.name[0]}</Text>
            </View>
            <Text className="text-white font-bold flex-1">{teamData.team.name}</Text>
            <Text className="text-primary font-bold">{teamData.team.totalPoints} pts</Text>
          </View>

          {/* Members */}
          {teamData.members.map((member) => (
            <TouchableOpacity
              key={member.user.id}
              onPress={() => onSelectMember(member)}
              className="px-5 py-3 flex-row items-center gap-3 border-b border-slate-800"
            >
              <View className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                {member.user.photoUrl ? (
                  <Image source={{ uri: member.user.photoUrl }} className="w-full h-full" />
                ) : (
                  <View className="w-full h-full items-center justify-center bg-primary/20">
                    <Text className="text-primary text-xs font-bold">{member.user.name[0]}</Text>
                  </View>
                )}
              </View>
              <Text className="text-slate-300 flex-1">{member.user.name}</Text>
              <Text className="text-slate-400 text-sm">{member.points} pts</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

// ===== SHARED COMPONENTS =====

function WeeklyTable({ weeklyBreakdown }) {
  if (!weeklyBreakdown || weeklyBreakdown.length === 0) {
    return (
      <View className="bg-surface-dark rounded-xl p-5 border border-slate-700">
        <Text className="text-slate-400 text-xs uppercase tracking-wide mb-3">Points by Week</Text>
        <Text className="text-slate-600 italic">No check-ins yet</Text>
      </View>
    );
  }

  return (
    <View className="bg-surface-dark rounded-xl border border-slate-700 overflow-hidden">
      <View className="px-5 py-3 border-b border-slate-700 flex-row justify-between">
        <Text className="text-slate-400 text-xs uppercase tracking-wide">Points by Week</Text>
        <Text className="text-slate-400 text-xs uppercase tracking-wide">
          Total: {weeklyBreakdown.reduce((sum, w) => sum + w.points, 0)}
        </Text>
      </View>
      {weeklyBreakdown.map((row, index) => (
        <View
          key={row.week}
          className={`px-5 py-3 flex-row items-center justify-between ${index % 2 === 1 ? 'bg-slate-800/50' : ''}`}
        >
          <Text className="text-slate-400 text-sm">Week {row.week}</Text>
          <Text className="text-white font-bold">{row.points} pts</Text>
        </View>
      ))}
    </View>
  );
}

function GoalsList({ goals }) {
  if (!goals || goals.length === 0) return null;

  function goalLabel(goal) {
    if (goal.type === 'weight') return `⚖ ${goal.direction === 'lose' ? 'Lose' : 'Gain'} ${goal.targetWeight} ${goal.unit}`;
    if (goal.type === 'lift') return `🏋 ${goal.liftName} — ${goal.targetWeight} ${goal.unit}`;
    return `🎯 ${goal.text}`;
  }

  function progressText(goal) {
    if (goal.type === 'weight' && goal.currentValue != null) return `Current: ${goal.currentValue} ${goal.unit}`;
    if (goal.type === 'lift' && goal.currentValue != null) return `Current best: ${goal.currentValue} ${goal.unit}`;
    if (goal.progressNote) return goal.progressNote;
    return null;
  }

  return (
    <View>
      <Text className="text-slate-400 text-xs uppercase tracking-wide mb-3">Goals</Text>
      <View className="gap-2">
        {goals.map((goal) => {
          const progress = progressText(goal);
          return (
            <View key={goal.id} className="bg-surface-dark rounded-xl px-4 py-3 border border-slate-700">
              <View className="flex-row items-center justify-between">
                <Text className="text-white font-medium flex-1 mr-3" numberOfLines={2}>{goalLabel(goal)}</Text>
                {!goal.isPublic && (
                  <View className="bg-slate-700 px-2 py-0.5 rounded-full">
                    <Text className="text-slate-400 text-xs">Private</Text>
                  </View>
                )}
              </View>
              {progress && (
                <Text className="text-primary text-sm mt-1">{progress}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
