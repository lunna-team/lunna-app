import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { colors, radius, spacing } from '../../theme';

export function DoctorCardTemplateScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Template do Cartão" />
      <View style={s.body}>
        <View style={s.card}>
          <Text style={s.icon}>🖥️</Text>
          <Text style={s.title}>Edite pelo portal web</Text>
          <Text style={s.subtitle}>
            A configuração do template do cartão de gestante foi movida para o portal Lunna Web, onde é possível adicionar, remover e reordenar seções com mais facilidade.
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  icon: { fontSize: 40, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMid, textAlign: 'center', lineHeight: 21 },
});
