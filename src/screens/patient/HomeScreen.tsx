import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PatientStackParams } from '../../navigation/PatientNavigator';
import { storage, STORAGE_KEYS } from '../../services/storage';
import { appointmentsService } from '../../services/appointments';
import { patientsService } from '../../services/patients';
import { announcementsService } from '../../services/announcements';
import { useAuth } from '../../contexts/AuthContext';
import type { Appointment, Announcement } from '../../types';
import { colors, spacing, radius } from '../../theme';

type Nav = NativeStackNavigationProp<PatientStackParams>;

const TOTAL_WEEKS = 42;

const quickActions = [
  { label: 'Exames',      icon: '🔬', screen: 'AreaMedica' },
  { label: 'Chat',        icon: '💬', screen: 'Chat' },
  { label: 'Meus Meds',  icon: '💊', screen: 'AreaMedica' },
  { label: 'Consultas',  icon: '📅', screen: 'Consultas' },
  { label: 'Nomes',      icon: '✨', screen: 'Nomes' },
  { label: 'Contrações', icon: '⏱️', screen: 'Contracoes' },
  { label: 'Pressão',    icon: '💓', screen: 'Pressao' },
  { label: 'Glicose',    icon: '🩸', screen: 'Glicose' },
] as const;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [loadingAppt, setLoadingAppt] = useState(true);
  const [semana, setSemana] = useState(0);
  const [avisos, setAvisos] = useState<Announcement[]>([]);

  useEffect(() => {
    storage.get<boolean>(STORAGE_KEYS.onboarded).then((v) => {
      if (!v) navigation.replace('Onboarding');
    });
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    appointmentsService
      .listPatientAppointments(user.id, { status: 'confirmed', limit: 1, offset: 0 })
      .then((res) => setNextAppointment(res.data[0] ?? null))
      .catch(() => setNextAppointment(null))
      .finally(() => setLoadingAppt(false));
    patientsService
      .getProntuario(user.id)
      .then((p) => setSemana(p.current_week ?? 0))
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!user?.clinic_id) return;
    announcementsService
      .list(user.clinic_id, { limit: 2 })
      .then((res) => setAvisos(res.data))
      .catch(() => {});
  }, [user?.clinic_id]);

  const firstName = user?.name?.split(' ')[0] ?? 'você';
  const progress = semana > 0 ? semana / TOTAL_WEEKS : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View>
            <Text style={styles.greeting}>Olá, {firstName} 👋</Text>
            <Text style={styles.weekText}>Semana {semana} de gestação</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('') ?? '??'}
            </Text>
          </View>
        </View>

        {/* PROGRESSO */}
        <View style={styles.progressCard}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            Semana {semana} de {TOTAL_WEEKS} · {Math.round(progress * 100)}%
          </Text>
        </View>

        {/* ATALHOS RÁPIDOS */}
        <Text style={styles.sectionTitle}>Atalhos Rápidos</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}
        >
          {quickActions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.quickBtn}
              onPress={() => navigation.navigate(a.screen as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.quickIcon}>{a.icon}</Text>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* CARD FETO 3D */}
        <TouchableOpacity
          style={styles.feto3dCard}
          onPress={() => navigation.navigate('Feto3D')}
          activeOpacity={0.9}
        >
          <View>
            <Text style={styles.feto3dTitle}>Seu bebê esta semana</Text>
            <Text style={styles.feto3dSub}>Tamanho de um milho 🌽</Text>
            <View style={styles.feto3dBtn}>
              <Text style={styles.feto3dBtnText}>VER EM 3D</Text>
            </View>
          </View>
          <Text style={{ fontSize: 64 }}>👶</Text>
        </TouchableOpacity>

        {/* PRONTUÁRIO */}
        <TouchableOpacity
          style={styles.prontuarioCard}
          onPress={() => navigation.navigate('Prontuario')}
        >
          <Text style={styles.prontuarioIcon}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.prontuarioTitle}>Meu Prontuário</Text>
            <Text style={styles.prontuarioSub}>Toque para ver detalhes</Text>
          </View>
          <Text style={{ fontSize: 18, color: colors.primary }}>›</Text>
        </TouchableOpacity>

        {/* AVISOS */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Avisos da Clínica</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Avisos')}>
            <Text style={styles.sectionLink}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        {avisos.length === 0 ? (
          <View style={styles.avisoCard}>
            <Text style={styles.avisoText}>Nenhum aviso no momento.</Text>
          </View>
        ) : (
          avisos.map((a) => (
            <View key={a.id} style={[styles.avisoCard, { marginBottom: 8 }]}>
              {a.is_new && (
                <View style={styles.avisoBadge}>
                  <Text style={styles.avisoBadgeText}>Novo</Text>
                </View>
              )}
              <Text style={styles.avisoText}>{a.title}</Text>
            </View>
          ))
        )}

        {/* PRÓXIMA CONSULTA */}
        <TouchableOpacity
          style={styles.consultaCard}
          onPress={() => navigation.navigate('Consultas')}
        >
          {loadingAppt ? (
            <ActivityIndicator color={colors.white} />
          ) : nextAppointment ? (
            <>
              <Text style={styles.consultaLabel}>Próxima consulta</Text>
              <Text style={styles.consultaDate}>
                {formatDate(nextAppointment.datetime)} · {nextAppointment.time.slice(0, 5)}
              </Text>
              <Text style={styles.consultaLocal}>
                {nextAppointment.location ?? 'Clínica Gerar Vida'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.consultaLabel}>Consultas</Text>
              <Text style={styles.consultaDate}>Nenhuma consulta agendada</Text>
              <Text style={styles.consultaLocal}>Toque para ver histórico</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white },
  greeting: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  weekText: { fontSize: 12, color: colors.textMid, marginTop: 2 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primaryDk },
  progressCard: { backgroundColor: colors.white, marginHorizontal: spacing.lg, marginTop: 16, borderRadius: radius.md, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  progressBar: { height: 8, backgroundColor: colors.bg, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  progressLabel: { fontSize: 11, color: colors.textMid, marginTop: 8, textAlign: 'right' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginHorizontal: spacing.lg, marginTop: 24, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: spacing.lg, marginTop: 24, marginBottom: 12 },
  sectionLink: { fontSize: 12, fontWeight: '600', color: colors.primary },
  quickRow: { paddingHorizontal: spacing.lg, gap: 12 },
  quickBtn: { alignItems: 'center', gap: 6, width: 64 },
  quickIcon: { fontSize: 28, backgroundColor: colors.white, width: 56, height: 56, textAlign: 'center', lineHeight: 56, borderRadius: radius.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  quickLabel: { fontSize: 10, fontWeight: '600', color: colors.textMid, textAlign: 'center' },
  feto3dCard: { marginHorizontal: spacing.lg, marginTop: 16, backgroundColor: colors.darkCard, borderRadius: radius.lg, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feto3dTitle: { fontSize: 16, fontWeight: '700', color: colors.white, marginBottom: 4 },
  feto3dSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  feto3dBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, alignSelf: 'flex-start' },
  feto3dBtnText: { fontSize: 11, fontWeight: '700', color: colors.white, letterSpacing: 0.5 },
  prontuarioCard: { marginHorizontal: spacing.lg, marginTop: 12, backgroundColor: colors.white, borderRadius: radius.md, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  prontuarioIcon: { fontSize: 24 },
  prontuarioTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  prontuarioSub: { fontSize: 12, color: colors.textMid, marginTop: 2 },
  avisoCard: { marginHorizontal: spacing.lg, backgroundColor: colors.white, borderRadius: radius.md, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avisoBadge: { backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, alignSelf: 'flex-start', marginBottom: 8 },
  avisoBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  avisoText: { fontSize: 13, color: colors.text },
  consultaCard: { marginHorizontal: spacing.lg, marginTop: 12, marginBottom: 24, backgroundColor: colors.primary, borderRadius: radius.lg, padding: 20, minHeight: 80, justifyContent: 'center' },
  consultaLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  consultaDate: { fontSize: 20, fontWeight: '800', color: colors.white, letterSpacing: -0.3 },
  consultaLocal: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
});
