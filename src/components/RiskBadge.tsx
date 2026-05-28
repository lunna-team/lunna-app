import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export type Risk = 'low' | 'med' | 'high';

const config: Record<Risk, { label: string; color: string }> = {
  low:  { label: 'Baixo risco', color: '#3CB371' },
  med:  { label: 'Atenção',     color: colors.yellow },
  high: { label: 'Alto risco',  color: colors.red },
};

interface Props { risk: Risk; }

export function RiskBadge({ risk }: Props) {
  const { label, color } = config[risk];
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 10, fontWeight: '600' },
});
