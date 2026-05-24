import { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProfiles } from "../../context/ProfileContext";
import { colors } from "../../hooks/useColors";
import { BrowserProfile } from "../../types/profile";

export default function ProfilesScreen() {
  const { profiles, addProfile, deleteProfile, selectedProfiles, toggleSelectProfile, selectAllProfiles, clearSelection } = useProfiles();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHomepage, setNewHomepage] = useState("https://www.google.com");
  const [search, setSearch] = useState("");

  const filtered = profiles.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const profile = await addProfile(newName.trim(), newHomepage.trim() || undefined);
    setNewName("");
    setNewHomepage("https://www.google.com");
    setShowCreate(false);
    router.push(`/profile/${profile.id}`);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Delete Profile", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteProfile(id) },
    ]);
  };

  const renderProfile = ({ item }: { item: BrowserProfile }) => {
    const isSelected = selectedProfiles.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.profileCard, isSelected && styles.profileCardSelected]}
        onPress={() => router.push(`/profile/${item.id}`)}
        onLongPress={() => toggleSelectProfile(item.id)}
      >
        <View style={styles.profileRow}>
          <View style={[styles.statusDot, {
            backgroundColor: item.status === "running" ? colors.success
              : item.status === "loading" ? colors.warning
              : item.status === "error" ? colors.error
              : colors.textMuted
          }]} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{item.name}</Text>
            <Text style={styles.profileMeta}>
              {item.fingerprint.platform} | {item.fingerprint.language}
            </Text>
          </View>
          <View style={styles.profileActions}>
            <TouchableOpacity
              onPress={() => router.push(`/browser/${item.id}`)}
              style={styles.iconBtn}
            >
              <Feather name="globe" size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item.id, item.name)}
              style={styles.iconBtn}
            >
              <Feather name="trash-2" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profiles</Text>
        <Text style={styles.count}>{profiles.length} total</Text>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search profiles..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Feather name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {selectedProfiles.length > 0 && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionText}>{selectedProfiles.length} selected</Text>
          <TouchableOpacity onPress={selectAllProfiles}>
            <Text style={styles.selectionAction}>Select All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearSelection}>
            <Text style={styles.selectionAction}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/browser/multi")}>
            <Text style={[styles.selectionAction, { color: colors.primary }]}>Open Multi</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filtered}
        renderItem={renderProfile}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No profiles found. Tap + to create one.</Text>
        }
      />

      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Profile</Text>
            <TextInput
              style={styles.input}
              placeholder="Profile name"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="Homepage URL"
              placeholderTextColor={colors.textMuted}
              value={newHomepage}
              onChangeText={setNewHomepage}
              autoCapitalize="none"
              keyboardType="url"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowCreate(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.createBtn]} onPress={handleCreate}>
                <Text style={styles.createBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: colors.text,
  },
  count: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
  },
  toolbar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingVertical: 10,
    marginLeft: 8,
  },
  addBtn: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  selectionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 12,
    backgroundColor: colors.surfaceLight,
  },
  selectionText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.text,
    flex: 1,
  },
  selectionAction: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: colors.textSecondary,
  },
  list: {
    padding: 20,
    paddingTop: 0,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  profileCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.text,
  },
  profileMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
    marginTop: 2,
  },
  profileActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: 48,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: colors.text,
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: colors.surfaceLight,
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.textSecondary,
  },
  createBtn: {
    backgroundColor: colors.primary,
  },
  createBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
