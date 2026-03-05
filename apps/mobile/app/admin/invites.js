import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, Share,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Plus, UserPlus, X, Share2 } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { gymAPI } from '../../lib/api';

export default function InvitesAdmin() {
  const { selectedGym } = useAuthStore();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [maxUses, setMaxUses] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchInvites(); }, []);

  const fetchInvites = async () => {
    try {
      const res = await gymAPI.getInvites(selectedGym.id);
      setInvites(res.data);
    } catch (e) {
      console.error('Fetch invites error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    setSaving(true);
    try {
      const res = await gymAPI.createInvite(selectedGym.id, {
        maxUses: maxUses ? parseInt(maxUses) : null,
      });
      setInvites((prev) => [res.data, ...prev]);
      setShowCreateModal(false);
      setMaxUses('');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to generate invite');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async (code) => {
    try {
      await Share.share({
        message: `Join ${selectedGym.name} on BoxPulse!\n\nUse invite code: ${code}`,
      });
    } catch (e) {
      console.error('Share error:', e);
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
      <View className="bg-surface-dark px-6 pt-16 pb-4 border-b border-slate-700">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
              <ArrowLeft size={24} color="#ffffff" strokeWidth={2} />
            </TouchableOpacity>
            <UserPlus size={24} color="#0df259" strokeWidth={2} />
            <Text className="text-white text-2xl font-bold">Invite Members</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            className="w-10 h-10 bg-primary rounded-xl items-center justify-center"
          >
            <Plus size={20} color="#102216" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {invites.length === 0 ? (
          <View className="items-center justify-center py-16">
            <UserPlus size={48} color="#475569" strokeWidth={1.5} />
            <Text className="text-slate-400 text-base mt-4">No invite codes yet</Text>
            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              className="mt-4 bg-primary px-6 py-3 rounded-xl"
            >
              <Text className="text-background-dark font-bold">Generate Invite Code</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-3">
            {invites.map((invite) => (
              <InviteCard
                key={invite.id}
                invite={invite}
                onShare={() => handleShare(invite.code)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create Invite Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-surface-dark rounded-t-3xl px-6 pt-6 pb-12">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-white text-xl font-bold">Generate Invite Code</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color="#94a3b8" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-400 text-sm mb-1">Max Uses (optional)</Text>
            <TextInput
              value={maxUses}
              onChangeText={setMaxUses}
              placeholder="Leave blank for unlimited"
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              className="bg-slate-800 text-white px-4 py-3 rounded-xl mb-6"
            />

            <View className="bg-slate-800 rounded-xl p-4 mb-6">
              <Text className="text-slate-400 text-sm text-center">
                A unique code will be generated automatically.{'\n'}
                Share it with members to join {selectedGym?.name}.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleCreateInvite}
              disabled={saving}
              className="bg-primary py-4 rounded-xl items-center"
            >
              {saving ? (
                <ActivityIndicator color="#102216" />
              ) : (
                <Text className="text-background-dark font-bold text-base">Generate Code</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InviteCard({ invite, onShare }) {
  const isExpired = invite.expiresAt && new Date(invite.expiresAt) < new Date();
  const usesRemaining = invite.maxUses != null ? invite.maxUses - invite.uses : null;

  return (
    <View
      className={`bg-surface-dark rounded-xl border p-4 ${
        isExpired ? 'border-slate-800 opacity-50' : 'border-slate-700'
      }`}
    >
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-white font-mono text-2xl font-bold tracking-widest">
          {invite.code}
        </Text>
        <TouchableOpacity
          onPress={onShare}
          disabled={isExpired}
          className="p-2 bg-primary/10 rounded-lg"
        >
          <Share2 size={20} color={isExpired ? '#475569' : '#0df259'} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center gap-3 flex-wrap">
        <Text className="text-slate-400 text-sm">
          {invite.uses} used{invite.maxUses != null ? ` / ${invite.maxUses} max` : ''}
        </Text>

        {isExpired ? (
          <View className="bg-red-500/20 px-2 py-0.5 rounded">
            <Text className="text-red-400 text-xs">Expired</Text>
          </View>
        ) : invite.expiresAt ? (
          <Text className="text-slate-500 text-xs">
            Expires {new Date(invite.expiresAt).toLocaleDateString()}
          </Text>
        ) : (
          <View className="bg-slate-700 px-2 py-0.5 rounded">
            <Text className="text-slate-400 text-xs">No expiry</Text>
          </View>
        )}

        {usesRemaining != null && !isExpired && (
          <View className="bg-primary/20 px-2 py-0.5 rounded">
            <Text className="text-primary text-xs">{usesRemaining} uses left</Text>
          </View>
        )}
      </View>
    </View>
  );
}
