import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TouchableWithoutFeedback, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { patientsService } from '../../services/patients';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../theme';
import type { PatientProntuario } from '../../types';

const SEVERITY_COLORS: Record<string, string> = {
  low: '#3CB371',
  medium: colors.yellow ?? '#F5A623',
  high: colors.accent,
};

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Leve',
  medium: 'Atenção',
  high: 'Alto',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function ProntuarioScreen() {
  const { user } = useAuth();
  const [prontuario, setProntuario] = useState<PatientProntuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [fabModalVisible, setFabModalVisible] = useState(false);
  const [pesoInput, setPesoInput] = useState('');
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  const load = () => {
    if (!user?.id) return;
    patientsService
      .getProntuario(user.id)
      .then(setProntuario)
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
      const updated = await patientsService.updateProntuario(user.id, { weight_initial_kg: weight });
      setProntuario(updated);
      setFabModalVisible(false);
      setPesoInput('');
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const pesos = prontuario?.weight_history ?? [];
  const alturas = prontuario?.uterine_height_history ?? [];
  const complicacoes = prontuario?.complications ?? [];

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
            <Text style={styles.darkSub}>Prontuário do paciente</Text>
            <View style={styles.darkGrid}>
              {[
                ['DUM', formatDate(prontuario?.lmp_date ?? null)],
                ['DPP', formatDate(prontuario?.edd ?? null)],
                ['Semana', prontuario?.current_week ? `${prontuario.current_week}ª` : '—'],
                ['Tipo Sang.', prontuario?.blood_type ?? '—'],
                ['Alergias', prontuario?.allergies ?? 'Nenhuma'],
              ].map(([l, v]) => (
                <View key={l} style={styles.darkItem}>
                  <Text style={styles.darkLabel}>{l}</Text>
                  <Text style={styles.darkValue}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Evolução do Peso</Text>
          {pesos.length === 0 ? (
            <Text style={styles.empty}>Nenhum registro de peso.</Text>
          ) : (
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHead]}>
                <Text style={[styles.tableCell, styles.tableCellHead]}>Semana</Text>
                <Text style={[styles.tableCell, styles.tableCellHead]}>Peso</Text>
                <Text style={[styles.tableCell, styles.tableCellHead]}>Ganho</Text>
              </View>
              {pesos.map((p, i) => {
                const ganho = i === 0 ? '+0,0 kg' : `+${(p.weight_kg - pesos[i - 1].weight_kg).toFixed(1).replace('.', ',')} kg`;
                return (
                  <View key={i} style={styles.tableRow}>
                    <Text style={styles.tableCell}>Sem. {p.week}</Text>
                    <Text style={styles.tableCell}>{p.weight_kg.toFixed(1).replace('.', ',')} kg</Text>
                    <Text style={[styles.tableCell, { color: colors.primaryDk, fontWeight: '600' }]}>{ganho}</Text>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={styles.sectionTitle}>Altura Uterina</Text>
          {alturas.length === 0 ? (
            <Text style={styles.empty}>Nenhum registro de altura uterina.</Text>
          ) : (
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHead]}>
                <Text style={[styles.tableCell, styles.tableCellHead]}>Semana</Text>
                <Text style={[styles.tableCell, styles.tableCellHead]}>AU</Text>
              </View>
              {alturas.map((a, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableCell}>Sem. {a.week}</Text>
                  <Text style={[styles.tableCell, { color: colors.primaryDk, fontWeight: '600' }]}>{a.height_cm} cm</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Posição do Bebê</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoValue}>
              🫁 {prontuario?.fetal_position ?? 'Não registrado'}
            </Text>
            {prontuario?.fetal_position && (
              <Text style={styles.infoSub}>Registrado pela equipe médica</Text>
            )}
          </View>

          {complicacoes.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Intercorrências</Text>
              {complicacoes.map((c, i) => {
                const color = SEVERITY_COLORS[c.severity] ?? colors.textMid;
                return (
                  <View key={i} style={[styles.interCard, { borderLeftColor: color }]}>
                    <Text style={styles.interTitulo}>{c.description}</Text>
                    <Text style={styles.interDesc}>Semana {c.week}</Text>
                    <View style={[styles.interBadge, { backgroundColor: color + '22' }]}>
                      <Text style={[styles.interBadgeText, { color }]}>
                        {SEVERITY_LABELS[c.severity] ?? c.severity}
                      </Text>
                    </View>
                  </View>
                );
              })}
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
  empty: { fontSize: 13, color: colors.textMid, marginBottom: 24 },
  darkCard: { backgroundColor: colors.darkCard, borderRadius: radius.lg, padding: 20, marginBottom: 24 },
  darkName: { fontSize: 20, fontWeight: '800', color: colors.white, marginBottom: 2 },
  darkSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 16 },
  darkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  darkItem: { minWidth: '40%' },
  darkLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  darkValue: { fontSize: 14, color: colors.white, fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 12 },
  table: { backgroundColor: colors.white, borderRadius: radius.md, overflow: 'hidden', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bg },
  tableHead: { backgroundColor: colors.bg },
  tableCell: { flex: 1, fontSize: 13, color: colors.text },
  tableCellHead: { fontWeight: '700', color: colors.textMid, fontSize: 11, textTransform: 'uppercase' },
  infoCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  infoValue: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  infoSub: { fontSize: 12, color: colors.textMid },
  interCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 16, marginBottom: 10, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  interTitulo: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  interDesc: { fontSize: 13, color: colors.textMid, lineHeight: 18, marginBottom: 8 },
  interBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full },
  interBadgeText: { fontSize: 11, fontWeight: '700' },
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
});
