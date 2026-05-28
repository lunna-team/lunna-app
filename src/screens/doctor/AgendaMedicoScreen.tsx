import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { patientsService } from '../../services/patients';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../theme';
import type { AgendaView, AgendaAppointment, BirthItem, AppointmentStatus } from '../../types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function durationLabel(minutes: number): string {
  return minutes >= 60 ? `${minutes / 60}h` : `${minutes}min`;
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
  completed: 'Realizada',
  cancelled: 'Cancelada',
};

export function AgendaMedicoScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<AgendaView>('day');
  const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
  const [births, setBirths] = useState<BirthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    patientsService
      .getDoctorAgenda(user.id, tab)
      .then((res) => {
        if (tab === 'births') {
          setAppointments([]);
          setBirths(res.upcoming_births ?? []);
        } else {
          setAppointments(res.appointments ?? []);
          setBirths([]);
        }
      })
      .catch(() => { setAppointments([]); setBirths([]); })
      .finally(() => setLoading(false));
  }, [user?.id, tab]);

  const tabLabel = (t: AgendaView) =>
    t === 'day' ? 'Dia' : t === 'week' ? 'Semana' : 'Partos';

  const getBadgeStyle = (status: AppointmentStatus) => {
    if (status === 'completed') return { bg: 'rgba(141,170,145,0.15)', color: colors.primaryDk };
    if (status === 'confirmed') return { bg: 'rgba(141,170,145,0.1)', color: colors.primary };
    return { bg: colors.bg, color: colors.textMid };
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Agenda" />
      <View style={styles.tabs}>
        {(['day', 'week', 'births'] as AgendaView[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {tabLabel(t)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
          {(tab === 'day' || tab === 'week') && (
            <>
              {appointments.length === 0 && (
                <Text style={styles.empty}>Nenhum item na agenda.</Text>
              )}
              {appointments.map((a) => {
                const badge = getBadgeStyle(a.status);
                return (
                  <View
                    key={a.id}
                    style={[styles.apptCard, a.status === 'pending' && { borderWidth: 1.5, borderColor: colors.accent }]}
                  >
                    <View style={styles.timeCol}>
                      <Text style={[styles.hora, a.status === 'pending' && { color: colors.accent }]}>
                        {a.time.slice(0, 5)}
                      </Text>
                      <Text style={styles.dur}>{durationLabel(a.duration_minutes)}</Text>
                    </View>
                    <View
                      style={[
                        styles.divider,
                        {
                          backgroundColor:
                            a.status === 'completed' ? colors.primaryLight
                            : a.status === 'pending' ? colors.accent
                            : '#e8ece8',
                        },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.apptType}>{a.type}</Text>
                      {a.location ? <Text style={styles.apptLocation}>{a.location}</Text> : null}
                    </View>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: badge.color }}>
                        {STATUS_LABELS[a.status] ?? a.status}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {tab === 'births' && (
            <>
              {births.length === 0 && (
                <Text style={styles.empty}>Nenhum parto previsto.</Text>
              )}
              {births.map((p) => (
                <View key={p.patient_id} style={styles.partoCard}>
                  <View style={styles.dppBadge}>
                    <Text style={styles.dppText}>{formatDate(p.edd)}</Text>
                  </View>
                  <Text style={styles.partoName}>{p.name}</Text>
                  {p.current_week != null && (
                    <Text style={styles.partoMeta}>Semana {p.current_week}</Text>
                  )}
                  {p.hospital && (
                    <Text style={styles.partoHospital}>🏥 {p.hospital}</Text>
                  )}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: colors.textMid, fontSize: 14, marginTop: 40 },
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
  apptType: { fontSize: 14, fontWeight: '700', color: colors.text },
  apptLocation: { fontSize: 11.5, color: colors.textMid, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  partoCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  dppBadge: { backgroundColor: colors.accent + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, alignSelf: 'flex-start', marginBottom: 8 },
  dppText: { fontSize: 11, fontWeight: '700', color: colors.accent },
  partoName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  partoMeta: { fontSize: 13, color: colors.textMid, marginBottom: 4 },
  partoHospital: { fontSize: 12, color: colors.primary },
});
