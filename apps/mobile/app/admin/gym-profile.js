import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Camera, Save } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { gymAPI, uploadAPI } from '../../lib/api';

export default function GymProfileEditor() {
  const { selectedGym } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    logoUrl: '',
    primaryColor: '#0df259',
    secondaryColor: '',
    backgroundColor: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    instagramUrl: '',
    facebookUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    loadGymData();
  }, []);

  const loadGymData = async () => {
    try {
      const response = await gymAPI.getById(selectedGym.id);
      setFormData({
        name: response.data.name || '',
        logoUrl: response.data.logoUrl || '',
        primaryColor: response.data.primaryColor || '#0df259',
        secondaryColor: response.data.secondaryColor || '',
        backgroundColor: response.data.backgroundColor || '',
        phone: response.data.phone || '',
        email: response.data.email || '',
        website: response.data.website || '',
        address: response.data.address || '',
        instagramUrl: response.data.instagramUrl || '',
        facebookUrl: response.data.facebookUrl || ''
      });
    } catch (error) {
      console.error('Failed to load gym:', error);
      Alert.alert('Error', 'Failed to load gym information');
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
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setUploadingLogo(true);
      try {
        const uploadRes = await uploadAPI.image(result.assets[0].uri);
        setFormData(prev => ({ ...prev, logoUrl: uploadRes.data.url }));
      } catch (e) {
        Alert.alert('Error', 'Failed to upload logo');
      } finally {
        setUploadingLogo(false);
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await gymAPI.update(selectedGym.id, formData);
      Alert.alert('Success', 'Gym profile updated!');
      router.back();
    } catch (error) {
      console.error('Failed to update gym:', error);
      Alert.alert('Error', 'Failed to update gym profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background-dark">
      {/* Header */}
      <View className="bg-surface-dark px-6 pt-16 pb-4 border-b border-slate-700">
        <View className="flex-row items-center gap-4 mb-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#ffffff" strokeWidth={2} />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Edit Gym Profile</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        {/* Logo */}
        <View className="mb-6">
          <Text className="text-white font-bold mb-3">Gym Logo</Text>
          <View className="items-center">
            <TouchableOpacity onPress={handleImagePick} disabled={uploadingLogo} className="relative">
              {uploadingLogo ? (
                <View className="w-32 h-32 rounded-2xl bg-slate-800 items-center justify-center border-2 border-dashed border-slate-600">
                  <ActivityIndicator color="#0df259" />
                </View>
              ) : formData.logoUrl ? (
                <Image source={{ uri: formData.logoUrl }} className="w-32 h-32 rounded-2xl" />
              ) : (
                <View className="w-32 h-32 rounded-2xl bg-slate-800 items-center justify-center border-2 border-dashed border-slate-600">
                  <Camera size={32} color="#94a3b8" strokeWidth={2} />
                </View>
              )}
              <View className="absolute bottom-0 right-0 w-10 h-10 bg-primary rounded-full items-center justify-center border-4 border-background-dark">
                <Camera size={18} color="#102216" strokeWidth={2} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Basic Info */}
        <View className="mb-6">
          <Text className="text-white font-bold mb-3">Basic Information</Text>
          <FormInput
            label="Gym Name"
            value={formData.name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            placeholder="CrossFit Prosperity"
          />
          <FormInput
            label="Phone"
            value={formData.phone}
            onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
            placeholder="(555) 123-4567"
            keyboardType="phone-pad"
          />
          <FormInput
            label="Email"
            value={formData.email}
            onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
            placeholder="info@cfprosperity.com"
            keyboardType="email-address"
          />
          <FormInput
            label="Website"
            value={formData.website}
            onChangeText={(text) => setFormData(prev => ({ ...prev, website: text }))}
            placeholder="https://cfprosperity.com"
            keyboardType="url"
          />
          <FormInput
            label="Address"
            value={formData.address}
            onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
            placeholder="123 Main St, City, State 12345"
            multiline
          />
        </View>

        {/* Social Media */}
        <View className="mb-6">
          <Text className="text-white font-bold mb-3">Social Media</Text>
          <FormInput
            label="Instagram URL"
            value={formData.instagramUrl}
            onChangeText={(text) => setFormData(prev => ({ ...prev, instagramUrl: text }))}
            placeholder="https://instagram.com/cfprosperity"
            keyboardType="url"
          />
          <FormInput
            label="Facebook URL"
            value={formData.facebookUrl}
            onChangeText={(text) => setFormData(prev => ({ ...prev, facebookUrl: text }))}
            placeholder="https://facebook.com/cfprosperity"
            keyboardType="url"
          />
        </View>

        {/* Colors */}
        <View className="mb-6">
          <Text className="text-white font-bold mb-3">Brand Colors</Text>
          <FormInput
            label="Primary Color"
            value={formData.primaryColor}
            onChangeText={(text) => setFormData(prev => ({ ...prev, primaryColor: text }))}
            placeholder="#0df259"
          />
          <View
            className="w-full h-12 rounded-xl mt-2"
            style={{ backgroundColor: formData.primaryColor }}
          />
        </View>
      </ScrollView>

      {/* Save Button */}
      <View className="bg-surface-dark border-t border-slate-700 px-6 py-4 pb-8">
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || uploadingLogo}
          className={`bg-primary py-4 rounded-xl flex-row items-center justify-center gap-2 ${(loading || uploadingLogo) ? 'opacity-50' : ''}`}
        >
          <Save size={20} color="#102216" strokeWidth={2} />
          <Text className="text-background-dark font-bold text-base">
            {loading ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FormInput({ label, value, onChangeText, placeholder, keyboardType, multiline }) {
  return (
    <View className="mb-4">
      <Text className="text-slate-400 text-sm font-medium mb-2">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        keyboardType={keyboardType}
        multiline={multiline}
        className={`bg-slate-800 text-white px-4 rounded-xl border border-slate-700 ${multiline ? 'py-3 h-20' : 'py-4'}`}
      />
    </View>
  );
}
