import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { MessageCircle, Users, User, Search } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';

export default function ChatScreen() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, selectedGym } = useAuthStore();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const list = [];

      if (selectedGym) {
        list.push({
          id: selectedGym.id,
          type: 'locker-room',
          name: `${selectedGym.name} Locker Room`,
          lastMessage: 'Chat with your gym',
          lastMessageTime: '',
          unreadCount: 0,
          icon: 'gym',
        });
      }

      if (user?.team) {
        list.push({
          id: user.team.id,
          type: 'team',
          name: user.team.name,
          lastMessage: 'Chat with your team',
          lastMessageTime: '',
          unreadCount: 0,
          color: user.team.color || '#ef4444',
        });
      }

      setConversations(list);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
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
      {/* Header */}
      <View className="bg-surface-dark px-6 pt-16 pb-6 border-b border-slate-700">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-3">
            <MessageCircle size={32} color="#0df259" strokeWidth={2} />
            <Text className="text-white text-3xl font-bold">Messages</Text>
          </View>
          <TouchableOpacity className="p-2 bg-slate-700 rounded-lg">
            <Search size={24} color="#ffffff" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1">
        {conversations.length === 0 ? (
          <View className="items-center justify-center py-20">
            <MessageCircle size={64} color="#475569" strokeWidth={1.5} />
            <Text className="text-slate-400 text-lg mt-4">No conversations yet</Text>
            <Text className="text-slate-500 text-sm mt-2">Start chatting with your team!</Text>
          </View>
        ) : (
          <View className="py-2">
            {conversations.map((conv) => (
              <ConversationRow key={conv.id} conversation={conv} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ConversationRow({ conversation }) {
  const getIcon = () => {
    if (conversation.type === 'locker-room') {
      return <Users size={24} color="#0df259" strokeWidth={2} />;
    }
    if (conversation.type === 'team') {
      return (
        <View 
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: conversation.color || '#0df259' }}
        >
          <Text className="text-white font-bold text-lg">
            {conversation.name.substring(0, 1)}
          </Text>
        </View>
      );
    }
    return <User size={24} color="#94a3b8" strokeWidth={2} />;
  };

  return (
    <TouchableOpacity
      onPress={() => router.push(`/chat/conversation/${conversation.id}?type=${conversation.type}&name=${encodeURIComponent(conversation.name)}`)}
      className="px-6 py-4 border-b border-slate-800 active:bg-slate-800/50"
    >
      <View className="flex-row items-center gap-4">
        {/* Avatar/Icon */}
        <View className="relative">
          {getIcon()}
          {conversation.unreadCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-primary w-5 h-5 rounded-full items-center justify-center">
              <Text className="text-background-dark text-xs font-bold">
                {conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-white font-bold text-base">{conversation.name}</Text>
            <Text className="text-slate-500 text-xs">{conversation.lastMessageTime}</Text>
          </View>
          <Text 
            className="text-slate-400 text-sm" 
            numberOfLines={1}
          >
            {conversation.lastMessage}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
