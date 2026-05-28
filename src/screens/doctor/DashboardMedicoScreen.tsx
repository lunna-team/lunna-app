import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import Svg, { Path, Rect, Line, Circle, Polyline } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DoctorStackParams } from '../../navigation/DoctorNavigator';
import { RiskBadge } from '../../components/domain/RiskBadge';
import { patientsService } from '../../services/patients';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../theme';
import type { DoctorDashboard, AgendaResponse, AgendaAppointment, PatientDetail, RiskLevel } from '../../types';

type Nav = NativeStackNavigationProp<DoctorStackParams>;

const NAV_H = 72;

const RISK_BADGE_MAP: Record<RiskLevel, 'low' | 'med' | 'high'> = {
  low: 'low', medium: 'med', high: 'high',
};

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function durationLabel(minutes: number): string {
  return minutes >= 60 ? `${minutes / 60}h` : `${minutes}min`;
}

// ── SVG ICONS ────────────────────────────────────────────────────────────────

function IconHospital({ color = 'rgba(255,255,255,0.85)' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="3" width="18" height="18" rx="3" />
      <Path d="M9 22V12h6v10M3 9h18M12 3v6" />
    </Svg>
  );
}

function IconHome({ active }: { active?: boolean }) {
  const c = active ? colors.primary : colors.textInactive;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Polyline points="9 22 9 12 15 12 15 22" />
    </Svg>
  );
}

function IconPacientes({ active }: { active?: boolean }) {
  const c = active ? colors.primary : colors.textInactive;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

function IconAgenda({ active }: { active?: boolean }) {
  const c = active ? colors.primary : colors.textInactive;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  );
}

function IconChat({ active }: { active?: boolean }) {
  const c = active ? colors.primary : colors.textInactive;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

function IconAlert({ red }: { red?: boolean }) {
  const c = red ? colors.red : colors.accent;
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Line x1="12" y1="8" x2="12" y2="12" />
      <Line x1="12" y1="16" x2="12.01" y2="16" />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function currentDatePt(): string {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function DashboardMedicoScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [dashboard, setDashboard] = useState<DoctorDashboard | null>(null);
  const [agenda, setAgenda] = useState<AgendaAppointment[]>([]);
  const [pacientes, setPacientes] = useState<PatientDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      patientsService.getDoctorDashboard(user.id),
      patientsService.getDoctorAgenda(user.id, 'day'),
      patientsService.getDoctorPatients(user.id, { limit: 5 }),
    ])
      .then(([db, ag, pt]) => {
        setDashboard(db);
        setAgenda((ag as AgendaResponse).appointments ?? []);
        setPacientes(pt.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const firstName = user?.name?.split(' ')[0] ?? '';
  const greeting = `Bom dia, ${firstName} 👋`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={{ paddingBottom: NAV_H + insets.bottom + 16 }}>
        {/* HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View>
            <Text style={styles.role}>Painel Médico</Text>
            <Text style={styles.name}>{greeting}</Text>
            <Text style={styles.date}>{currentDatePt()}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user?.name ?? '??')}</Text>
          </View>
        </View>

        {/* CLINIC BADGE */}
        <View style={styles.clinicBadge}>
          <IconHospital />
          <Text style={styles.clinicText}>Clínica Gerar Vida · Obstetra</Text>
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          {([
            [String(dashboard?.appointments_today ?? '—'), 'Consultas hoje', colors.primaryDk],
            [String(dashboard?.active_patients ?? '—'), 'Pacientes ativas', colors.text],
          ] as [string, string, string][]).map(([v, l, c]) => (
            <View key={l} style={styles.statCard}>
              <Text style={[styles.statNum, { color: c }]}>{v}</Text>
              <Text style={styles.statLabel}>{l}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <>
            {/* AGENDA */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Agenda de Hoje</Text>
                <TouchableOpacity onPress={() => navigation.navigate('AgendaMedico')}>
                  <Text style={styles.sectionLink}>Ver tudo</Text>
                </TouchableOpacity>
              </View>
              {agenda.length === 0 && <Text style={styles.empty}>Nenhum item na agenda de hoje.</Text>}
              {agenda.slice(0, 4).map((a) => {
                const isDone = a.status === 'completed';
                return (
                  <View key={a.id} style={[styles.apptCard, a.status === 'pending' && { borderWidth: 1.5, borderColor: colors.accent }]}>
                    <View style={styles.timeCol}>
                      <Text style={[styles.hora, a.status === 'pending' && { color: colors.accent }]}>
                        {a.time.slice(0, 5)}
                      </Text>
                      <Text style={styles.dur}>{durationLabel(a.duration_minutes)}</Text>
                    </View>
                    <View style={[styles.divider, isDone ? styles.divDone : styles.divNext]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.apptType}>{a.type}</Text>
                      {a.location ? <Text style={styles.apptType} numberOfLines={1}>{a.location}</Text> : null}
                    </View>
                    <View style={[styles.apptBadge, isDone ? styles.bdDone : styles.bdNext]}>
                      <Text style={[styles.apptBadgeText, { color: isDone ? colors.primaryDk : colors.textMid }]}>
                        {isDone ? 'Realizada' : a.status === 'confirmed' ? 'Confirmada' : 'Pendente'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* PACIENTES */}
            <View style={[styles.sectionWrap, { marginTop: 24 }]}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Minhas Pacientes</Text>
                <TouchableOpacity onPress={() => navigation.navigate('MedicoPacientes')}>
                  <Text style={styles.sectionLink}>Ver todas</Text>
                </TouchableOpacity>
              </View>
              {pacientes.map((p) => {
                const risk = RISK_BADGE_MAP[p.risk_level];
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.patientCard}
                    onPress={() => navigation.navigate('PacienteDetalhe', { patientId: p.id })}
                    activeOpacity={0.85}
                  >
                    <View style={[
                      styles.pAvatar,
                      p.risk_level === 'high' && { backgroundColor: 'rgba(225,91,91,0.12)' },
                      p.risk_level === 'medium' && { backgroundColor: 'rgba(245,166,35,0.15)' },
                    ]}>
                      <Text style={[
                        styles.pAvatarText,
                        p.risk_level === 'high' && { color: '#B33A3A' },
                        p.risk_level === 'medium' && { color: '#B87A00' },
                      ]}>{getInitials(p.name)}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.pName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.pMeta}>
                        {p.edd ? `DPP: ${new Date(p.edd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}` : ''}
                        {p.current_week ? ` · Sem. ${p.current_week}` : ''}
                      </Text>
                    </View>
                    <View style={styles.pRight}>
                      {p.current_week != null && (
                        <View style={styles.weekBadge}>
                          <Text style={styles.weekBadgeText}>Sem. {p.current_week}</Text>
                        </View>
                      )}
                      <RiskBadge risk={risk} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* BOTTOM NAV */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
          <IconHome active />
          <Text style={[styles.navLabel, { color: colors.primary }]}>Início</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={() => navigation.navigate('MedicoPacientes')}>
          <IconPacientes />
          <Text style={styles.navLabel}>Pacientes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={() => navigation.navigate('AgendaMedico')}>
          <IconAgenda />
          <Text style={styles.navLabel}>Agenda</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
          <IconChat />
          <Text style={styles.navLabel}>Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  role: { fontSize: 12, fontWeight: '600', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  name: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  date: { fontSize: 12, color: colors.textMid, marginTop: 2 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: colors.primaryLight },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primaryDk },

  clinicBadge: { backgroundColor: colors.primary, marginHorizontal: spacing.lg, marginTop: 20, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  clinicText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.95)' },

  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: spacing.lg, paddingTop: 20 },
  statCard: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statNum: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, lineHeight: 26 },
  statLabel: { fontSize: 10, fontWeight: '600', color: colors.textInactive, textAlign: 'center', lineHeight: 13 },

  sectionWrap: { paddingHorizontal: spacing.lg, paddingTop: 24 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  sectionLink: { fontSize: 12, fontWeight: '600', color: colors.primary },

  apptCard: { backgroundColor: colors.white, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  timeCol: { width: 44, alignItems: 'center', flexShrink: 0 },
  hora: { fontSize: 13, fontWeight: '700', color: colors.primaryDk },
  dur: { fontSize: 10, color: colors.textInactive, marginTop: 2 },
  divider: { width: 2, height: 36, borderRadius: 99, flexShrink: 0 },
  divDone: { backgroundColor: colors.primaryLight },
  divNow: { backgroundColor: colors.accent },
  divNext: { backgroundColor: '#e8ece8' },
  apptName: { fontSize: 14, fontWeight: '700', color: colors.text },
  apptType: { fontSize: 11.5, color: colors.textMid, marginTop: 2 },
  apptBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, flexShrink: 0 },
  bdDone: { backgroundColor: 'rgba(141,170,145,0.15)' },
  bdNow: { backgroundColor: 'rgba(229,152,125,0.18)' },
  bdNext: { backgroundColor: colors.bg },
  apptBadgeText: { fontSize: 10, fontWeight: '700' },

  patientCard: { backgroundColor: colors.white, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  pAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.primaryLight, flexShrink: 0 },
  pAvatarText: { fontSize: 16, fontWeight: '700', color: colors.primaryDk },
  pName: { fontSize: 14, fontWeight: '700', color: colors.text },
  pMeta: { fontSize: 11.5, color: colors.textMid, marginTop: 3 },
  alertChip: { backgroundColor: 'rgba(229,152,125,0.12)', borderRadius: radius.full, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 5 },
  alertText: { fontSize: 10.5, fontWeight: '600', color: colors.accent },
  pRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  weekBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  weekBadgeText: { fontSize: 11, fontWeight: '700', color: colors.primaryDk },

  center: { paddingTop: 40, alignItems: 'center' },
  empty: { fontSize: 13, color: colors.textMid, textAlign: 'center', marginBottom: 16 },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.07)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 10,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 4 },
  navLabel: { fontSize: 9.5, fontWeight: '600', color: colors.textInactive },
});
