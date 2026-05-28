import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { patientsService } from '../../services/patients';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../theme';
import type { SecretaryDashboard } from '../../types';

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

const ACOES = [
  { icon: '📅', label: 'Novo Agendamento' },
  { icon: '👤', label: 'Cadastrar Paciente' },
  { icon: '📲', label: 'Enviar Lembrete' },
  { icon: '📊', label: 'Relatório do Dia' },
];

export function DashboardSecretariaScreen() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<SecretaryDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    patientsService.getSecretaryDashboard()
      .then((db) => setDashboard(db))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);


  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View>
            <Text style={styles.role}>Secretaria</Text>
            <Text style={styles.name}>Bom dia, {firstName} 👋</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <View style={styles.avatar}><Text style={{ fontSize: 20 }}>📋</Text></View>
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          {[
            [String(dashboard?.appointments_today ?? '—'), 'Consultas'],
            [String(dashboard?.confirmed ?? '—'), 'Confirmadas'],
            [String(dashboard?.pending ?? '—'), 'Pendentes'],
            [String(dashboard?.total_patients ?? '—'), 'Pacientes'],
          ].map(([v, l]) => (
            <View key={l} style={styles.statCard}>
              <Text style={styles.statNum}>{v}</Text>
              <Text style={styles.statLabel}>{l}</Text>
            </View>
          ))}
        </View>

        {/* AÇÕES RÁPIDAS */}
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        <View style={styles.acoesGrid}>
          {ACOES.map((a) => (
            <TouchableOpacity key={a.label} style={styles.acaoCard} activeOpacity={0.8}>
              <Text style={{ fontSize: 28 }}>{a.icon}</Text>
              <Text style={styles.acaoLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* STATS LOADING */}
        {loading && (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 24 }]}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.darkCard, paddingHorizontal: spacing.lg, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  role: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  name: { fontSize: 22, fontWeight: '800', color: colors.white, letterSpacing: -0.4 },
  date: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, padding: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statNum: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 9, fontWeight: '600', color: colors.textInactive, textAlign: 'center', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginHorizontal: spacing.lg, marginBottom: 12 },
  acoesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: spacing.lg },
  acaoCard: { width: '47%', backgroundColor: colors.white, borderRadius: radius.md, padding: 16, alignItems: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  acaoLabel: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center' },
  apptCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: spacing.lg, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  hora: { fontSize: 13, fontWeight: '700', color: colors.primaryDk, width: 44 },
  apptName: { fontSize: 14, fontWeight: '700', color: colors.text },
  apptMedico: { fontSize: 11.5, color: colors.textMid, marginTop: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 10, fontWeight: '700' },
  searchInput: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, fontSize: 14, color: colors.text, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  pacienteCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: spacing.lg, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  pacienteAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  pacienteAvatarText: { fontSize: 14, fontWeight: '700', color: colors.primaryDk },
  pacienteNome: { fontSize: 14, fontWeight: '700', color: colors.text },
  pacienteMeta: { fontSize: 11.5, color: colors.textMid, marginTop: 1 },
  weekBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  weekText: { fontSize: 11, fontWeight: '700', color: colors.primaryDk },
  emptyText: { textAlign: 'center', color: colors.textInactive, fontSize: 13, paddingVertical: 16 },
  fab: { position: 'absolute', right: spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  fabText: { fontSize: 28, color: colors.white, fontWeight: '300', marginTop: -2 },
});
