import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import { colors } from "../../hooks/useColors";

export default function SettingsScreen() {
  const [haptics, setHaptics] = useState(true);
  const [autoRestore, setAutoRestore] = useState(true);

  const handleClearAllData = () => {
    Alert.alert(
      "Clear All Data",
      "This will delete all profiles and their stored sessions. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            Alert.alert("Done", "All data has been cleared. Restart the app.");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>App configuration</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Feather name="smartphone" size={16} color={colors.primary} />
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
            </View>
            <Switch
              value={haptics}
              onValueChange={setHaptics}
              trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Feather name="refresh-cw" size={16} color={colors.primary} />
              <Text style={styles.settingLabel}>Auto-Restore Sessions</Text>
            </View>
            <Switch
              value={autoRestore}
              onValueChange={setAutoRestore}
              trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearAllData}>
            <Feather name="trash-2" size={16} color={colors.error} />
            <Text style={styles.dangerBtnText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>Browser Profile Manager</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            <Text style={styles.aboutDesc}>
              Manage multiple independent browser profiles with unique fingerprints,
              session isolation, and synchronized actions.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Limitations</Text>
          <View style={styles.infoCard}>
            <Feather name="alert-triangle" size={14} color={colors.warning} />
            <Text style={styles.infoText}>
              HTTP-only cookies use the OS shared cookie jar in Expo Go and cannot be
              fully isolated between profiles without a custom dev client. Session
              persistence works best with sites using localStorage tokens.
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Feather name="info" size={14} color={colors.info} />
            <Text style={styles.infoText}>
              Mirror mode uses auto-generated CSS selectors which may not work
              perfectly on sites with dynamic class names (Tailwind JIT, CSS Modules).
            </Text>
          </View>
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
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.text,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.text,
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.error + "33",
  },
  dangerBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.error,
  },
  aboutCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  aboutTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: colors.text,
  },
  aboutVersion: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
    marginTop: 4,
  },
  aboutDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
