import { useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useProfiles } from '../../context/ProfileContext';
import colors from '../../hooks/useColors';

export default function SessionHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profiles, getProfileSessions, clearProfileSessions } = useProfiles();

  const profile = profiles.find(p => p.id === id);
  const sessions = id ? getProfileSessions(id) : [];

  const handleClear = useCallback(() => {
    if (!id) return;
    Alert.alert('Clear History', 'Clear all session history for this profile?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearProfileSessions(id) },
    ]);
  }, [id, clearProfileSessions]);

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
      <View style={styles.profileHeader}>
        <View style={[styles.profileDot, { backgroundColor: profile.color }]} />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileMeta}>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded
          </Text>
        </View>
        {sessions.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Feather name="trash-2" size={14} color={colors.error} />
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="clock" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptySubtext}>Browse with this profile to create session history</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push(`/browser/${id}`)}
          >
            <Feather name="globe" size={16} color={colors.white} />
            <Text style={styles.browseButtonText}>Start Browsing</Text>
          </TouchableOpacity>
        </View>
      ) : (
        sessions.map((session, index) => {
          const isNewDay = index === 0 ||
            new Date(session.timestamp).toDateString() !== new Date(sessions[index - 1].timestamp).toDateString();

          return (
            <View key={session.id}>
              {isNewDay && (
                <Text style={styles.dayHeader}>
                  {new Date(session.timestamp).toLocaleDateString(undefined, {
                    weekday: 'long', month: 'short', day: 'numeric',
                  })}
                </Text>
              )}
              <View style={styles.sessionItem}>
                <View style={styles.timeline}>
                  <View style={styles.timelineDot} />
                  {index < sessions.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.sessionContent}>
                  <Text style={styles.sessionTitle} numberOfLines={1}>
                    {session.title || 'Untitled'}
                  </Text>
                  <Text style={styles.sessionUrl} numberOfLines={1}>{session.url}</Text>
                  <Text style={styles.sessionTime}>
                    {new Date(session.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  notFoundText: { fontSize: 16, fontFamily: 'Inter_500Medium', color: colors.textSecondary, marginTop: 12 },
  goBackText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.primary, marginTop: 16 },
  profileHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  profileDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.text },
  profileMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.textMuted, marginTop: 2 },
  clearButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: colors.error + '15', borderWidth: 1, borderColor: colors.error + '30',
  },
  clearText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.error },
  emptyState: {
    alignItems: 'center', paddingVertical: 60,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: colors.textSecondary, marginTop: 16 },
  emptySubtext: { fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  browseButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20,
  },
  browseButtonText: { color: colors.white, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  dayHeader: {
    fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.textMuted,
    marginTop: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  sessionItem: {
    flexDirection: 'row', marginBottom: 0,
  },
  timeline: { width: 24, alignItems: 'center' },
  timelineDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6,
  },
  timelineLine: {
    width: 2, flex: 1, backgroundColor: colors.surfaceBorder, marginTop: 4,
  },
  sessionContent: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginBottom: 8, marginLeft: 8,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  sessionTitle: { fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.text },
  sessionUrl: { fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.textMuted, marginTop: 2 },
  sessionTime: { fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.textMuted, marginTop: 4 },
});
