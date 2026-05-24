import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useProfiles } from '../../context/ProfileContext';
import colors from '../../hooks/useColors';

export default function ProfilesScreen() {
  const router = useRouter();
  const {
    profiles, loading, addProfile, deleteProfile, duplicateProfile,
    selectedProfiles, toggleSelectProfile, selectAllProfiles, deselectAllProfiles,
  } = useProfiles();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('https://www.google.com');
  const [newNotes, setNewNotes] = useState('');
  const [newProxy, setNewProxy] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);

  const filteredProfiles = profiles.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    await addProfile(newName.trim(), newUrl.trim() || 'https://www.google.com', newNotes.trim(), newProxy.trim());
    setNewName('');
    setNewUrl('https://www.google.com');
    setNewNotes('');
    setNewProxy('');
    setShowCreateModal(false);
  }, [newName, newUrl, newNotes, newProxy, addProfile]);

  const handleDelete = useCallback((id: string, name: string) => {
    Alert.alert('Delete Profile', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteProfile(id) },
    ]);
  }, [deleteProfile]);

  const handleBulkDelete = useCallback(() => {
    if (selectedProfiles.length === 0) return;
    Alert.alert(
      'Delete Selected',
      `Delete ${selectedProfiles.length} profile(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            for (const id of selectedProfiles) {
              await deleteProfile(id);
            }
            setSelectionMode(false);
            deselectAllProfiles();
          },
        },
      ]
    );
  }, [selectedProfiles, deleteProfile, deselectAllProfiles]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'running': return colors.success;
      case 'loading': return colors.warning;
      case 'error': return colors.error;
      default: return colors.textMuted;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search profiles..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.headerButtons}>
          {profiles.length > 0 && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                setSelectionMode(!selectionMode);
                if (selectionMode) deselectAllProfiles();
              }}
            >
              <Feather
                name={selectionMode ? 'x' : 'check-square'}
                size={18}
                color={selectionMode ? colors.warning : colors.textSecondary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Feather name="plus" size={18} color={colors.white} />
            <Text style={styles.addButtonText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {selectionMode && selectedProfiles.length > 0 && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionText}>{selectedProfiles.length} selected</Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity onPress={selectAllProfiles} style={styles.selectionButton}>
              <Text style={styles.selectionButtonText}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/browser/multi')}
              style={styles.selectionButton}
            >
              <Feather name="grid" size={14} color={colors.primary} />
              <Text style={styles.selectionButtonText}>Multi</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleBulkDelete} style={styles.selectionButtonDanger}>
              <Feather name="trash-2" size={14} color={colors.error} />
              <Text style={[styles.selectionButtonText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filteredProfiles.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="users" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No profiles yet</Text>
            <Text style={styles.emptySubtitle}>Create your first browser profile</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Feather name="plus" size={16} color={colors.white} />
              <Text style={styles.emptyButtonText}>Create Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredProfiles.map(profile => (
            <TouchableOpacity
              key={profile.id}
              style={[
                styles.profileCard,
                selectionMode && selectedProfiles.includes(profile.id) && styles.profileCardSelected,
              ]}
              onPress={() => {
                if (selectionMode) {
                  toggleSelectProfile(profile.id);
                } else {
                  router.push(`/browser/${profile.id}`);
                }
              }}
              onLongPress={() => {
                if (!selectionMode) {
                  setSelectionMode(true);
                  toggleSelectProfile(profile.id);
                }
              }}
            >
              <View style={styles.profileHeader}>
                {selectionMode && (
                  <View style={[
                    styles.checkbox,
                    selectedProfiles.includes(profile.id) && styles.checkboxChecked,
                  ]}>
                    {selectedProfiles.includes(profile.id) && (
                      <Feather name="check" size={12} color={colors.white} />
                    )}
                  </View>
                )}
                <View style={[styles.profileColorDot, { backgroundColor: profile.color }]} />
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{profile.name}</Text>
                  <Text style={styles.profileMeta} numberOfLines={1}>
                    {profile.fingerprint.platform} · {profile.fingerprint.language}
                  </Text>
                </View>
                <View style={[styles.statusIndicator, { backgroundColor: statusColor(profile.status) }]} />
              </View>

              <View style={styles.profileDetails}>
                <View style={styles.detailChip}>
                  <Feather name="globe" size={10} color={colors.textMuted} />
                  <Text style={styles.detailText} numberOfLines={1}>{profile.homepageUrl}</Text>
                </View>
                {profile.proxy ? (
                  <View style={styles.detailChip}>
                    <Feather name="shield" size={10} color={colors.textMuted} />
                    <Text style={styles.detailText}>Proxy</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.profileActions}>
                <TouchableOpacity
                  style={styles.profileActionButton}
                  onPress={() => router.push(`/profile/${profile.id}`)}
                >
                  <Feather name="edit-2" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.profileActionButton}
                  onPress={() => duplicateProfile(profile.id)}
                >
                  <Feather name="copy" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.profileActionButton}
                  onPress={() => router.push(`/session/${profile.id}`)}
                >
                  <Feather name="clock" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.profileActionButton}
                  onPress={() => handleDelete(profile.id, profile.name)}
                >
                  <Feather name="trash-2" size={14} color={colors.error} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Profile</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Feather name="x" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Profile Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Work Account"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />

            <Text style={styles.inputLabel}>Homepage URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://www.google.com"
              placeholderTextColor={colors.textMuted}
              value={newUrl}
              onChangeText={setNewUrl}
              keyboardType="url"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Proxy (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="socks5://user:pass@host:port"
              placeholderTextColor={colors.textMuted}
              value={newProxy}
              onChangeText={setNewProxy}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Add notes..."
              placeholderTextColor={colors.textMuted}
              value={newNotes}
              onChangeText={setNewNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.fingerprintPreview}>
              <Text style={styles.fingerprintLabel}>
                <Feather name="shield" size={12} color={colors.primary} /> Fingerprint will be auto-generated
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.createButton, !newName.trim() && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={!newName.trim()}
            >
              <Feather name="plus" size={18} color={colors.white} />
              <Text style={styles.createButtonText}>Create Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10,
  },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12, height: 40,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  searchInput: {
    flex: 1, marginLeft: 8, color: colors.text, fontFamily: 'Inter_400Regular', fontSize: 14,
  },
  headerButtons: { flexDirection: 'row', gap: 8 },
  iconButton: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, height: 40,
  },
  addButtonText: { color: colors.white, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  selectionBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surfaceLight, paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
  },
  selectionText: { color: colors.text, fontFamily: 'Inter_500Medium', fontSize: 13 },
  selectionActions: { flexDirection: 'row', gap: 8 },
  selectionButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  selectionButtonDanger: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: colors.error + '15', borderWidth: 1, borderColor: colors.error + '30',
  },
  selectionButtonText: { color: colors.primary, fontFamily: 'Inter_500Medium', fontSize: 12 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 32 },
  emptyState: {
    alignItems: 'center', paddingVertical: 60,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: colors.textSecondary, marginTop: 16 },
  emptySubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.textMuted, marginTop: 4 },
  emptyButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20,
  },
  emptyButtonText: { color: colors.white, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  profileCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  profileCardSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: colors.textMuted,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  profileColorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.text },
  profileMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.textMuted, marginTop: 1 },
  statusIndicator: { width: 8, height: 8, borderRadius: 4 },
  profileDetails: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  detailChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surfaceLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  detailText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.textMuted, maxWidth: 150 },
  profileActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  profileActionButton: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: colors.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
  },
  modalOverlay: {
    flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.text },
  inputLabel: {
    fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.textSecondary, marginBottom: 6, marginTop: 12,
  },
  input: {
    backgroundColor: colors.surfaceLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.text, fontFamily: 'Inter_400Regular', fontSize: 15,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  fingerprintPreview: {
    backgroundColor: colors.primary + '10', borderRadius: 10, padding: 12, marginTop: 16,
  },
  fingerprintLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.primary },
  createButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, marginTop: 20,
  },
  createButtonDisabled: { opacity: 0.5 },
  createButtonText: { color: colors.white, fontFamily: 'Inter_600SemiBold', fontSize: 16 },
});
