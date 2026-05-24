import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Switch,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfiles } from '../../context/ProfileContext';
import colors from '../../hooks/useColors';

export default function SettingsScreen() {
  const { profiles } = useProfiles();
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [autoSaveSession, setAutoSaveSession] = useState(true);
  const [defaultColumns, setDefaultColumns] = useState(2);

  const handleClearAllData = useCallback(() => {
    Alert.alert(
      'Clear All Data',
      'This will delete all profiles, sessions, and stored data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'All data cleared. Please restart the app.');
            } catch {
              Alert.alert('Error', 'Failed to clear data.');
            }
          },
        },
      ]
    );
  }, []);

  const handleExportData = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const exportObj: Record<string, string | null> = {};
      for (const key of keys) {
        const val = await AsyncStorage.getItem(key);
        exportObj[key] = val;
      }
      Alert.alert('Export', `${keys.length} keys ready for export. Data size: ${JSON.stringify(exportObj).length} bytes`);
    } catch {
      Alert.alert('Error', 'Failed to export data.');
    }
  }, []);

  const settingSections = [
    {
      title: 'General',
      items: [
        {
          icon: 'smartphone' as const,
          label: 'Haptic Feedback',
          description: 'Enable touch feedback',
          type: 'switch' as const,
          value: hapticEnabled,
          onToggle: () => setHapticEnabled(!hapticEnabled),
        },
        {
          icon: 'save' as const,
          label: 'Auto-Save Sessions',
          description: 'Automatically save browsing sessions',
          type: 'switch' as const,
          value: autoSaveSession,
          onToggle: () => setAutoSaveSession(!autoSaveSession),
        },
      ],
    },
    {
      title: 'Multi Browser',
      items: [
        {
          icon: 'grid' as const,
          label: 'Default Grid Columns',
          description: `Current: ${defaultColumns}x`,
          type: 'selector' as const,
          options: [1, 2, 3],
          value: defaultColumns,
          onSelect: (v: number) => setDefaultColumns(v),
        },
      ],
    },
    {
      title: 'Data',
      items: [
        {
          icon: 'download' as const,
          label: 'Export Data',
          description: `${profiles.length} profiles stored`,
          type: 'action' as const,
          onPress: handleExportData,
        },
        {
          icon: 'trash-2' as const,
          label: 'Clear All Data',
          description: 'Delete all profiles and sessions',
          type: 'danger' as const,
          onPress: handleClearAllData,
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.appInfo}>
        <View style={styles.appIconContainer}>
          <Feather name="globe" size={32} color={colors.primary} />
        </View>
        <Text style={styles.appName}>Browser Profile Manager</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
        <Text style={styles.appDesc}>
          Anti-detect browser profile manager for Expo Go
        </Text>
      </View>

      {settingSections.map((section, si) => (
        <View key={si} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item, ii) => (
            <View key={ii} style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Feather name={item.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, item.type === 'danger' && { color: colors.error }]}>
                  {item.label}
                </Text>
                <Text style={styles.settingDesc}>{item.description}</Text>
              </View>
              {item.type === 'switch' && (
                <Switch
                  value={item.value as boolean}
                  onValueChange={item.onToggle}
                  trackColor={{ false: colors.surfaceBorder, true: colors.primary + '60' }}
                  thumbColor={item.value ? colors.primary : colors.textMuted}
                />
              )}
              {item.type === 'selector' && (
                <View style={styles.selectorRow}>
                  {(item.options as number[]).map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.selectorOption,
                        item.value === opt && styles.selectorOptionActive,
                      ]}
                      onPress={() => (item.onSelect as (v: number) => void)(opt)}
                    >
                      <Text style={[
                        styles.selectorOptionText,
                        item.value === opt && styles.selectorOptionTextActive,
                      ]}>{opt}x</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {(item.type === 'action' || item.type === 'danger') && (
                <TouchableOpacity onPress={item.onPress}>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={item.type === 'danger' ? colors.error : colors.textMuted}
                  />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Built with Expo SDK 56 + React Native</Text>
        <Text style={styles.footerText}>Dark Cyber Indigo Theme</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  appInfo: {
    alignItems: 'center', paddingVertical: 24,
    backgroundColor: colors.surface, borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  appIconContainer: {
    width: 64, height: 64, borderRadius: 18, backgroundColor: colors.primary + '20',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  appName: { fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.text },
  appVersion: { fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.textMuted, marginTop: 2 },
  appDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
  section: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
  },
  settingIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary + '15',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: 15, fontFamily: 'Inter_500Medium', color: colors.text },
  settingDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.textMuted, marginTop: 2 },
  selectorRow: { flexDirection: 'row', gap: 6 },
  selectorOption: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  selectorOptionActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  selectorOptionText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.textMuted },
  selectorOptionTextActive: { color: colors.primary },
  footer: { alignItems: 'center', paddingVertical: 24 },
  footerText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.textMuted, marginBottom: 4 },
});
