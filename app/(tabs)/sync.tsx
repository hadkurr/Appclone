import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useProfiles } from "../../context/ProfileContext";
import { colors } from "../../hooks/useColors";

export default function SyncScreen() {
  const { profiles, selectedProfiles, toggleSelectProfile, selectAllProfiles, clearSelection } = useProfiles();
  const router = useRouter();
  const [script, setScript] = useState("document.title");
  const [results, setResults] = useState<{ profileId: string; name: string; result: string }[]>([]);
  const [mirrorEnabled, setMirrorEnabled] = useState(false);
  const [masterId, setMasterId] = useState<string | null>(null);

  const handleRunScript = () => {
    if (!script.trim()) {
      Alert.alert("Error", "Please enter a script to run.");
      return;
    }
    if (selectedProfiles.length === 0) {
      Alert.alert("Error", "Please select at least one profile.");
      return;
    }
    router.push({
      pathname: "/browser/multi",
      params: { script: script.trim(), profileIds: selectedProfiles.join(",") },
    });
  };

  const handleMirrorMode = () => {
    if (selectedProfiles.length < 2) {
      Alert.alert("Error", "Select at least 2 profiles for Mirror Mode.");
      return;
    }
    setMasterId(selectedProfiles[0]);
    router.push({
      pathname: "/browser/multi",
      params: {
        mirror: "true",
        masterId: selectedProfiles[0],
        profileIds: selectedProfiles.join(","),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Sync & Script</Text>
        <Text style={styles.subtitle}>Run scripts and mirror actions across profiles</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Feather name="code" size={14} color={colors.primary} /> Script Runner
          </Text>
          <TextInput
            style={styles.scriptInput}
            placeholder="Enter JavaScript..."
            placeholderTextColor={colors.textMuted}
            value={script}
            onChangeText={setScript}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <TouchableOpacity style={styles.runBtn} onPress={handleRunScript}>
            <Feather name="play" size={16} color="#fff" />
            <Text style={styles.runBtnText}>Run on Selected ({selectedProfiles.length})</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Feather name="copy" size={14} color={colors.primary} /> Master Mirror Mode
          </Text>
          <Text style={styles.description}>
            Select a master profile. All actions (scroll, click, input, navigation) will be
            mirrored to other selected profiles in real-time.
          </Text>
          <TouchableOpacity style={styles.mirrorBtn} onPress={handleMirrorMode}>
            <Feather name="cast" size={16} color="#fff" />
            <Text style={styles.runBtnText}>Start Mirror Mode</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Select Profiles</Text>
            <View style={styles.selectActions}>
              <TouchableOpacity onPress={selectAllProfiles}>
                <Text style={styles.selectAction}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearSelection}>
                <Text style={styles.selectAction}>None</Text>
              </TouchableOpacity>
            </View>
          </View>
          {profiles.map((profile) => {
            const isSelected = selectedProfiles.includes(profile.id);
            return (
              <TouchableOpacity
                key={profile.id}
                style={[styles.profileItem, isSelected && styles.profileItemSelected]}
                onPress={() => toggleSelectProfile(profile.id)}
              >
                <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                  {isSelected && <Feather name="check" size={12} color="#fff" />}
                </View>
                <Text style={styles.profileName}>{profile.name}</Text>
                <Text style={styles.profilePlatform}>{profile.fingerprint.platform}</Text>
              </TouchableOpacity>
            );
          })}
          {profiles.length === 0 && (
            <Text style={styles.emptyText}>No profiles. Create some first.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  scriptInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    minHeight: 100,
    marginBottom: 12,
  },
  runBtn: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mirrorBtn: {
    flexDirection: "row",
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  runBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  selectActions: {
    flexDirection: "row",
    gap: 12,
  },
  selectAction: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: colors.primary,
  },
  profileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  profileItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textMuted,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  profileName: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.text,
  },
  profilePlatform: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: 32,
  },
});
