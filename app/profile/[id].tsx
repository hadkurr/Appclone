import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfiles } from '../../context/ProfileContext';
import { generateFingerprint } from '../../hooks/useFingerprint';
import colors from '../../hooks/useColors';

export default function ProfileEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profiles, updateProfile } = useProfiles();

  const profile = profiles.find(p => p.id === id);

  const [name, setName] = useState('');
  const [homepageUrl, setHomepageUrl] = useState('');
  const [proxy, setProxy] = useState('');
  const [notes, setNotes] = useState('');
  const [fingerprint, setFingerprint] = useState(profile?.fingerprint);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setHomepageUrl(profile.homepageUrl);
      setProxy(profile.proxy);
      setNotes(profile.notes);
      setFingerprint(profile.fingerprint);
    }
  }, [profile]);

  const handleSave = useCallback(async () => {
    if (!id || !name.trim()) return;
    await updateProfile(id, {
      name: name.trim(),
      homepageUrl: homepageUrl.trim() || 'https://www.google.com',
      proxy: proxy.trim(),
      notes: notes.trim(),
      fingerprint: fingerprint,
    });
    router.back();
  }, [id, name, homepageUrl, proxy, notes, fingerprint, updateProfile, router]);

  const handleRegenFingerprint = useCallback(() => {
    Alert.alert(
      'Regenerate Fingerprint',
      'This will create a new random fingerprint. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Regenerate', onPress: () => setFingerprint(generateFingerprint()) },
      ]
    );
  }, []);

  const handleClearSessionData = useCallback(() => {
    if (!id) return;
    Alert.alert(
      'Clear Session Data',
      'This will clear all cookies, localStorage and sessionStorage for this profile. You will be logged out of all sites. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(`__bpm_storage_${id}`);
            await AsyncStorage.removeItem(`__bpm_cookies_${id}`);
            Alert.alert('Done', 'Session data cleared for this profile.');
          },
        },
      ]
    );
  }, [id]);

  if (!profile) {
    return (
      <View style={styles.notFound}>
        <Feather name="alert-circle" size={48} color={colors.textMuted} />
        <Text style={styles.notFoundText}>Profile not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Info</Text>

        <Text style={styles.inputLabel}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Profile name"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.inputLabel}>Homepage URL</Text>
        <TextInput
          style={styles.input}
          value={homepageUrl}
          onChangeText={setHomepageUrl}
          placeholder="https://www.google.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="url"
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>Proxy</Text>
        <TextInput
          style={styles.input}
          value={proxy}
          onChangeText={setProxy}
          placeholder="socks5://user:pass@host:port"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>Notes</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fingerprint</Text>
          <TouchableOpacity style={styles.regenButton} onPress={handleRegenFingerprint}>
            <Feather name="refresh-cw" size={14} color={colors.primary} />
            <Text style={styles.regenText}>Regenerate</Text>
          </TouchableOpacity>
        </View>

        {fingerprint && (
          <View style={styles.fpGrid}>
            <FpRow label="Platform" value={fingerprint.platform} />
            <FpRow label="Language" value={fingerprint.language} />
            <FpRow label="Screen" value={`${fingerprint.screenWidth}x${fingerprint.screenHeight}`} />
            <FpRow label="Color Depth" value={`${fingerprint.colorDepth} bit`} />
            <FpRow label="WebGL Vendor" value={fingerprint.webglVendor} />
            <FpRow label="WebGL Renderer" value={fingerprint.webglRenderer} />
            <FpRow label="Canvas Noise" value={fingerprint.canvasNoise ? 'Enabled' : 'Disabled'} />
            <View style={styles.fpRowFull}>
              <Text style={styles.fpLabel}>User Agent</Text>
              <Text style={styles.fpValueSmall}>{fingerprint.userAgent}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Feather name="calendar" size={14} color={colors.textMuted} />
          <Text style={styles.infoText}>
            Created: {new Date(profile.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Feather name="clock" size={14} color={colors.textMuted} />
          <Text style={styles.infoText}>
            Last used: {profile.lastUsedAt ? new Date(profile.lastUsedAt).toLocaleDateString() : 'Never'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Feather name="activity" size={14} color={colors.textMuted} />
          <Text style={styles.infoText}>Sessions: {profile.sessionCount}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.clearSessionButton} onPress={handleClearSessionData}>
        <Feather name="trash-2" size={16} color={colors.error} />
        <Text style={styles.clearSessionText}>Clear Session Data (Cookies, Storage)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.saveButton, !name.trim() && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!name.trim()}
      >
        <Feather name="check" size={18} color={colors.white} />
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function FpRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fpRow}>
      <Text style={styles.fpLabel}>{label}</Text>
      <Text style={styles.fpValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  notFoundText: { fontSize: 16, fontFamily: 'Inter_500Medium', color: colors.textSecondary, marginTop: 12 },
  goBackText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.primary, marginTop: 16 },
  section: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.text, marginBottom: 12 },
  inputLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.surfaceLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.text, fontFamily: 'Inter_400Regular', fontSize: 15,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  regenButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: colors.primary + '15',
  },
  regenText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.primary },
  fpGrid: { gap: 1 },
  fpRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
  },
  fpRowFull: { paddingVertical: 8 },
  fpLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.textSecondary },
  fpValue: { fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.text, maxWidth: '55%', textAlign: 'right' },
  fpValueSmall: { fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.text, marginTop: 4 },
  infoSection: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  infoText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.textSecondary },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: colors.white, fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  clearSessionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14, marginBottom: 12,
    borderWidth: 1, borderColor: colors.error + '40',
  },
  clearSessionText: { color: colors.error, fontFamily: 'Inter_500Medium', fontSize: 14 },
});
