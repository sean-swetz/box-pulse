import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, UserPlus, Trash2, Search } from 'lucide-react-native';
import { useAuthStore } from '../../../store/authStore';
import { teamAPI, adminAPI } from '../../../lib/api';

export default function AdminTeamDetail() {
  const { id } = useLocalSearchParams();
  const { selectedGym } = useAuthStore();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [allMembers, setAllMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [removing, setRemoving] = useState(null);
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    fetchTeam();
  }, [id]);

  const fetchTeam = async () => {
    try {
      const res = await teamAPI.getById(id);
      setTeam(res.data);
    } catch (e) {
      console.error('Fetch team error:', e);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = async () => {
    setShowAddModal(true);
    setSearch('');
    setMembersLoading(true);
    try {
      const res = await adminAPI.getMembers(selectedGym.id);
      setAllMembers(res.data);
    } catch (e) {
      console.error('Fetch members error:', e);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleRemoveMember = (userId, name) => {
    Alert.alert(
      'Remove Member',
      `Remove ${name} from ${team.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemoving(userId);
            try {
              await teamAPI.removeMember(id, userId);
              setTeam((prev) => ({
                ...prev,
                members: prev.members.filter((m) => m.userId !== userId),
              }));
            } catch (e) {
              Alert.alert('Error', e.response?.data?.error || 'Failed to remove member');
            } finally {
              setRemoving(null);
            }
          },
        },
      ]
    );
  };

  const handleAddMember = async (userId) => {
    setAdding(userId);
    try {
      await teamAPI.addMember(id, userId);
      const teamRes = await teamAPI.getById(id);
      setTeam(teamRes.data);
      setShowAddModal(false);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to add member');
    } finally {
      setAdding(null);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background-dark items-center justify-center">
        <ActivityIndicator size="large" color="#0df259" />
      </View>
    );
  }

  if (!team) {
    return (
      <View className="flex-1 bg-background-dark items-center justify-center">
        <Text className="text-slate-400">Team not found</Text>
      </View>
    );
  }

  const currentMemberIds = new Set(team.members?.map((m) => m.userId) ?? []);
  const sortedMembers = [...(team.members || [])].sort((a, b) => b.points - a.points);
  const availableMembers = allMembers.filter(
    (m) =>
      !currentMemberIds.has(m.id) &&
      m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View className="flex-1 bg-background-dark">
      {/* Header */}
      <View className="px-6 pt-16 pb-6" style={{ backgroundColor: team.color || '#0df259' }}>
        <TouchableOpacity onPress={() => router.back()} className="mb-4 flex-row items-center">
          <ArrowLeft size={20} color="#ffffff" strokeWidth={2} />
          <Text className="text-white font-bold ml-2">Back</Text>
        </TouchableOpacity>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-3xl font-bold">{team.name}</Text>
            <Text className="text-white/80 mt-1">{team.members?.length ?? 0} members</Text>
          </View>
          <TouchableOpacity
            onPress={openAddModal}
            className="bg-white/20 px-4 py-3 rounded-xl flex-row items-center gap-2"
          >
            <UserPlus size={18} color="#ffffff" strokeWidth={2} />
            <Text className="text-white font-bold">Add Member</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {sortedMembers.length === 0 ? (
          <View className="items-center py-16">
            <Text className="text-slate-500 mb-4">No members on this team yet</Text>
            <TouchableOpacity onPress={openAddModal} className="bg-primary px-6 py-3 rounded-xl">
              <Text className="text-background-dark font-bold">Add First Member</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-3">
            {sortedMembers.map((member, index) => (
              <MemberRow
                key={member.userId}
                member={member}
                rank={index + 1}
                onRemove={() => handleRemoveMember(member.userId, member.user?.name)}
                removing={removing === member.userId}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Member Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-surface-dark rounded-t-3xl px-6 pt-6 pb-12" style={{ maxHeight: '80%' }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white text-xl font-bold">Add Member</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text className="text-slate-400 text-base">Cancel</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center bg-slate-800 rounded-xl px-4 py-3 gap-3 mb-4">
              <Search size={16} color="#94a3b8" strokeWidth={2} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search members..."
                placeholderTextColor="#64748b"
                className="flex-1 text-white"
              />
            </View>

            {membersLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator color="#0df259" />
              </View>
            ) : availableMembers.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-slate-500">
                  {search ? 'No matching members' : 'All gym members are already on this team'}
                </Text>
              </View>
            ) : (
              <ScrollView>
                <View className="gap-2">
                  {availableMembers.map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      onPress={() => handleAddMember(member.id)}
                      disabled={!!adding}
                      className="flex-row items-center gap-4 bg-slate-800 rounded-xl px-4 py-3"
                    >
                      <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
                        <Text className="text-primary font-bold text-base">
                          {member.name[0].toUpperCase()}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-semibold">{member.name}</Text>
                        {member.teams?.length > 0 ? (
                          <Text className="text-slate-500 text-xs">
                            Currently on: {member.teams[0].name}
                          </Text>
                        ) : (
                          <Text className="text-slate-600 text-xs">No team</Text>
                        )}
                      </View>
                      {adding === member.id ? (
                        <ActivityIndicator size="small" color="#0df259" />
                      ) : (
                        <UserPlus size={18} color="#0df259" strokeWidth={2} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MemberRow({ member, rank, onRemove, removing }) {
  const getRankBg = () => {
    if (rank === 1) return 'bg-yellow-500';
    if (rank === 2) return 'bg-slate-300';
    if (rank === 3) return 'bg-orange-600';
    return 'bg-slate-700';
  };

  return (
    <View className="bg-surface-dark rounded-xl p-4 flex-row items-center border border-slate-700">
      <View className={`w-8 h-8 rounded-full items-center justify-center ${getRankBg()} mr-3`}>
        <Text className="text-white font-bold text-sm">{rank}</Text>
      </View>

      <View className="w-12 h-12 rounded-full overflow-hidden mr-3 bg-slate-700">
        {member.user?.photoUrl ? (
          <Image source={{ uri: member.user.photoUrl }} className="w-full h-full" />
        ) : (
          <View className="w-full h-full items-center justify-center bg-primary/20">
            <Text className="text-primary text-lg font-bold">
              {member.user?.name?.[0] ?? '?'}
            </Text>
          </View>
        )}
      </View>

      <View className="flex-1">
        <Text className="text-white font-bold text-base">{member.user?.name}</Text>
        <Text className="text-slate-400 text-sm">{member.user?.email}</Text>
      </View>

      <View className="items-end mr-4">
        <Text className="text-primary text-xl font-bold">{member.points}</Text>
        <Text className="text-slate-500 text-xs">pts</Text>
      </View>

      <TouchableOpacity onPress={onRemove} disabled={removing} className="p-2">
        {removing ? (
          <ActivityIndicator size="small" color="#ef4444" />
        ) : (
          <Trash2 size={18} color="#ef4444" strokeWidth={2} />
        )}
      </TouchableOpacity>
    </View>
  );
}
