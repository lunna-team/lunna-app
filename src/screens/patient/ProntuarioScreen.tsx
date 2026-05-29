import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TouchableWithoutFeedback, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { patientsService } from '../../services/patients';
import { appointmentsService } from '../../services/appointments';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../theme';
import type { PatientProntuario, AppointmentEvolution } from '../../types';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function ProntuarioScreen() {
  const { user } = useAuth();
  const [prontuario, setProntuario] = useState<PatientProntuario | null>(null);
  const [evolutions, setEvolutions] = useState<AppointmentEvolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [fabModalVisible, setFabModalVisible] = useState(false);
  const [pesoInput, setPesoInput] = useState('');
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  const load = () => {
    if (!user?.id) return;
    patientsService
      .getProntuario(user.id)
      .then((pr) => {
        setProntuario(pr);
        if (pr.patient_id) {
          appointmentsService.getPatientEvolutions(pr.patient_id)
            .then(setEvolutions)
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user?.id]);

  const handleSavePeso = async () => {
    if (!user?.id || !pesoInput) return;
    const weight = parseFloat(pesoInput.replace(',', '.'));
    if (isNaN(weight)) return;
    setSaving(true);
    try {
      await patientsService.updateProntuario(user.id, { weight_initial_kg: String(weight) });
      await load();
      setFabModalVisible(false);
      setPesoInput('');
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Meu Prontuário" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
          <View style={styles.darkCard}>
            <Text style={styles.darkName}>{user?.name ?? '—'}</Text>
            <Text style={styles.darkSub}>Prontuário gestacional</Text>
            <View style={styles.darkGrid}>
              {[
                ['DUM', formatDate(prontuario?.lmp_date ?? null)],
                ['DPP', formatDate(prontuario?.edd ?? null)],
                ['Semana', prontuario?.current_week ? `${prontuario.current_week}ª` : '—'],
                ['Tipo Sang.', prontuario?.blood_type ?? '—'],
                ['Altura', prontuario?.height_cm ? `${prontuario.height_cm} cm` : '—'],
                ['Peso Inicial', prontuario?.weight_initial_kg ? `${prontuario.weight_initial_kg} kg` : '—'],
              ].map(([l, v]) => (
                <View key={l} style={styles.darkItem}>
                  <Text style={styles.darkLabel}>{l}</Text>
                  <Text style={styles.darkValue}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          {prontuario?.imc && (
            <>
              <Text style={styles.sectionTitle}>IMC</Text>
              <View style={styles.infoCard}>
                <Text style={styles.infoValue}>⚖️ {prontuario.imc}</Text>
                <Text style={styles.infoSub}>Índice de Massa Corporal</Text>
              </View>
            </>
          )}

          <Text style={styles.sectionTitle}>Contato</Text>
          <View style={styles.infoCard}>
            {prontuario?.user_email ? (
              <Text style={styles.infoValue}>✉️ {prontuario.user_email}</Text>
            ) : null}
            {prontuario?.user_phone ? (
              <Text style={[styles.infoValue, { marginTop: 8 }]}>📞 {prontuario.user_phone}</Text>
            ) : null}
            {!prontuario?.user_email && !prontuario?.user_phone && (
              <Text style={styles.infoSub}>Sem contato registrado.</Text>
            )}
          </View>

          {evolutions.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Evolução das Consultas</Text>
              <View style={[styles.infoCard, { padding: 0, overflow: 'hidden' }]}>
                {/* Header */}
                <View style={{ flexDirection: 'row', backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 8 }}>
                  {['Data', 'Peso', 'PA', 'AU', 'BCF', 'Edema'].map((h) => (
                    <Text key={h} style={{ flex: 1, fontSize: 10, fontWeight: '700', color: colors.primaryDk, textAlign: 'center' }}>{h}</Text>
                  ))}
                </View>
                {evolutions.map((evo, idx) => (
                  <View key={evo.id} style={{
                    flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 9,
                    backgroundColor: idx % 2 === 0 ? colors.white : colors.bg,
                  }}>
                    <Text style={styles.evoCell}>
                      {new Date(evo.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </Text>
                    <Text style={styles.evoCell}>{evo.weight_kg ? `${evo.weight_kg}kg` : '—'}</Text>
                    <Text style={styles.evoCell}>
                      {evo.bp_systolic && evo.bp_diastolic ? `${evo.bp_systolic}/${evo.bp_diastolic}` : '—'}
                    </Text>
                    <Text style={styles.evoCell}>{evo.fundal_height_cm ? `${evo.fundal_height_cm}` : '—'}</Text>
                    <Text style={styles.evoCell}>{evo.fetal_heart_rate ? `${evo.fetal_heart_rate}` : '—'}</Text>
                    <Text style={styles.evoCell}>{evo.edema && evo.edema !== 'none' ? evo.edema : '—'}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => setFabModalVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+ Registrar peso</Text>
      </TouchableOpacity>

      <Modal
        visible={fabModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFabModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setFabModalVisible(false)}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Registrar Peso</Text>
          <Text style={styles.fieldLabel}>Peso atual (kg)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={pesoInput}
            onChangeText={setPesoInput}
            placeholder="ex: 67,5"
            placeholderTextColor={colors.textInactive}
          />
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSavePeso}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  darkCard: { backgroundColor: colors.darkCard, borderRadius: radius.lg, padding: 20, marginBottom: 24 },
  darkName: { fontSize: 20, fontWeight: '800', color: colors.white, marginBottom: 2 },
  darkSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 16 },
  darkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  darkItem: { minWidth: '40%' },
  darkLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  darkValue: { fontSize: 14, color: colors.white, fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 12 },
  infoCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  infoValue: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  infoSub: { fontSize: 12, color: colors.textMid },
  fab: { position: 'absolute', right: spacing.lg, backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 16, borderRadius: radius.full, shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  fabText: { fontSize: 14, fontWeight: '700', color: colors.white },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.textInactive, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textMid, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 14, fontSize: 15, color: colors.text, marginBottom: 16 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.full, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
  evoCell: { flex: 1, fontSize: 11, color: colors.text, textAlign: 'center' },
});
