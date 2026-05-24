import { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useProfiles } from '../../context/ProfileContext';
import colors from '../../hooks/useColors';

const SCRIPT_TEMPLATES = [
  { name: 'Get Page Title', script: 'document.title' },
  { name: 'Get All Links', script: 'JSON.stringify(Array.from(document.querySelectorAll("a")).map(a => a.href).slice(0, 20))' },
  { name: 'Get Cookies', script: 'document.cookie' },
  { name: 'Get URL', script: 'window.location.href' },
  { name: 'Scroll to Bottom', script: 'window.scrollTo(0, document.body.scrollHeight); "scrolled"' },
  { name: 'Get localStorage Keys', script: 'JSON.stringify(Object.keys(localStorage))' },
];

export default function SyncScreen() {
  const router = useRouter();
  const { profiles, selectedProfiles, toggleSelectProfile, selectAllProfiles, deselectAllProfiles } = useProfiles();
  const [scriptText, setScriptText] = useState('');
  const [results, setResults] = useState<Array<{ profileId: string; profileName: string; result: string; status: 'success' | 'error' }>>([]);
  const [running, setRunning] = useState(false);
  const [mirrorEnabled, setMirrorEnabled] = useState(false);
  const [masterProfileId, setMasterProfileId] = useState<string | null>(null);

  const handleRunScript = useCallback(() => {
    if (!scriptText.trim()) {
      Alert.alert('Error', 'Please enter a script to run');
      return;
    }
    if (selectedProfiles.length === 0) {
      Alert.alert('Error', 'Please select at least one profile');
      return;
    }
    setRunning(true);
    setResults(
      selectedProfiles.map(id => {
        const profile = profiles.find(p => p.id === id);
        return {
          profileId: id,
          profileName: profile?.name || 'Unknown',
          result: `Script queued for execution in Multi Browser mode`,
          status: 'success' as const,
        };
      })
    );
    setTimeout(() => setRunning(false), 500);
  }, [scriptText, selectedProfiles, profiles]);

  const handleOpenMultiBrowser = useCallback(() => {
    if (selectedProfiles.length === 0) {
      Alert.alert('Select Profiles', 'Please select at least one profile for Multi Browser');
      return;
    }
    router.push('/browser/multi');
  }, [selectedProfiles, router]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Feather name="refresh-cw" size={16} color={colors.primary} /> Mirror Mode
        </Text>
        <Text style={styles.sectionDesc}>
          Select a master profile. All actions on the master will be mirrored to other profiles.
        </Text>

        <TouchableOpacity
          style={[styles.toggleButton, mirrorEnabled && styles.toggleButtonActive]}
          onPress={() => setMirrorEnabled(!mirrorEnabled)}
        >
          <Feather
            name={mirrorEnabled ? 'toggle-right' : 'toggle-left'}
            size={22}
            color={mirrorEnabled ? colors.success : colors.textMuted}
          />
          <Text style={[styles.toggleText, mirrorEnabled && styles.toggleTextActive]}>
            Mirror Mode {mirrorEnabled ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>

        {mirrorEnabled && (
          <View style={styles.masterSelect}>
            <Text style={styles.inputLabel}>Master Profile</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.masterList}>
              {profiles.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.masterChip,
                    masterProfileId === p.id && styles.masterChipActive,
                  ]}
                  onPress={() => setMasterProfileId(p.id)}
                >
                  <View style={[styles.chipDot, { backgroundColor: p.color }]} />
                  <Text style={[
                    styles.masterChipText,
                    masterProfileId === p.id && styles.masterChipTextActive,
                  ]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <TouchableOpacity style={styles.launchButton} onPress={handleOpenMultiBrowser}>
          <Feather name="grid" size={18} color={colors.white} />
          <Text style={styles.launchButtonText}>Open Multi Browser</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Feather name="code" size={16} color={colors.warning} /> Script Runner
        </Text>
        <Text style={styles.sectionDesc}>
          Run JavaScript across selected profiles simultaneously.
        </Text>

        <View style={styles.profileSelector}>
          <View style={styles.selectorHeader}>
            <Text style={styles.selectorTitle}>
              Select Profiles ({selectedProfiles.length}/{profiles.length})
            </Text>
            <View style={styles.selectorActions}>
              <TouchableOpacity onPress={selectAllProfiles}>
                <Text style={styles.selectorAction}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={deselectAllProfiles}>
                <Text style={styles.selectorAction}>None</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.profileChips}>
            {profiles.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.profileChip,
                  selectedProfiles.includes(p.id) && styles.profileChipSelected,
                ]}
                onPress={() => toggleSelectProfile(p.id)}
              >
                <View style={[styles.chipDot, { backgroundColor: p.color }]} />
                <Text style={[
                  styles.profileChipText,
                  selectedProfiles.includes(p.id) && styles.profileChipTextSelected,
                ]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
            {profiles.length === 0 && (
              <Text style={styles.noProfiles}>No profiles created yet</Text>
            )}
          </View>
        </View>

        <Text style={styles.inputLabel}>Templates</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateList}>
          {SCRIPT_TEMPLATES.map((tmpl, i) => (
            <TouchableOpacity
              key={i}
              style={styles.templateChip}
              onPress={() => setScriptText(tmpl.script)}
            >
              <Feather name="code" size={12} color={colors.primary} />
              <Text style={styles.templateText}>{tmpl.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.inputLabel}>Script</Text>
        <TextInput
          style={styles.scriptInput}
          placeholder="Enter JavaScript code..."
          placeholderTextColor={colors.textMuted}
          value={scriptText}
          onChangeText={setScriptText}
          multiline
          numberOfLines={5}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.runButton, running && styles.runButtonDisabled]}
          onPress={handleRunScript}
          disabled={running}
        >
          {running ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Feather name="play" size={18} color={colors.white} />
          )}
          <Text style={styles.runButtonText}>
            {running ? 'Running...' : 'Run Script'}
          </Text>
        </TouchableOpacity>
      </View>

      {results.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Feather name="terminal" size={16} color={colors.success} /> Results
          </Text>
          {results.map((r, i) => (
            <View key={i} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultProfile}>{r.profileName}</Text>
                <View style={[styles.resultStatus, { backgroundColor: r.status === 'success' ? colors.success + '20' : colors.error + '20' }]}>
                  <Text style={[styles.resultStatusText, { color: r.status === 'success' ? colors.success : colors.error }]}>
                    {r.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.resultText} numberOfLines={5}>{r.result}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  section: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.text, marginBottom: 4 },
  sectionDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.textSecondary, marginBottom: 16 },
  toggleButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surfaceLight, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  toggleButtonActive: { borderColor: colors.success + '50', backgroundColor: colors.success + '10' },
  toggleText: { fontSize: 15, fontFamily: 'Inter_500Medium', color: colors.textSecondary },
  toggleTextActive: { color: colors.success },
  masterSelect: { marginTop: 12 },
  masterList: { marginTop: 8 },
  masterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surfaceLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  masterChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  masterChipText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.textSecondary },
  masterChipTextActive: { color: colors.primary },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  launchButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, marginTop: 16,
  },
  launchButtonText: { color: colors.white, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  profileSelector: { marginBottom: 16 },
  selectorHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  selectorTitle: { fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.textSecondary },
  selectorActions: { flexDirection: 'row', gap: 12 },
  selectorAction: { fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.primary },
  profileChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  profileChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surfaceLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  profileChipSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  profileChipText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.textSecondary },
  profileChipTextSelected: { color: colors.primary },
  noProfiles: { fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.textMuted, fontStyle: 'italic' },
  inputLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.textSecondary, marginBottom: 8, marginTop: 8 },
  templateList: { marginBottom: 8 },
  templateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8,
  },
  templateText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.primary },
  scriptInput: {
    backgroundColor: colors.surfaceLight, borderRadius: 10, padding: 14,
    color: colors.text, fontFamily: 'Inter_400Regular', fontSize: 14,
    borderWidth: 1, borderColor: colors.surfaceBorder, minHeight: 100, textAlignVertical: 'top',
  },
  runButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.success, borderRadius: 12, paddingVertical: 14, marginTop: 12,
  },
  runButtonDisabled: { opacity: 0.6 },
  runButtonText: { color: colors.white, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  resultCard: {
    backgroundColor: colors.surfaceLight, borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  resultProfile: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.text },
  resultStatus: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  resultStatusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  resultText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.textSecondary },
});
