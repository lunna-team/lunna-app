import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography } from '../theme';

interface Props {
  title: string;
  showBack?: boolean;
}

export function ScreenHeader({ title, showBack = true }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      {showBack && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.title}>{title}</Text>
      {showBack && <View style={styles.placeholder} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  backBtn: { width: 32 },
  backArrow: { fontSize: 22, color: colors.primaryDk },
  title: { flex: 1, textAlign: 'center', ...typography.h3, color: colors.text },
  placeholder: { width: 32 },
});
