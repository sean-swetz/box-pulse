import { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Modal, FlatList } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Users, User, Edit3, Search, X, ShieldCheck } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { messageAPI, conversationAPI, gymAPI, userAPI } from '../../lib/api';

export default function ChatScreen() {
  const { user, selectedGym } = useAuthStore();
  const [groupChats, setGroupChats] = useState([]);
  const [dms, setDms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [selectedGym?.id])
  );

  const loadChats = async () => {
    if (!selectedGym?.id) return;
    setLoading(true);
    try {
      const [lockerRes, dmRes, statsRes] = await Promise.allSettled([
        messageAPI.getLockerRoom(selectedGym.id),
        conversationAPI.list(selectedGym.id),
        userAPI.getStats(selectedGym.id),
      ]);

      const groups = [];

      // Locker Room
      const lockerMsgs = lockerRes.status === 'fulfilled' ? lockerRes.value.data : [];
      const lastLocker = lockerMsgs[lockerMsgs.length - 1];
      groups.push({
        id: selectedGym.id,
        type: 'locker-room',
        name: `${selectedGym.name} Locker Room`,
        lastMessage: lastLocker?.text ?? (lastLocker?.gifUrl ? 'GIF' : 'No messages yet'),
        lastMessageAt: lastLocker?.createdAt ?? null,
        unreadCount: 0,
      });

      // Team chat (if user is on a team)
      const team = statsRes.status === 'fulfilled' ? statsRes.value.data.team : null;
      if (team) {
        const teamMsgsRes = await messageAPI.getTeam(team.id).catch(() => null);
        const teamMsgs = teamMsgsRes?.data ?? [];
        const lastTeam = teamMsgs[teamMsgs.length - 1];
        groups.push({
          id: team.id,
          type: 'team',
          name: `${team.name} Chat`,
          color: team.color,
          lastMessage: lastTeam?.text ?? (lastTeam?.gifUrl ? 'GIF' : 'No messages yet'),
          lastMessageAt: lastTeam?.createdAt ?? null,
          unreadCount: 0,
        });
      }

      setGroupChats(groups);
      setDms(dmRes.status === 'fulfilled' ? dmRes.value.data : []);
    } catch (e) {
      console.error('Failed to load chats:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDMStart = async (member) => {
    setShowNewChat(false);
    try {
      const res = await conversationAPI.create({ gymId: selectedGym.id, participantId: member.id });
      router.push(`/chat/conversation/${res.data.id}?type=dm&name=${encodeURIComponent(member.name)}`);
    } catch (e) {
      console.error('Failed to create DM:', e);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background-dark items-center justify-center">
        <ActivityIndicator size="large" color="#0df259" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-dark">
      <View className="bg-surface-dark px-6 pt-16 pb-4 border-b border-slate-700">
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-3xl font-bold">Messages</Text>
          <TouchableOpacity
            onPress={() => setShowNewChat(true)}
            className="p-2 bg-slate-700 rounded-xl"
          >
            <Edit3 size={22} color="#0df259" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="px-6 pt-5 pb-2">
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Channels</Text>
        </View>
        {groupChats.map(conv => (
          <ConversationRow key={conv.id} conversation={conv} />
        ))}

        <View className="px-6 pt-5 pb-2 flex-row items-center justify-between">
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Direct Messages</Text>
          <TouchableOpacity onPress={() => setShowNewChat(true)}>
            <Text className="text-primary text-xs font-semibold">+ New</Text>
          </TouchableOpacity>
        </View>
        {dms.length === 0 ? (
          <View className="items-center py-10">
            <User size={40} color="#475569" strokeWidth={1.5} />
            <Text className="text-slate-500 text-sm mt-3">No direct messages yet</Text>
            <TouchableOpacity onPress={() => setShowNewChat(true)} className="mt-2">
              <Text className="text-primary text-sm font-semibold">Start a conversation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          dms.map(conv => <ConversationRow key={conv.id} conversation={conv} />)
        )}
      </ScrollView>

      <NewChatModal
        visible={showNewChat}
        gymId={selectedGym?.id}
        currentUserId={user?.id}
        onClose={() => setShowNewChat(false)}
        onSelect={handleDMStart}
      />
    </View>
  );
}

function ConversationRow({ conversation }) {
  const avatar = () => {
    if (conversation.type === 'locker-room') {
      return (
        <View className="w-12 h-12 rounded-full bg-slate-700 items-center justify-center">
          <Users size={22} color="#0df259" strokeWidth={2} />
        </View>
      );
    }
    if (conversation.type === 'team') {
      return (
        <View
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: conversation.color || '#0df259' }}
        >
          <Text className="text-white font-bold text-lg">{conversation.name[0]}</Text>
        </View>
      );
    }
    if (conversation.photoUrl) {
      return <Image source={{ uri: conversation.photoUrl }} className="w-12 h-12 rounded-full" />;
    }
    return (
      <View className="w-12 h-12 rounded-full bg-slate-700 items-center justify-center">
        <Text className="text-white font-bold text-lg">{conversation.name?.[0]?.toUpperCase()}</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      onPress={() =>
        router.push(
          `/chat/conversation/${conversation.id}?type=${conversation.type}&name=${encodeURIComponent(conversation.name)}`
        )
      }
      className="px-6 py-4 border-b border-slate-800/60 active:bg-slate-800/50"
    >
      <View className="flex-row items-center gap-4">
        <View className="relative">
          {avatar()}
          {conversation.unreadCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-primary w-5 h-5 rounded-full items-center justify-center">
              <Text className="text-background-dark text-xs font-bold">{conversation.unreadCount}</Text>
            </View>
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-0.5">
            <Text className="text-white font-bold text-base">{conversation.name}</Text>
            {conversation.lastMessageAt && (
              <Text className="text-slate-500 text-xs">{timeAgo(conversation.lastMessageAt)}</Text>
            )}
          </View>
          <Text className="text-slate-400 text-sm" numberOfLines={1}>
            {conversation.lastMessage}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function NewChatModal({ visible, gymId, currentUserId, onClose, onSelect }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible && gymId) {
      setSearch('');
      setLoading(true);
      gymAPI.getMembers(gymId)
        .then(res => setMembers(res.data.filter(m => m.id !== currentUserId)))
        .catch(e => console.error('Failed to load members:', e))
        .finally(() => setLoading(false));
    }
  }, [visible, gymId]);

  const filtered = search.trim()
    ? members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    : members;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-background-dark">
        <View className="bg-surface-dark px-6 pt-14 pb-4 border-b border-slate-700">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-xl font-bold">New Message</Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X size={22} color="#94a3b8" strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center bg-slate-800 rounded-xl px-4 py-3 gap-3">
            <Search size={18} color="#64748b" strokeWidth={2} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search members..."
              placeholderTextColor="#64748b"
              className="flex-1 text-white"
              autoFocus
            />
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#0df259" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingVertical: 8 }}
            renderItem={({ item }) => <MemberRow member={item} onPress={() => onSelect(item)} />}
            ListEmptyComponent={
              <View className="items-center py-12">
                <Text className="text-slate-500 text-sm">No members found</Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

function MemberRow({ member, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center gap-4 px-6 py-4 border-b border-slate-800/60 active:bg-slate-800/50"
    >
      {member.photoUrl ? (
        <Image source={{ uri: member.photoUrl }} className="w-12 h-12 rounded-full" />
      ) : (
        <View className="w-12 h-12 rounded-full bg-slate-700 items-center justify-center">
          <Text className="text-white font-bold text-lg">{member.name?.[0]?.toUpperCase()}</Text>
        </View>
      )}
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-white font-semibold text-base">{member.name}</Text>
          {member.isCoach && (
            <View className="flex-row items-center gap-1 bg-primary/20 rounded-full px-2 py-0.5">
              <ShieldCheck size={11} color="#0df259" strokeWidth={2.5} />
              <Text className="text-primary text-xs font-bold">Coach</Text>
            </View>
          )}
        </View>
        {member.nickname ? <Text className="text-slate-400 text-sm">{member.nickname}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}
