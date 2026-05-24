import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useProfiles } from '../../context/ProfileContext';
import colors from '../../hooks/useColors';

export default function DashboardScreen() {
  const router = useRouter();
  const { profiles, sessions, getRunningCount, getSuccessRate, loading } = useProfiles();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const runningCount = getRunningCount();
  const successRate = getSuccessRate();
  const recentSessions = sessions.slice(0, 10);

  const stats = [
    { label: 'Total Profiles', value: profiles.length.toString(), icon: 'users' as const, color: colors.primary },
    { label: 'Running', value: runningCount.toString(), icon: 'play-circle' as const, color: colors.success },
    { label: 'Success Rate', value: `${successRate}%`, icon: 'check-circle' as const, color: colors.info },
    { label: 'Sessions', value: sessions.length.toString(), icon: 'activity' as const, color: colors.warning },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Text style={styles.greeting}>Browser Profile Manager</Text>
      <Text style={styles.subtitle}>Manage your browser profiles</Text>

      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: stat.color + '20' }]}>
              <Feather name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/profiles')}
          >
            <Feather name="plus-circle" size={20} color={colors.primary} />
            <Text style={styles.actionText}>New Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/browser/multi')}
          >
            <Feather name="grid" size={20} color={colors.success} />
            <Text style={styles.actionText}>Multi Browser</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/sync')}
          >
            <Feather name="zap" size={20} color={colors.warning} />
            <Text style={styles.actionText}>Script Runner</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {recentSessions.length === 0 ? (
          <View style={styles.emptyActivity}>
            <Feather name="inbox" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No recent activity</Text>
            <Text style={styles.emptySubtext}>Start browsing to see activity here</Text>
          </View>
        ) : (
          recentSessions.map((session) => {
            const profile = profiles.find(p => p.id === session.profileId);
            return (
              <View key={session.id} style={styles.activityItem}>
                <View style={[styles.activityDot, { backgroundColor: profile?.color || colors.primary }]} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {session.title || session.url}
                  </Text>
                  <Text style={styles.activityMeta}>
                    {profile?.name || 'Unknown'} · {new Date(session.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {profiles.length > 0 && (
        <View style={styles.profilesPreview}>
          <Text style={styles.sectionTitle}>Active Profiles</Text>
          {profiles.filter(p => p.status === 'running').length === 0 ? (
            <Text style={styles.noRunning}>No profiles currently running</Text>
          ) : (
            profiles
              .filter(p => p.status === 'running')
              .slice(0, 5)
              .map(profile => (
                <TouchableOpacity
                  key={profile.id}
                  style={styles.profilePreviewItem}
                  onPress={() => router.push(`/browser/${profile.id}`)}
                >
                  <View style={[styles.profileDot, { backgroundColor: profile.color }]} />
                  <Text style={styles.profilePreviewName}>{profile.name}</Text>
                  <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                </TouchableOpacity>
              ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  greeting: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  quickActions: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
  },
  activitySection: {
    marginBottom: 24,
  },
  emptyActivity: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
  },
  activityMeta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
  },
  profilesPreview: {
    marginBottom: 24,
  },
  noRunning: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  profilePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  profileDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  profilePreviewName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
