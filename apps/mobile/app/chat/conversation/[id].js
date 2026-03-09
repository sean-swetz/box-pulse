import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Modal, FlatList, Image, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Smile, Image as ImageIcon, X, Search } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../../store/authStore';
import api, { messageAPI, conversationAPI, uploadAPI } from '../../../lib/api';
import { getSocket } from '../../../lib/socket';

const GIPHY_API_KEY = 'J0YCFCoA6FVyERMMdZsQ2tqak05QhycA';
const EMOJIS = ['👍', '❤️', '😂', '🔥', '💪', '🎉', '😮', '🙏'];

export default function ConversationScreen() {
  const { id, type, name } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const scrollViewRef = useRef(null);
  const { user } = useAuthStore();

  useEffect(() => {
    loadMessages();
  }, [id]);

  // Real-time socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const addMessage = (msg) => {
      // Skip if it came from us (already shown via optimistic update)
      if (msg.isMine) return;
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    };

    if (type === 'locker-room') {
      socket.emit('join_locker_room');
      socket.on('new_locker_room_message', addMessage);
      return () => { socket.off('new_locker_room_message', addMessage); };
    }

    if (type === 'team') {
      socket.emit('join_team', id);
      socket.on('new_team_message', addMessage);
      return () => {
        socket.emit('leave_team', id);
        socket.off('new_team_message', addMessage);
      };
    }

    if (type === 'dm') {
      const handleDM = (msg) => {
        if (msg.conversationId !== id) return;
        addMessage(msg);
      };
      socket.on('new_dm_message', handleDM);
      return () => { socket.off('new_dm_message', handleDM); };
    }
  }, [id, type]);

  const loadMessages = async () => {
    try {
      let response;
      if (type === 'locker-room') {
        response = await messageAPI.getLockerRoom(id);
      } else if (type === 'dm') {
        response = await conversationAPI.getMessages(id);
      } else {
        response = await messageAPI.getTeam(id);
      }
      setMessages(response.data);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !selectedImage) return;

    const messageText = inputText.trim();
    const localImageUri = selectedImage;
    setInputText('');
    setSelectedImage(null);

    // Show optimistic message immediately with local URI so it appears right away
    const optimisticMessage = {
      id: Date.now().toString(),
      userId: user?.id,
      userName: user?.name,
      text: messageText,
      imageUrl: localImageUri,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      reactions: {},
      isMine: true,
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    // Upload image to server before saving the message
    let remoteImageUrl = null;
    if (localImageUri) {
      try {
        const uploadRes = await uploadAPI.image(localImageUri);
        remoteImageUrl = uploadRes.data.url;
      } catch (error) {
        console.error('Image upload failed:', error);
      }
    }

    try {
      if (type === 'locker-room') {
        await messageAPI.postLockerRoom({ gymId: id, text: messageText, imageUrl: remoteImageUrl });
      } else if (type === 'dm') {
        await conversationAPI.sendMessage(id, { text: messageText, imageUrl: remoteImageUrl });
      } else {
        await messageAPI.postTeam(id, { text: messageText, imageUrl: remoteImageUrl });
      }
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleGifSearch = async (query) => {
    if (!query.trim()) return;
    
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${query}&limit=20&rating=pg-13`
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('GIF search error:', error);
    }
  };

  const handleGifSelect = async (gifUrl) => {
    setShowGifPicker(false);
    setGifSearchQuery('');
    setGifs([]);
    
    const gifMessage = {
      id: Date.now().toString(),
      userId: user?.id,
      userName: user?.name,
      gifUrl,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      reactions: {},
      isMine: true,
    };
    
    setMessages(prev => [...prev, gifMessage]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    
    try {
      if (type === 'locker-room') {
        await messageAPI.postLockerRoom({ gymId: id, gifUrl });
      } else if (type === 'dm') {
        await conversationAPI.sendMessage(id, { gifUrl });
      } else {
        await messageAPI.postTeam(id, { gifUrl });
      }
    } catch (error) {
      console.error('Failed to save GIF:', error);
    }
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await api.post(`/conversations/messages/${messageId}/reactions`, { emoji });
      
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = { ...msg.reactions };
          if (!reactions[emoji]) reactions[emoji] = [];
          const userIndex = reactions[emoji].indexOf(user?.id);
          if (userIndex > -1) {
            reactions[emoji].splice(userIndex, 1);
            if (reactions[emoji].length === 0) delete reactions[emoji];
          } else {
            reactions[emoji].push(user?.id);
          }
          return { ...msg, reactions };
        }
        return msg;
      }));
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-background-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View className="bg-surface-dark px-6 pt-16 pb-4 border-b border-slate-700">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#ffffff" strokeWidth={2} />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-xl font-bold">{name ?? 'Chat'}</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        className="flex-1 px-4 py-4"
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        <View className="gap-3">
          {messages.map((message) => (
            <MessageBubble 
              key={message.id} 
              message={message}
              onReact={(emoji) => handleReaction(message.id, emoji)}
            />
          ))}
        </View>
      </ScrollView>

      {selectedImage && (
        <View className="px-4 pb-2">
          <View className="relative">
            <Image source={{ uri: selectedImage }} className="w-32 h-32 rounded-xl" />
            <TouchableOpacity 
              onPress={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center"
            >
              <X size={14} color="#ffffff" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View className="bg-surface-dark border-t border-slate-700 px-4 py-3 pb-8">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => setShowEmojiPicker(true)} className="p-2">
            <Smile size={24} color="#94a3b8" strokeWidth={2} />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setShowGifPicker(true)} className="p-2">
            <Text className="text-slate-400 font-bold">GIF</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleImagePick} className="p-2">
            <ImageIcon size={24} color="#94a3b8" strokeWidth={2} />
          </TouchableOpacity>
          
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#64748b"
            className="flex-1 bg-slate-800 text-white px-4 py-3 rounded-xl"
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity 
            onPress={handleSend}
            className={`p-3 rounded-xl ${(inputText.trim() || selectedImage) ? 'bg-primary' : 'bg-slate-700'}`}
            disabled={!inputText.trim() && !selectedImage}
          >
            <Send size={20} color={(inputText.trim() || selectedImage) ? '#102216' : '#94a3b8'} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showEmojiPicker} transparent animationType="slide">
        <TouchableOpacity 
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => setShowEmojiPicker(false)}
        >
          <View className="bg-surface-dark rounded-t-3xl p-6 pb-12">
            <Text className="text-white text-xl font-bold mb-4">Choose Emoji</Text>
            <View className="flex-row flex-wrap gap-4">
              {EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => handleEmojiSelect(emoji)}
                  className="w-14 h-14 bg-slate-800 rounded-xl items-center justify-center"
                >
                  <Text className="text-4xl">{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showGifPicker} transparent animationType="slide">
        <View className="flex-1 bg-background-dark">
          <View className="bg-surface-dark px-6 pt-16 pb-4 border-b border-slate-700">
            <View className="flex-row items-center gap-3 mb-4">
              <TouchableOpacity onPress={() => setShowGifPicker(false)} className="p-2 -ml-2">
                <X size={24} color="#ffffff" strokeWidth={2} />
              </TouchableOpacity>
              <Text className="text-white text-xl font-bold">Search GIFs</Text>
            </View>
            <View className="flex-row items-center bg-slate-800 rounded-xl px-4 py-3 gap-3">
              <Search size={20} color="#94a3b8" strokeWidth={2} />
              <TextInput
                value={gifSearchQuery}
                onChangeText={setGifSearchQuery}
                onSubmitEditing={() => handleGifSearch(gifSearchQuery)}
                placeholder="Search Giphy..."
                placeholderTextColor="#64748b"
                className="flex-1 text-white"
              />
            </View>
          </View>
          <FlatList
            data={gifs}
            numColumns={2}
            contentContainerStyle={{ padding: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                onPress={() => handleGifSelect(item.images.fixed_height.url)}
                className="flex-1 m-2"
              >
                <Image 
                  source={{ uri: item.images.fixed_height.url }}
                  className="w-full h-40 rounded-xl"
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message, onReact }) {
  const [showReactions, setShowReactions] = useState(false);

  if (message.isMine) {
    return (
      <TouchableOpacity onLongPress={() => setShowReactions(true)} className="items-end">
        <View className="bg-primary rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
          {message.imageUrl && <Image source={{ uri: message.imageUrl }} className="w-full h-48 rounded-xl mb-2" />}
          {message.gifUrl && <Image source={{ uri: message.gifUrl }} className="w-full h-48 rounded-xl mb-2" />}
          {message.text && <Text className="text-background-dark text-base">{message.text}</Text>}
          <Text className="text-background-dark/70 text-xs mt-1">{message.timestamp}</Text>
        </View>
        {Object.keys(message.reactions || {}).length > 0 && (
          <View className="flex-row gap-1 mt-1">
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <View key={emoji} className="bg-slate-800 rounded-full px-2 py-1 flex-row items-center gap-1">
                <Text className="text-sm">{emoji}</Text>
                <Text className="text-white text-xs font-bold">{users.length}</Text>
              </View>
            ))}
          </View>
        )}
        {showReactions && (
          <View className="absolute -top-10 right-0 bg-slate-800 rounded-xl p-2 flex-row gap-2 border border-slate-700">
            {EMOJIS.slice(0, 5).map(emoji => (
              <TouchableOpacity key={emoji} onPress={() => { onReact(emoji); setShowReactions(false); }}>
                <Text className="text-2xl">{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onLongPress={() => setShowReactions(true)} className="items-start">
      <Text className="text-slate-400 text-xs font-medium mb-1 ml-1">{message.userName}</Text>
      <View className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
        {message.imageUrl && <Image source={{ uri: message.imageUrl }} className="w-full h-48 rounded-xl mb-2" />}
        {message.gifUrl && <Image source={{ uri: message.gifUrl }} className="w-full h-48 rounded-xl mb-2" />}
        {message.text && <Text className="text-white text-base">{message.text}</Text>}
        <Text className="text-slate-400 text-xs mt-1">{message.timestamp}</Text>
      </View>
      {Object.keys(message.reactions || {}).length > 0 && (
        <View className="flex-row gap-1 mt-1">
          {Object.entries(message.reactions).map(([emoji, users]) => (
            <View key={emoji} className="bg-slate-800 rounded-full px-2 py-1 flex-row items-center gap-1">
              <Text className="text-sm">{emoji}</Text>
              <Text className="text-white text-xs font-bold">{users.length}</Text>
            </View>
          ))}
        </View>
      )}
      {showReactions && (
        <View className="absolute -top-10 left-0 bg-slate-800 rounded-xl p-2 flex-row gap-2 border border-slate-700">
          {EMOJIS.slice(0, 5).map(emoji => (
            <TouchableOpacity key={emoji} onPress={() => { onReact(emoji); setShowReactions(false); }}>
              <Text className="text-2xl">{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}
