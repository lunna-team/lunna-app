import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

interface Props {
  value: string;
  label: string;
  valueColor?: string;
}

export function StatBox({ value, label, valueColor }: Props) {
  return (
    <View style={styles.box}>
      <Text style={[styles.value, valueColor ? { color: valueColor } : {}]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  value: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  label: { fontSize: 10, fontWeight: '600', color: colors.textInactive, textAlign: 'center' },
});
