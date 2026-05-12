import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, TouchableWithoutFeedback, Dimensions } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StatBox } from '../../components/StatBox';
import { storage, STORAGE_KEYS } from '../../services/storage';
import { colors, spacing, radius } from '../../theme';

interface Medicao {
  id: number;
  sistolica: number;
  diastolica: number;
  pulso: string;
  momento: string;
}

const classify = (s: number, d: number) => {
  if (s < 90 || d < 60) return { label: 'Hipotensão', color: colors.primaryLight };
  if (s >= 140 || d >= 90) return { label: 'Hipertensão', color: colors.red };
  if (s >= 130 || d >= 80) return { label: 'Grau 1', color: colors.accent };
  if (s >= 120) return { label: 'Elevada', color: colors.yellow };
  return { label: 'Normal', color: '#3CB371' };
};

const MOCK: Medicao[] = [
  { id: 1, sistolica: 118, diastolica: 76, pulso: '72', momento: 'Manhã' },
  { id: 2, sistolica: 122, diastolica: 80, pulso: '68', momento: 'Tarde' },
  { id: 3, sistolica: 115, diastolica: 74, pulso: '70', momento: 'Manhã' },
];

const MOCK_SIS = [118, 122, 115, 120, 116];
const MOCK_DIA = [76, 80, 74, 78, 75];
const CHART_W = Dimensions.get('window').width - 40;
const CHART_H = 160;

function PressaoChart({ medicoes }: { medicoes: Medicao[] }) {
  const W = CHART_W;
  const H = CHART_H;
  const padL = 10, padR = 10, padT = 14, padB = 10;
  const cW = W - padL - padR;
  const cH = H - padT - padB;

  const sisList = medicoes.length >= 2 ? [...medicoes].reverse().slice(-5).map((m) => m.sistolica) : MOCK_SIS;
  const diaList = medicoes.length >= 2 ? [...medicoes].reverse().slice(-5).map((m) => m.diastolica) : MOCK_DIA;
  const allVals = [...sisList, ...diaList];
  const minV = Math.max(50, Math.min(...allVals) - 5);
  const maxV = Math.max(...allVals) + 10;

  const n = sisList.length;
  const xAt = (i: number) => padL + (n === 1 ? cW / 2 : (i / (n - 1)) * cW);
  const yAt = (v: number) => padT + cH - ((v - minV) / (maxV - minV)) * cH;

  const buildPath = (data: number[]) => data.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ');
  const sisPath = buildPath(sisList);
  const diaPath = buildPath(diaList);
  const limitY = yAt(140);

  return (
    <View style={styles.chartBox}>
      <Svg width={W} height={H}>
        <Path d={sisPath} stroke={colors.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        <Path d={diaPath} stroke={colors.accent} strokeWidth={2} fill="none" strokeLinejoin="round" strokeDasharray="0" />
        {limitY > padT && limitY < padT + cH && (
          <Line x1={padL} y1={limitY} x2={W - padR} y2={limitY} stroke={colors.red} strokeWidth={1.5} strokeDasharray="5,4" />
        )}
        {sisList.map((v, i) => (
          <Circle key={`s${i}`} cx={xAt(i)} cy={yAt(v)} r={3.5} fill={colors.white} stroke={colors.primary} strokeWidth={2} />
        ))}
        {diaList.map((v, i) => (
          <Circle key={`d${i}`} cx={xAt(i)} cy={yAt(v)} r={3.5} fill={colors.white} stroke={colors.accent} strokeWidth={2} />
        ))}
      </Svg>
      <View style={styles.chartLegend}>
        <View style={styles.chartLegendItem}>
          <View style={[styles.chartLegendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.chartLegendText}>Sistólica</Text>
        </View>
        <View style={styles.chartLegendItem}>
          <View style={[styles.chartLegendDot, { backgroundColor: colors.accent }]} />
          <Text style={styles.chartLegendText}>Diastólica</Text>
        </View>
      </View>
    </View>
  );
}

const MOMENTOS = ['Manhã', 'Tarde', 'Noite', 'Após atividade'];

export function PressaoScreen() {
  const [medicoes, setMedicoes] = useState<Medicao[]>(MOCK);
  const [modalVisible, setModalVisible] = useState(false);
  const [sis, setSis] = useState('');
  const [dia, setDia] = useState('');
  const [pulso, setPulso] = useState('');
  const [momento, setMomento] = useState('Manhã');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    storage.get<Medicao[]>(STORAGE_KEYS.pressao).then((v) => { if (v && v.length) setMedicoes(v); });
  }, []);

  const avgSis = medicoes.length ? Math.round(medicoes.reduce((s, m) => s + m.sistolica, 0) / medicoes.length) : 0;
  const avgDia = medicoes.length ? Math.round(medicoes.reduce((s, m) => s + m.diastolica, 0) / medicoes.length) : 0;
  const pico = medicoes.length ? Math.max(...medicoes.map((m) => m.sistolica)) : 0;

  const salvar = async () => {
    const s = parseInt(sis), d = parseInt(dia);
    if (!s || !d || s < 60 || s > 220 || d < 40 || d > 140) return;
    const nova: Medicao = { id: Date.now(), sistolica: s, diastolica: d, pulso, momento };
    const updated = [nova, ...medicoes];
    setMedicoes(updated);
    await storage.set(STORAGE_KEYS.pressao, updated);
    setModalVisible(false);
    setSis(''); setDia(''); setPulso('');
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Mapa da Pressão" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        <View style={styles.statsRow}>
          <StatBox value={String(medicoes.length)} label="Medições" />
          <StatBox value={avgSis ? `${avgSis}` : '—'} label="Méd. sistólica" />
          <StatBox value={avgDia ? `${avgDia}` : '—'} label="Méd. diastólica" />
          <StatBox value={pico ? `${pico}` : '—'} label="Pico máx." />
        </View>

        <Text style={styles.sectionTitle}>Evolução da pressão</Text>
        <PressaoChart medicoes={medicoes} />

        <Text style={styles.sectionTitle}>Histórico</Text>
        {medicoes.map((m) => {
          const { label, color } = classify(m.sistolica, m.diastolica);
          return (
            <View key={m.id} style={styles.row}>
              <View style={[styles.bar, { backgroundColor: color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowValor}>{m.sistolica}<Text style={styles.rowSep}>/</Text>{m.diastolica} <Text style={styles.rowUnit}>mmHg</Text></Text>
                <Text style={styles.rowMomento}>{m.momento}{m.pulso ? ` · ${m.pulso} bpm` : ''}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: color + '22' }]}>
                <Text style={[styles.badgeText, { color }]}>{label}</Text>
              </View>
            </View>
          );
        })}

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Classificação</Text>
        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Referência (adultos)</Text>
          {[
            { color: colors.primaryLight, label: 'Hipotensão', val: '< 90/60 mmHg' },
            { color: '#3CB371', label: 'Normal', val: '< 120/80 mmHg' },
            { color: colors.yellow, label: 'Elevada', val: '120–129/<80 mmHg' },
            { color: colors.accent, label: 'Hipertensão grau 1', val: '130–139/80–89 mmHg' },
            { color: colors.red, label: 'Hipertensão grau 2', val: '≥ 140/90 mmHg' },
          ].map((l) => (
            <View key={l.label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
              <Text style={styles.legendVal}>{l.val}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 24 }]} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Registrar Pressão</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Sistólica</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={sis} onChangeText={setSis} placeholder="120" placeholderTextColor={colors.textInactive} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Diastólica</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={dia} onChangeText={setDia} placeholder="80" placeholderTextColor={colors.textInactive} />
            </View>
          </View>
          <Text style={styles.fieldLabel}>Pulso (opcional)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={pulso} onChangeText={setPulso} placeholder="ex: 72 bpm" placeholderTextColor={colors.textInactive} />
          <Text style={styles.fieldLabel}>Momento</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {MOMENTOS.map((m) => (
                <TouchableOpacity key={m} style={[styles.chip, momento === m && styles.chipActive]} onPress={() => setMomento(m)}>
                  <Text style={[styles.chipText, momento === m && styles.chipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.saveBtn} onPress={salvar}>
            <Text style={styles.saveBtnText}>Salvar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 12 },
  chartBox: { backgroundColor: colors.white, borderRadius: radius.md, marginBottom: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  chartLegend: { flexDirection: 'row', gap: 16, padding: 10, paddingTop: 0 },
  chartLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chartLegendDot: { width: 20, height: 3, borderRadius: 99 },
  chartLegendText: { fontSize: 11, fontWeight: '600', color: colors.textMid },
  row: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  bar: { width: 5, borderRadius: 99, alignSelf: 'stretch', minHeight: 28 },
  rowValor: { fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  rowSep: { color: colors.textMid, fontWeight: '400' },
  rowUnit: { fontSize: 12, fontWeight: '400', color: colors.textMid },
  rowMomento: { fontSize: 12, color: colors.textMid, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },
  legendCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  legendTitle: { fontSize: 11, fontWeight: '700', color: colors.textMid, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '500', color: colors.text, flex: 1 },
  legendVal: { fontSize: 11, color: colors.textMid },
  fab: { position: 'absolute', right: spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  fabText: { fontSize: 28, color: colors.white, fontWeight: '300', marginTop: -2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.textInactive, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textMid, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 14, fontSize: 15, color: colors.text, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.bg },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textMid },
  chipTextActive: { color: colors.white },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.full, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
