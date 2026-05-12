import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../theme';

const AGENDA = [
  { hora: '08:30', paciente: 'Maria da Silva', medico: 'Dra. Ana Lima', status: 'done' },
  { hora: '09:00', paciente: 'Carla Mendes', medico: 'Dra. Ana Lima', status: 'done' },
  { hora: '10:00', paciente: 'Fernanda Costa', medico: 'Dra. Ana Lima', status: 'now' },
  { hora: '11:00', paciente: 'Juliana Rocha', medico: 'Dra. Ana Lima', status: 'confirmed' },
  { hora: '14:00', paciente: 'Patrícia Souza', medico: 'Dra. Ana Lima', status: 'pending' },
];

const ACOES = [
  { icon: '📅', label: 'Novo Agendamento' },
  { icon: '👤', label: 'Cadastrar Paciente' },
  { icon: '📲', label: 'Enviar Lembrete' },
  { icon: '📊', label: 'Relatório do Dia' },
];

const PACIENTES = [
  { iniciais: 'MS', nome: 'Maria da Silva', prontuario: '2024-00847', semana: 24 },
  { iniciais: 'CM', nome: 'Carla Mendes', prontuario: '2024-00312', semana: 20 },
  { iniciais: 'FC', nome: 'Fernanda Costa', prontuario: '2024-00589', semana: 10 },
  { iniciais: 'JR', nome: 'Juliana Rocha', prontuario: '2024-00201', semana: 32 },
  { iniciais: 'PS', nome: 'Patrícia Souza', prontuario: '2024-00734', semana: 36 },
  { iniciais: 'AB', nome: 'Ana Beatriz Fonseca', prontuario: '2024-00892', semana: 14 },
];

const statusInfo = (s: string) => {
  if (s === 'done') return { bg: 'rgba(141,170,145,0.15)', color: colors.primaryDk, label: 'Realizada' };
  if (s === 'now') return { bg: 'rgba(229,152,125,0.18)', color: colors.accent, label: 'Em curso' };
  if (s === 'confirmed') return { bg: 'rgba(141,170,145,0.1)', color: colors.primary, label: 'Confirmada' };
  return { bg: 'rgba(245,166,35,0.12)', color: colors.yellow, label: 'Pendente' };
};

export function DashboardSecretariaScreen() {
  const [busca, setBusca] = useState('');
  const insets = useSafeAreaInsets();

  const filtradas = PACIENTES.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) || p.prontuario.includes(busca)
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View>
            <Text style={styles.role}>Secretaria</Text>
            <Text style={styles.name}>Bom dia, Juliana 👋</Text>
            <Text style={styles.date}>Terça, 15 de Abril de 2026</Text>
          </View>
          <View style={styles.avatar}><Text style={{ fontSize: 20 }}>📋</Text></View>
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          {[['8', 'Consultas'], ['5', 'Confirmadas'], ['3', 'Pendentes'], ['24', 'Pacientes']].map(([v, l]) => (
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

        {/* AGENDA */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Agenda de Hoje</Text>
        {AGENDA.map((a) => {
          const { bg, color, label } = statusInfo(a.status);
          return (
            <View key={a.hora} style={[styles.apptCard, a.status === 'now' && { borderWidth: 1.5, borderColor: colors.accent }]}>
              <Text style={[styles.hora, a.status === 'now' && { color: colors.accent }]}>{a.hora}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.apptName}>{a.paciente}</Text>
                <Text style={styles.apptMedico}>{a.medico}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: bg }]}>
                <Text style={[styles.badgeText, { color }]}>{label}</Text>
              </View>
            </View>
          );
        })}

        {/* BUSCA DE PACIENTES */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Pacientes</Text>
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: 12 }}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome ou prontuário..."
            placeholderTextColor={colors.textInactive}
            value={busca}
            onChangeText={setBusca}
          />
        </View>
        {filtradas.map((p) => (
          <View key={p.prontuario} style={styles.pacienteCard}>
            <View style={styles.pacienteAvatar}><Text style={styles.pacienteAvatarText}>{p.iniciais}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pacienteNome}>{p.nome}</Text>
              <Text style={styles.pacienteMeta}>Prontuário {p.prontuario}</Text>
            </View>
            <View style={styles.weekBadge}>
              <Text style={styles.weekText}>Sem. {p.semana}</Text>
            </View>
          </View>
        ))}
        {filtradas.length === 0 && (
          <Text style={styles.emptyText}>Nenhuma paciente encontrada</Text>
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
