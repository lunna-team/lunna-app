import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, spacing, radius } from '../../theme';

const DIA = [
  { hora: '08:00', paciente: 'Maria da Silva', tipo: 'Pré-natal', dur: '30min', status: 'done' },
  { hora: '08:30', paciente: 'Carla Mendes', tipo: 'Ultrassom', dur: '45min', status: 'done' },
  { hora: '10:00', paciente: 'Fernanda Costa', tipo: '1º Trimestre', dur: '30min', status: 'now' },
  { hora: '11:00', paciente: 'Juliana Rocha', tipo: 'Retorno', dur: '30min', status: 'next' },
  { hora: '14:00', paciente: 'Patrícia Souza', tipo: 'Urgência', dur: '45min', status: 'next' },
  { hora: '15:00', paciente: 'Ana Beatriz', tipo: 'Pré-natal', dur: '30min', status: 'next' },
];

const SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const PARTOS = [
  { nome: 'Juliana Rocha', dpp: '02 Mai 2025', semana: 32, tipo: 'Normal', hospital: 'Clínica Gerar Vida' },
  { nome: 'Patrícia Souza', dpp: '18 Abr 2025', semana: 36, tipo: 'Cesárea planejada', hospital: 'Hospital Santa Cruz' },
  { nome: 'Maria da Silva', dpp: '02 Jul 2025', semana: 24, tipo: 'A definir', hospital: 'Clínica Gerar Vida' },
];

export function AgendaMedicoScreen() {
  const [tab, setTab] = useState<'dia' | 'semana' | 'partos'>('dia');
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Agenda" />
      <View style={styles.tabs}>
        {(['dia', 'semana', 'partos'] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'dia' ? 'Dia' : t === 'semana' ? 'Semana' : 'Partos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        {tab === 'dia' && DIA.map((a) => (
          <View key={a.hora} style={[styles.apptCard, a.status === 'now' && { borderWidth: 1.5, borderColor: colors.accent }]}>
            <View style={styles.timeCol}>
              <Text style={[styles.hora, a.status === 'now' && { color: colors.accent }]}>{a.hora}</Text>
              <Text style={styles.dur}>{a.dur}</Text>
            </View>
            <View style={[styles.divider, a.status === 'done' ? { backgroundColor: colors.primaryLight } : a.status === 'now' ? { backgroundColor: colors.accent } : { backgroundColor: '#e8ece8' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.apptName}>{a.paciente}</Text>
              <Text style={styles.apptType}>{a.tipo}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: a.status === 'done' ? 'rgba(141,170,145,0.15)' : a.status === 'now' ? 'rgba(229,152,125,0.18)' : colors.bg }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: a.status === 'done' ? colors.primaryDk : a.status === 'now' ? colors.accent : colors.textMid }}>
                {a.status === 'done' ? 'Realizada' : a.status === 'now' ? 'Agora' : 'Próxima'}
              </Text>
            </View>
          </View>
        ))}

        {tab === 'semana' && (
          <View style={styles.weekGrid}>
            {SEMANA.map((d, i) => (
              <View key={d} style={[styles.weekCol, i === 1 && { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.weekDay, i === 1 && { color: colors.primaryDk }]}>{d}</Text>
                <Text style={styles.weekNum}>{10 + i}</Text>
                <Text style={styles.weekCount}>{[3, 4, 2, 3, 2][i]} consultas</Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'partos' && PARTOS.map((p) => (
          <View key={p.nome} style={styles.partoCard}>
            <View style={styles.dppBadge}><Text style={styles.dppText}>{p.dpp}</Text></View>
            <Text style={styles.partoName}>{p.nome}</Text>
            <Text style={styles.partoMeta}>Semana {p.semana} · {p.tipo}</Text>
            <Text style={styles.partoHospital}>🏥 {p.hospital}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: 'row', backgroundColor: colors.white, padding: 6, margin: spacing.lg, borderRadius: radius.md },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMid },
  tabTextActive: { color: colors.white },
  apptCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  timeCol: { width: 44, alignItems: 'center' },
  hora: { fontSize: 13, fontWeight: '700', color: colors.primaryDk },
  dur: { fontSize: 10, color: colors.textInactive, marginTop: 2 },
  divider: { width: 2, height: 36, borderRadius: 1 },
  apptName: { fontSize: 14, fontWeight: '700', color: colors.text },
  apptType: { fontSize: 11.5, color: colors.textMid, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  weekGrid: { flexDirection: 'row', gap: 8 },
  weekCol: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: 12, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  weekDay: { fontSize: 11, fontWeight: '600', color: colors.textMid },
  weekNum: { fontSize: 20, fontWeight: '800', color: colors.text },
  weekCount: { fontSize: 9, color: colors.textInactive, textAlign: 'center' },
  partoCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  dppBadge: { backgroundColor: colors.accent + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, alignSelf: 'flex-start', marginBottom: 8 },
  dppText: { fontSize: 11, fontWeight: '700', color: colors.accent },
  partoName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  partoMeta: { fontSize: 13, color: colors.textMid, marginBottom: 4 },
  partoHospital: { fontSize: 12, color: colors.primary },
});
