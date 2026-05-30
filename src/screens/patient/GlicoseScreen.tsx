import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { StatBox } from '../../components/common/StatBox';
import { BottomSheet } from '../../components/common/BottomSheet';
import { vitalsService } from '../../services/vitals';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../theme';
import type { GlucoseReading, GlucoseMoment } from '../../types';

const MOMENT_LABELS: Record<GlucoseMoment, string> = {
  fasting: 'Jejum',
  after_meal: 'Pós-refeição',
  random: 'Aleatório',
};

const CLASSIFICATION_COLORS: Record<string, string> = {
  'Normal': '#3CB371',
  'Atenção': '#F5A623',
  'Alto': '#E15B5B',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function GlicoseScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [stats, setStats] = useState<{ total_readings: number; average: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [value, setValue] = useState('');
  const [moment, setMoment] = useState<GlucoseMoment>('fasting');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.patient_id) return;
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        vitalsService.listGlucoseReadings(user.patient_id),
        vitalsService.getGlucoseStats(user.patient_id),
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
  const lastClassification = lastReading?.classification ?? '—';

  const handleSave = async () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      Alert.alert('Valor inválido', 'Digite um valor de glicose válido em mg/dL.');
      return;
    }
    if (!user?.patient_id) return;
    setSaving(true);
    try {
      await vitalsService.createGlucose(user.patient_id, {
        value_mg_dl: numValue,
        moment,
        notes: notes.trim() || undefined,
      });
      setValue('');
      setNotes('');
      setMoment('fasting');
      setShowModal(false);
      await load();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a leitura.');
    } finally {
      setSaving(false);
    }
  };

  const moments: GlucoseMoment[] = ['fasting', 'after_meal', 'random'];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Glicose" />

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
              value={lastReading ? `${lastReading.value_mg_dl}` : '—'}
              label="Última (mg/dL)"
              valueColor={CLASSIFICATION_COLORS[lastClassification] ?? colors.text}
            />
            <StatBox
              value={stats?.average ? `${Math.round(stats.average)}` : '—'}
              label="Média"
            />
          </View>

          {/* STATUS */}
          {lastReading && (
            <View style={[styles.statusBadge, { backgroundColor: CLASSIFICATION_COLORS[lastClassification] + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: CLASSIFICATION_COLORS[lastClassification] }]} />
              <Text style={[styles.statusText, { color: CLASSIFICATION_COLORS[lastClassification] }]}>
                Última leitura: {lastClassification}
              </Text>
            </View>
          )}

          {/* HISTÓRICO */}
          {readings.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Histórico</Text>
              {readings.map((r) => (
                <View key={r.id} style={styles.row}>
                  <View style={[styles.rowDot, { backgroundColor: CLASSIFICATION_COLORS[r.classification] ?? colors.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowValue}>{r.value_mg_dl} mg/dL</Text>
                    <Text style={styles.rowMeta}>
                      {MOMENT_LABELS[r.moment]} · {formatDate(r.created_at)}
                    </Text>
                    {r.notes ? <Text style={styles.rowNotes}>{r.notes}</Text> : null}
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
              <Text style={styles.emptyHint}>Toque em + para registrar sua primeira leitura</Text>
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
      <BottomSheet visible={showModal} onClose={() => setShowModal(false)} title="Registrar Glicose">
        <Text style={styles.fieldLabel}>VALOR (mg/dL)</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          keyboardType="numeric"
          placeholder="95"
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

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>OBSERVAÇÃO (opcional)</Text>
        <TextInput
          style={styles.input}
          value={notes}
          onChangeText={setNotes}
          placeholder="Ex: após café da manhã"
          placeholderTextColor={colors.textInactive}
          maxLength={80}
        />

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
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, marginBottom: 24 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 12 },
  row: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.md, padding: 14, marginBottom: 8, alignItems: 'center', gap: 12 },
  rowDot: { width: 10, height: 10, borderRadius: 5 },
  rowValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: 11, color: colors.textMid, marginTop: 2 },
  rowNotes: { fontSize: 11, color: colors.textInactive, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 10, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: '700', color: colors.textMid },
  emptyHint: { fontSize: 13, color: colors.textInactive, marginTop: 8 },
  fab: { position: 'absolute', right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  fabText: { fontSize: 28, color: colors.white, lineHeight: 32 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: colors.textMid, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1.5, borderColor: colors.primaryLight },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, padding: 10, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', borderWidth: 1.5, borderColor: colors.primaryLight },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textMid },
  chipTextActive: { color: colors.white },
  saveBtn: { marginTop: 24, backgroundColor: colors.primary, borderRadius: radius.full, padding: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
