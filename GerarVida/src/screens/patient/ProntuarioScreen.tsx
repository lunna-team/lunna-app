import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TouchableWithoutFeedback, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, spacing, radius } from '../../theme';

const PESOS = [
  { semana: 'Sem. 12', peso: '62,0 kg', ganho: '+0,0 kg' },
  { semana: 'Sem. 16', peso: '63,4 kg', ganho: '+1,4 kg' },
  { semana: 'Sem. 18', peso: '64,1 kg', ganho: '+0,7 kg' },
  { semana: 'Sem. 20', peso: '65,2 kg', ganho: '+1,1 kg' },
  { semana: 'Sem. 22', peso: '66,0 kg', ganho: '+0,8 kg' },
  { semana: 'Sem. 24', peso: '67,3 kg', ganho: '+1,3 kg' },
];

const ALTURA_UTERINA = [
  { semana: 'Sem. 16', au: '16 cm' },
  { semana: 'Sem. 20', au: '20 cm' },
  { semana: 'Sem. 22', au: '22 cm' },
  { semana: 'Sem. 24', au: '24 cm' },
];

export function ProntuarioScreen() {
  const [fabModalVisible, setFabModalVisible] = useState(false);
  const [pesoInput, setPesoInput] = useState('');
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Meu Prontuário" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        <View style={styles.darkCard}>
          <Text style={styles.darkName}>Maria da Silva</Text>
          <Text style={styles.darkSub}>Prontuário 2024-00847</Text>
          <View style={styles.darkGrid}>
            {[['DUM', '25/09/2024'], ['DPP', '02/07/2025'], ['Semana', '24ª'], ['Tipo Sang.', 'A+'], ['Alergias', 'Nenhuma']].map(([l, v]) => (
              <View key={l} style={styles.darkItem}>
                <Text style={styles.darkLabel}>{l}</Text>
                <Text style={styles.darkValue}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Evolução do Peso</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text style={[styles.tableCell, styles.tableCellHead]}>Semana</Text>
            <Text style={[styles.tableCell, styles.tableCellHead]}>Peso</Text>
            <Text style={[styles.tableCell, styles.tableCellHead]}>Ganho</Text>
          </View>
          {PESOS.map((p) => (
            <View key={p.semana} style={styles.tableRow}>
              <Text style={styles.tableCell}>{p.semana}</Text>
              <Text style={styles.tableCell}>{p.peso}</Text>
              <Text style={[styles.tableCell, { color: colors.primaryDk, fontWeight: '600' }]}>{p.ganho}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Altura Uterina</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text style={[styles.tableCell, styles.tableCellHead]}>Semana</Text>
            <Text style={[styles.tableCell, styles.tableCellHead]}>AU</Text>
          </View>
          {ALTURA_UTERINA.map((a) => (
            <View key={a.semana} style={styles.tableRow}>
              <Text style={styles.tableCell}>{a.semana}</Text>
              <Text style={[styles.tableCell, { color: colors.primaryDk, fontWeight: '600' }]}>{a.au}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Posição do Bebê</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoValue}>🫁 Cefálico</Text>
          <Text style={styles.infoSub}>Registrado por Dra. Ana Lima · Sem. 24</Text>
        </View>

        <Text style={styles.sectionTitle}>Intercorrências</Text>
        <View style={[styles.interCard, { borderLeftColor: colors.yellow }]}>
          <Text style={styles.interTitulo}>Enjôos Frequentes</Text>
          <Text style={styles.interDesc}>Náuseas matinais até semana 16. Resolvidas com vitamina B6.</Text>
          <View style={[styles.interBadge, { backgroundColor: colors.yellow + '22' }]}>
            <Text style={[styles.interBadgeText, { color: colors.yellow }]}>Atenção</Text>
          </View>
        </View>
        <View style={[styles.interCard, { borderLeftColor: '#3CB371' }]}>
          <Text style={styles.interTitulo}>Leve Anemia</Text>
          <Text style={styles.interDesc}>Hb 10,8 g/dL na semana 20. Suplementação de ferro iniciada.</Text>
          <View style={[styles.interBadge, { backgroundColor: '#3CB37122' }]}>
            <Text style={[styles.interBadgeText, { color: '#3CB371' }]}>Leve</Text>
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => setFabModalVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+ Registrar peso</Text>
      </TouchableOpacity>

      {/* MODAL REGISTRAR PESO */}
      <Modal visible={fabModalVisible} transparent animationType="slide" onRequestClose={() => setFabModalVisible(false)}>
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
            style={styles.saveBtn}
            onPress={() => { setFabModalVisible(false); setPesoInput(''); }}
          >
            <Text style={styles.saveBtnText}>Salvar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
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
