import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProfiles } from "../../context/ProfileContext";
import { colors } from "../../hooks/useColors";
import { Fingerprint } from "../../types/profile";

export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getProfile, updateProfile, deleteProfile } = useProfiles();
  const router = useRouter();
  const profile = getProfile(id);

  const [name, setName] = useState("");
  const [homepage, setHomepage] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setHomepage(profile.homepage);
      setNotes(profile.notes);
    }
  }, [profile]);

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Profile not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    await updateProfile(id, { name: name.trim(), homepage: homepage.trim(), notes });
    Alert.alert("Saved", "Profile updated successfully.");
  };

  const handleDelete = () => {
    Alert.alert("Delete Profile", `Delete "${profile.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteProfile(id);
          router.back();
        },
      },
    ]);
  };

  const fp = profile.fingerprint;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={() => router.push(`/browser/${id}`)}>
          <Feather name="globe" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Homepage</Text>
          <TextInput
            style={styles.input}
            value={homepage}
            onChangeText={setHomepage}
            autoCapitalize="none"
            keyboardType="url"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fingerprint</Text>
          <View style={styles.fpCard}>
            <FPRow label="Platform" value={fp.platform} />
            <FPRow label="Language" value={fp.language} />
            <FPRow label="Screen" value={`${fp.screenWidth}x${fp.screenHeight}`} />
            <FPRow label="Color Depth" value={`${fp.colorDepth}bit`} />
            <FPRow label="WebGL Vendor" value={fp.webglVendor} />
            <FPRow label="WebGL Renderer" value={fp.webglRenderer} />
            <FPRow label="Canvas Noise" value={fp.canvasNoise ? "Enabled" : "Disabled"} />
          </View>
          <Text style={styles.uaLabel}>User Agent</Text>
          <Text style={styles.uaText}>{fp.userAgent}</Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Feather name="save" size={16} color="#fff" />
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Feather name="trash-2" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FPRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fpRow}>
      <Text style={styles.fpLabel}>{label}</Text>
      <Text style={styles.fpValue}>{value}</Text>
    </View>
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
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: colors.text,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  multiline: {
    minHeight: 80,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.text,
    marginBottom: 12,
  },
  fpCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  fpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  fpLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.textSecondary,
  },
  fpValue: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.text,
    maxWidth: "60%",
    textAlign: "right",
  },
  uaLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.textSecondary,
    marginTop: 12,
  },
  uaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.error + "33",
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: "center",
    marginTop: 100,
  },
  backLink: {
    fontSize: 14,
    color: colors.primary,
    textAlign: "center",
    marginTop: 12,
  },
});
