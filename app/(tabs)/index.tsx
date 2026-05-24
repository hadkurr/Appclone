import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useProfiles } from "../../context/ProfileContext";
import { colors } from "../../hooks/useColors";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Dashboard() {
  const { profiles } = useProfiles();
  const router = useRouter();

  const totalProfiles = profiles.length;
  const running = profiles.filter((p) => p.status === "running").length;
  const idle = profiles.filter((p) => p.status === "idle").length;
  const errored = profiles.filter((p) => p.status === "error").length;
  const successRate = totalProfiles > 0
    ? Math.round(((totalProfiles - errored) / totalProfiles) * 100)
    : 100;

  const recentProfiles = [...profiles]
    .sort((a, b) => b.lastUsed - a.lastUsed)
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Browser Profile Manager</Text>

        <View style={styles.statsGrid}>
          <StatCard icon="users" label="Total Profiles" value={totalProfiles} color={colors.primary} />
          <StatCard icon="play" label="Running" value={running} color={colors.success} />
          <StatCard icon="pause" label="Idle" value={idle} color={colors.textMuted} />
          <StatCard icon="percent" label="Success Rate" value={`${successRate}%`} color={colors.info} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/profiles")}
            >
              <Feather name="plus" size={18} color={colors.primary} />
              <Text style={styles.actionText}>New Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/browser/multi")}
            >
              <Feather name="grid" size={18} color={colors.primary} />
              <Text style={styles.actionText}>Multi Browser</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/sync")}
            >
              <Feather name="zap" size={18} color={colors.primary} />
              <Text style={styles.actionText}>Run Script</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {recentProfiles.length === 0 ? (
            <Text style={styles.emptyText}>No profiles yet. Create one to get started!</Text>
          ) : (
            recentProfiles.map((profile) => (
              <TouchableOpacity
                key={profile.id}
                style={styles.activityItem}
                onPress={() => router.push(`/profile/${profile.id}`)}
              >
                <View style={[styles.statusDot, {
                  backgroundColor: profile.status === "running" ? colors.success
                    : profile.status === "loading" ? colors.warning
                    : profile.status === "error" ? colors.error
                    : colors.textMuted
                }]} />
                <View style={styles.activityInfo}>
                  <Text style={styles.activityName}>{profile.name}</Text>
                  <Text style={styles.activityMeta}>
                    {profile.fingerprint.platform} - {new Date(profile.lastUsed).toLocaleDateString()}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Feather name={icon} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: "flex-start",
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: colors.text,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 6,
  },
  actionText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: colors.text,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.text,
  },
  activityMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: 32,
  },
});
