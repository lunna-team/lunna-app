import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { BottomSheet } from '../../components/BottomSheet';
import { appointmentsService } from '../../services/appointments';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../theme';
import type { Appointment, PatientAppointmentStatus } from '../../types';

const STATUS_LABELS: Record<PatientAppointmentStatus, string> = {
  pending: 'Aguardando confirmação',
  confirmed: '✓ Presença confirmada',
  reschedule_requested: '⏳ Remarcação solicitada',
  reschedule_approved: '✓ Nova data aprovada',
};

const STATUS_COLORS: Record<PatientAppointmentStatus, string> = {
  pending: '#F5A623',
  confirmed: '#3CB371',
  reschedule_requested: '#F5A623',
  reschedule_approved: '#3CB371',
};

const TYPE_LABELS: Record<string, string> = {
  routine: 'Rotina',
  ultrasound: 'Ultrassom',
  lab: 'Exames',
  follow_up: 'Retorno',
  emergency: 'Urgência',
};

function formatDateTime(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const [h, min] = timeStr.split(':');
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  const weekday = dt.toLocaleDateString('pt-BR', { weekday: 'short' });
  return `${weekday}, ${d}/${m} · ${h}:${min}`;
}

const RESCHEDULE_REASONS = [
  { key: 'conflito_pessoal', label: 'Conflito pessoal' },
  { key: 'problema_saude', label: 'Problema de saúde' },
  { key: 'trabalho', label: 'Trabalho' },
  { key: 'outro', label: 'Outro' },
] as const;

export function ConsultasScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('conflito_pessoal');
  const [rescheduleObs, setRescheduleObs] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await appointmentsService.listPatientAppointments(user.id, { limit: 20 });
      setAppointments(res.data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as consultas.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const nextAppt = appointments.find(
    (a) => a.status !== 'cancelled' && a.status !== 'completed' && new Date(a.datetime) >= new Date(),
  );
  const history = appointments.filter((a) => a !== nextAppt);

  const handleConfirm = async (appt: Appointment) => {
    setActionLoading(true);
    try {
      const updated = await appointmentsService.confirmAppointment(appt.id);
      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch {
      Alert.alert('Erro', 'Não foi possível confirmar a consulta.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const updated = await appointmentsService.requestReschedule(
        selected.id,
        rescheduleReason,
        rescheduleObs.trim() || undefined,
      );
      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setShowReschedule(false);
      setSelected(null);
    } catch {
      Alert.alert('Erro', 'Não foi possível solicitar remarcação.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Minhas Consultas" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
          {/* PRÓXIMA CONSULTA */}
          {nextAppt && (
            <>
              <Text style={styles.sectionTitle}>Próxima Consulta</Text>
              <View style={styles.nextCard}>
                <Text style={styles.nextDate}>{formatDateTime(nextAppt.date, nextAppt.time)}</Text>
                <Text style={styles.nextLocation}>{nextAppt.location ?? 'Clínica Gerar Vida'}</Text>
                <Text style={styles.nextType}>{TYPE_LABELS[nextAppt.type] ?? nextAppt.type}</Text>

                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[nextAppt.patient_status] + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[nextAppt.patient_status] }]}>
                    {STATUS_LABELS[nextAppt.patient_status]}
                  </Text>
                </View>

                {nextAppt.patient_status === 'pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.confirmBtn, actionLoading && { opacity: 0.6 }]}
                      onPress={() => handleConfirm(nextAppt)}
                      disabled={actionLoading}
                    >
                      <Text style={styles.confirmBtnText}>Confirmar presença</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rescheduleBtn]}
                      onPress={() => { setSelected(nextAppt); setShowReschedule(true); }}
                    >
                      <Text style={styles.rescheduleBtnText}>Solicitar remarcação</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}

          {/* HISTÓRICO */}
          {history.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Histórico</Text>
              {history.map((a) => (
                <View key={a.id} style={styles.histCard}>
                  <Text style={styles.histDate}>{formatDateTime(a.date, a.time)}</Text>
                  <Text style={styles.histType}>{TYPE_LABELS[a.type] ?? a.type}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[a.patient_status] + '20', alignSelf: 'flex-start', marginTop: 8 }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[a.patient_status] }]}>
                      {STATUS_LABELS[a.patient_status]}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {appointments.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhuma consulta encontrada</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL REMARCAÇÃO */}
      <BottomSheet
        visible={showReschedule}
        onClose={() => { setShowReschedule(false); setSelected(null); }}
        title="Solicitar Remarcação"
      >
        <Text style={styles.fieldLabel}>MOTIVO</Text>
        <View style={styles.reasonList}>
          {RESCHEDULE_REASONS.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.reasonChip, rescheduleReason === r.key && styles.reasonChipActive]}
              onPress={() => setRescheduleReason(r.key)}
            >
              <Text style={[styles.reasonText, rescheduleReason === r.key && styles.reasonTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>OBSERVAÇÃO (opcional)</Text>
        <TextInput
          style={styles.input}
          value={rescheduleObs}
          onChangeText={setRescheduleObs}
          placeholder="Descreva o motivo..."
          placeholderTextColor={colors.textInactive}
          multiline
        />

        <TouchableOpacity
          style={[styles.saveBtn, actionLoading && { opacity: 0.6 }]}
          onPress={handleRescheduleSubmit}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Solicitar Remarcação</Text>
          )}
        </TouchableOpacity>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 12 },
  nextCard: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: 20, marginBottom: 8 },
  nextDate: { fontSize: 20, fontWeight: '800', color: colors.white, marginBottom: 4 },
  nextLocation: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  nextType: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, marginTop: 12, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: { flex: 1, padding: 12, borderRadius: radius.full, alignItems: 'center' },
  confirmBtn: { backgroundColor: colors.white },
  confirmBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  rescheduleBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  rescheduleBtnText: { fontSize: 13, fontWeight: '600', color: colors.white },
  histCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 16, marginBottom: 8 },
  histDate: { fontSize: 14, fontWeight: '700', color: colors.text },
  histType: { fontSize: 12, color: colors.textMid, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: '700', color: colors.textMid },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: colors.textMid, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  reasonList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.primaryLight, backgroundColor: colors.bg },
  reasonChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  reasonText: { fontSize: 13, fontWeight: '600', color: colors.textMid },
  reasonTextActive: { color: colors.white },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1.5, borderColor: colors.primaryLight, minHeight: 80 },
  saveBtn: { marginTop: 24, backgroundColor: colors.primary, borderRadius: radius.full, padding: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
