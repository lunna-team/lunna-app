import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { StatBox } from '../../components/common/StatBox';
import { BottomSheet } from '../../components/common/BottomSheet';
import { vitalsService } from '../../services/vitals';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../theme';
import type { BloodPressureReading, TimeOfDay } from '../../types';

const MOMENT_LABELS: Record<TimeOfDay, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  evening: 'Noite',
  night: 'Madrugada',
};

const CLASSIFICATION_COLORS: Record<string, string> = {
  'Normal': '#3CB371',
  'Atenção': '#F5A623',
  'Alto': '#E15B5B',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function PressaoScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [readings, setReadings] = useState<BloodPressureReading[]>([]);
  const [stats, setStats] = useState<{ total_readings: number; average_systolic: number; average_diastolic: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [moment, setMoment] = useState<TimeOfDay>('morning');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.patient_id) return;
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        vitalsService.listBloodPressureReadings(user.patient_id),
        vitalsService.getBloodPressureStats(user.patient_id),
      ]);
      setReadings(listRes.data);
      setStats(statsRes);
    } catch {
      // mantém dados existentes
    } finally {
      setLoading(false);
    }
  }, [user?.patient_id]);

  useEffect(() => { load(); }, [load]);

  const lastReading = readings[0];

  const handleSave = async () => {
    const sys = parseInt(systolic, 10);
    const dia = parseInt(diastolic, 10);
    if (isNaN(sys) || isNaN(dia) || sys <= 0 || dia <= 0) {
      Alert.alert('Valores inválidos', 'Preencha sistólica e diastólica corretamente.');
      return;
    }
    if (!user?.patient_id) return;
    setSaving(true);
    try {
      await vitalsService.createBloodPressure(user.patient_id, {
        systolic: sys,
        diastolic: dia,
        pulse_bpm: pulse ? parseInt(pulse, 10) : undefined,
        moment,
      });
      setSystolic('');
      setDiastolic('');
      setPulse('');
      setMoment('morning');
      setShowModal(false);
      await load();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a leitura.');
    } finally {
      setSaving(false);
    }
  };

  const moments: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night'];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Pressão Arterial" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}>
          {/* STATS */}
          <View style={styles.statsRow}>
            <StatBox value={String(stats?.total_readings ?? 0)} label="Medições" />
            <StatBox
              value={lastReading ? `${lastReading.systolic}` : '—'}
              label="Última sistólica"
              valueColor={CLASSIFICATION_COLORS[lastReading?.classification ?? 'Normal']}
            />
            <StatBox
              value={lastReading ? `${lastReading.diastolic}` : '—'}
              label="Última diastólica"
            />
          </View>

          {/* ALERTA */}
          {lastReading?.classification === 'Alto' && (
            <View style={styles.alertBanner}>
              <Text style={styles.alertText}>⚠️ Pressão elevada — contate sua médica</Text>
            </View>
          )}

          {/* HISTÓRICO */}
          {readings.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Histórico</Text>
              {readings.map((r) => (
                <View key={r.id} style={styles.row}>
                  <View style={[styles.rowDot, { backgroundColor: CLASSIFICATION_COLORS[r.classification] }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowValue}>
                      {r.systolic}/{r.diastolic} mmHg
                      {r.pulse_bpm ? ` · ${r.pulse_bpm} bpm` : ''}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {MOMENT_LABELS[r.moment]} · {formatDate(r.created_at)}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: CLASSIFICATION_COLORS[r.classification] + '20' }]}>
                    <Text style={[styles.badgeText, { color: CLASSIFICATION_COLORS[r.classification] }]}>
                      {r.classification}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {readings.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhuma medição registrada</Text>
              <Text style={styles.emptyHint}>Toque em + para registrar</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* MODAL */}
      <BottomSheet visible={showModal} onClose={() => setShowModal(false)} title="Registrar Pressão">
        <View style={styles.doubleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>SISTÓLICA (mmHg)</Text>
            <TextInput
              style={styles.input}
              value={systolic}
              onChangeText={setSystolic}
              keyboardType="numeric"
              placeholder="120"
              placeholderTextColor={colors.textInactive}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>DIASTÓLICA</Text>
            <TextInput
              style={styles.input}
              value={diastolic}
              onChangeText={setDiastolic}
              keyboardType="numeric"
              placeholder="80"
              placeholderTextColor={colors.textInactive}
            />
          </View>
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>PULSO (bpm, opcional)</Text>
        <TextInput
          style={styles.input}
          value={pulse}
          onChangeText={setPulse}
          keyboardType="numeric"
          placeholder="72"
          placeholderTextColor={colors.textInactive}
        />

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>MOMENTO</Text>
        <View style={styles.chipRow}>
          {moments.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.chip, moment === m && styles.chipActive]}
              onPress={() => setMoment(m)}
            >
              <Text style={[styles.chipText, moment === m && styles.chipTextActive]}>
                {MOMENT_LABELS[m]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Salvar</Text>
          )}
        </TouchableOpacity>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  alertBanner: { backgroundColor: '#FFEEEE', borderRadius: radius.md, padding: 12, marginBottom: 16 },
  alertText: { fontSize: 13, fontWeight: '600', color: '#E15B5B' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 12 },
  row: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.md, padding: 14, marginBottom: 8, alignItems: 'center', gap: 12 },
  rowDot: { width: 10, height: 10, borderRadius: 5 },
  rowValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: 11, color: colors.textMid, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 10, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: '700', color: colors.textMid },
  emptyHint: { fontSize: 13, color: colors.textInactive, marginTop: 8 },
  fab: { position: 'absolute', right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  fabText: { fontSize: 28, color: colors.white, lineHeight: 32 },
  doubleRow: { flexDirection: 'row', gap: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: colors.textMid, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1.5, borderColor: colors.primaryLight },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.primaryLight },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textMid },
  chipTextActive: { color: colors.white },
  saveBtn: { marginTop: 24, backgroundColor: colors.primary, borderRadius: radius.full, padding: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
