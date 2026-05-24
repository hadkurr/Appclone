import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useProfiles } from "../../context/ProfileContext";
import { colors } from "../../hooks/useColors";
import { SessionEntry } from "../../types/profile";

export default function SessionHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getProfile } = useProfiles();
  const router = useRouter();
  const profile = getProfile(id);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);

  useEffect(() => {
    loadSessions();
  }, [id]);

  const loadSessions = async () => {
    try {
      const data = await AsyncStorage.getItem(`__bpm_sessions_${id}`);
      if (data) {
        setSessions(JSON.parse(data));
      }
    } catch (e) {
      // ignore
    }
  };

  const renderItem = ({ item }: { item: SessionEntry }) => (
    <View style={styles.sessionItem}>
      <Feather name="globe" size={14} color={colors.textMuted} />
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionTitle} numberOfLines={1}>
          {item.title || item.url}
        </Text>
        <Text style={styles.sessionUrl} numberOfLines={1}>{item.url}</Text>
        <Text style={styles.sessionTime}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Session History{profile ? ` - ${profile.name}` : ""}
        </Text>
      </View>

      <FlatList
        data={sessions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="clock" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No session history yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: colors.text,
  },
  list: {
    padding: 20,
  },
  sessionItem: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 12,
    alignItems: "flex-start",
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.text,
  },
  sessionUrl: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: colors.textMuted,
    marginTop: 2,
  },
  sessionTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
    marginTop: 4,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.textMuted,
    marginTop: 12,
  },
});
