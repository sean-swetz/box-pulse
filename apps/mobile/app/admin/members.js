import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, ChevronRight, X } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { adminAPI, teamAPI } from '../../lib/api';

export default function MembersAdmin() {
  const { selectedGym } = useAuthStore();
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [activeTab, setActiveTab] = useState('team'); // 'team' | 'points'
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [pointsForm, setPointsForm] = useState({ amount: '', reason: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [membersRes, teamsRes] = await Promise.all([
        adminAPI.getMembers(selectedGym.id),
        teamAPI.getByGym(selectedGym.id),
      ]);
      setMembers(membersRes.data);
      setTeams(teamsRes.data);
    } catch (e) {
      console.error('Fetch members error:', e);
    } finally {
      setLoading(false);
    }
  };

  const openMemberModal = (member) => {
    setSelectedMember(member);
    setSelectedTeamId(member.teams?.[0]?.id ?? '');
    setActiveTab('team');
    setPointsForm({ amount: '', reason: '' });
  };

  const handleAssignTeam = async () => {
    setSaving(true);
    try {
      await adminAPI.assignTeam(selectedMember.id, selectedGym.id, selectedTeamId || null);
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id !== selectedMember.id) return m;
          const team = teams.find((t) => t.id === selectedTeamId);
          return { ...m, teams: team ? [{ id: team.id, name: team.name, color: team.color }] : [] };
        })
      );
      Alert.alert('Saved', 'Team assignment updated');
      setSelectedMember(null);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to assign team');
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustPoints = async () => {
    const pts = parseInt(pointsForm.amount);
    if (isNaN(pts) || !pointsForm.reason.trim()) {
      Alert.alert('Required', 'Enter a valid point amount and reason');
      return;
    }
    setSaving(true);
    try {
      await adminAPI.adjustPoints({
        userId: selectedMember.id,
        gymId: selectedGym.id,
        points: pts,
        reason: pointsForm.reason,
      });
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id
            ? { ...m, adjustedPoints: (m.adjustedPoints || 0) + pts }
            : m
        )
      );
      Alert.alert('Applied', `${pts >= 0 ? '+' : ''}${pts} points applied`);
      setSelectedMember(null);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to adjust points');
    } finally {
      setSaving(false);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View className="flex-1 bg-background-dark items-center justify-center">
        <ActivityIndicator size="large" color="#0df259" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-dark">
      {/* Header */}
      <View className="bg-surface-dark px-6 pt-16 pb-4 border-b border-slate-700">
        <View className="flex-row items-center gap-3 mb-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#ffffff" strokeWidth={2} />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Members</Text>
          <Text className="text-slate-500 text-base ml-auto">{members.length}</Text>
        </View>
        <View className="flex-row items-center bg-slate-800 rounded-xl px-4 py-3 gap-3">
          <Search size={18} color="#94a3b8" strokeWidth={2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or email…"
            placeholderTextColor="#64748b"
            className="flex-1 text-white"
          />
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="py-2">
          {filteredMembers.map((member) => (
            <TouchableOpacity
              key={member.id}
              onPress={() => openMemberModal(member)}
              className="px-6 py-4 border-b border-slate-800 active:bg-slate-800/50"
            >
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
                  <Text className="text-primary font-bold text-base">
                    {member.name.substring(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 flex-wrap">
                    <Text className="text-white font-semibold">{member.name}</Text>
                    {member.role !== 'member' && (
                      <View className="bg-primary/20 px-1.5 py-0.5 rounded">
                        <Text className="text-primary text-xs capitalize">{member.role}</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-slate-500 text-xs mt-0.5">{member.email}</Text>
                  <View className="flex-row items-center gap-3 mt-1 flex-wrap">
                    {member.teams?.length > 0 ? (
                      <View className="flex-row items-center gap-1">
                        <View
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: member.teams[0].color }}
                        />
                        <Text className="text-slate-400 text-xs">{member.teams[0].name}</Text>
                      </View>
                    ) : (
                      <Text className="text-slate-600 text-xs">No team</Text>
                    )}
                    {member.adjustedPoints !== 0 && (
                      <Text
                        className={`text-xs font-semibold ${
                          member.adjustedPoints > 0 ? 'text-primary' : 'text-red-400'
                        }`}
                      >
                        {member.adjustedPoints > 0 ? '+' : ''}{member.adjustedPoints} adj
                      </Text>
                    )}
                  </View>
                </View>
                <ChevronRight size={18} color="#475569" strokeWidth={2} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Member Action Modal */}
      <Modal visible={!!selectedMember} animationType="slide" transparent>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-surface-dark rounded-t-3xl px-6 pt-6 pb-12">
            <View className="flex-row items-center justify-between mb-5">
              <View>
                <Text className="text-white text-xl font-bold">{selectedMember?.name}</Text>
                <Text className="text-slate-400 text-sm">{selectedMember?.email}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedMember(null)}>
                <X size={24} color="#94a3b8" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Tab Switcher */}
            <View className="flex-row bg-slate-800 rounded-xl p-1 mb-5">
              {['team', 'points'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-lg items-center ${activeTab === tab ? 'bg-primary' : ''}`}
                >
                  <Text
                    className={`font-semibold text-sm ${activeTab === tab ? 'text-background-dark' : 'text-slate-400'}`}
                  >
                    {tab === 'team' ? 'Assign Team' : 'Adjust Points'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeTab === 'team' ? (
              <>
                <View className="gap-2 mb-5">
                  {/* No-team option */}
                  <TouchableOpacity
                    onPress={() => setSelectedTeamId('')}
                    className={`flex-row items-center gap-3 px-4 py-3 rounded-xl border ${
                      !selectedTeamId ? 'border-primary bg-primary/10' : 'border-slate-700 bg-slate-800'
                    }`}
                  >
                    <View className="w-5 h-5 rounded-full border-2 border-slate-500 items-center justify-center">
                      {!selectedTeamId && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </View>
                    <Text className="text-slate-300">No team</Text>
                  </TouchableOpacity>

                  {teams.map((team) => (
                    <TouchableOpacity
                      key={team.id}
                      onPress={() => setSelectedTeamId(team.id)}
                      className={`flex-row items-center gap-3 px-4 py-3 rounded-xl border ${
                        selectedTeamId === team.id
                          ? 'border-primary bg-primary/10'
                          : 'border-slate-700 bg-slate-800'
                      }`}
                    >
                      <View className="w-5 h-5 rounded-full border-2 border-slate-500 items-center justify-center">
                        {selectedTeamId === team.id && (
                          <View className="w-2.5 h-2.5 rounded-full bg-primary" />
                        )}
                      </View>
                      <View className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }} />
                      <Text className="text-white flex-1">{team.name}</Text>
                      <Text className="text-slate-500 text-xs">
                        {team.members?.length ?? 0} members
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={handleAssignTeam}
                  disabled={saving}
                  className="bg-primary py-4 rounded-xl items-center"
                >
                  {saving ? (
                    <ActivityIndicator color="#102216" />
                  ) : (
                    <Text className="text-background-dark font-bold text-base">Save Assignment</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text className="text-slate-500 text-sm mb-3">
                  Current adjustment:{' '}
                  <Text className={selectedMember?.adjustedPoints >= 0 ? 'text-primary' : 'text-red-400'}>
                    {selectedMember?.adjustedPoints >= 0 ? '+' : ''}
                    {selectedMember?.adjustedPoints ?? 0} pts
                  </Text>
                </Text>

                <Text className="text-slate-400 text-sm mb-1">Point Adjustment *</Text>
                <TextInput
                  value={pointsForm.amount}
                  onChangeText={(v) => setPointsForm((f) => ({ ...f, amount: v }))}
                  placeholder="e.g. 10 or -5"
                  placeholderTextColor="#64748b"
                  keyboardType="numbers-and-punctuation"
                  className="bg-slate-800 text-white px-4 py-3 rounded-xl mb-4"
                />

                <Text className="text-slate-400 text-sm mb-1">Reason *</Text>
                <TextInput
                  value={pointsForm.reason}
                  onChangeText={(v) => setPointsForm((f) => ({ ...f, reason: v }))}
                  placeholder="e.g. Bonus for challenge completion"
                  placeholderTextColor="#64748b"
                  className="bg-slate-800 text-white px-4 py-3 rounded-xl mb-5"
                />

                <TouchableOpacity
                  onPress={handleAdjustPoints}
                  disabled={saving}
                  className="bg-primary py-4 rounded-xl items-center"
                >
                  {saving ? (
                    <ActivityIndicator color="#102216" />
                  ) : (
                    <Text className="text-background-dark font-bold text-base">Apply Adjustment</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
