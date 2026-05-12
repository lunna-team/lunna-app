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
  valor: number;
  momento: string;
  obs: string;
}

const classify = (valor: number, momento: string) => {
  const isFasting = momento.toLowerCase().includes('jejum');
  if (valor < 70) return { label: 'Hipoglicemia', color: colors.primaryLight };
  if (isFasting) {
    if (valor <= 95) return { label: 'Normal', color: '#3CB371' };
    if (valor <= 125) return { label: 'Atenção', color: colors.yellow };
    return { label: 'Elevada', color: colors.red };
  } else {
    if (valor < 140) return { label: 'Normal', color: '#3CB371' };
    if (valor < 200) return { label: 'Atenção', color: colors.yellow };
    return { label: 'Elevada', color: colors.red };
  }
};

const MOCK: Medicao[] = [
  { id: 1, valor: 88, momento: 'Jejum', obs: '' },
  { id: 2, valor: 132, momento: '2h pós-refeição', obs: 'Após almoço' },
  { id: 3, valor: 91, momento: 'Jejum', obs: '' },
];

const CHART_MOCK = [88, 92, 105, 97, 94];
const CHART_W = Dimensions.get('window').width - 40;
const CHART_H = 160;

function GlicoseChart({ medicoes }: { medicoes: Medicao[] }) {
  const W = CHART_W;
  const H = CHART_H;
  const padL = 10, padR = 10, padT = 14, padB = 10;
  const cW = W - padL - padR;
  const cH = H - padT - padB;

  const data = medicoes.length >= 2 ? [...medicoes].reverse().slice(-5).map((m) => m.valor) : CHART_MOCK;
  const minV = Math.max(50, Math.min(...data) - 10);
  const maxV = Math.max(...data) + 15;

  const xAt = (i: number) => padL + (data.length === 1 ? cW / 2 : (i / (data.length - 1)) * cW);
  const yAt = (v: number) => padT + cH - ((v - minV) / (maxV - minV)) * cH;

  const pts = data.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(padT + cH).toFixed(1)} L${pts[0].x.toFixed(1)},${(padT + cH).toFixed(1)}Z`;
  const limitY = yAt(95);

  return (
    <View style={styles.chartBox}>
      <Svg width={W} height={H}>
        <Path d={areaPath} fill="rgba(141,170,145,0.15)" />
        <Path d={linePath} stroke={colors.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        {limitY > padT && limitY < padT + cH && (
          <Line x1={padL} y1={limitY} x2={W - padR} y2={limitY} stroke={colors.accent} strokeWidth={1.5} strokeDasharray="5,4" />
        )}
        {pts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.white} stroke={colors.primary} strokeWidth={2.5} />
        ))}
      </Svg>
    </View>
  );
}

const MOMENTOS = ['Jejum', 'Pós-café (1h)', 'Pós-almoço (1h)', 'Pós-jantar (1h)', '2h pós-café', '2h pós-almoço', '2h pós-jantar', 'Antes de dormir'];

export function GlicoseScreen() {
  const [medicoes, setMedicoes] = useState<Medicao[]>(MOCK);
  const [modalVisible, setModalVisible] = useState(false);
  const [valor, setValor] = useState('');
  const [momento, setMomento] = useState('Jejum');
  const [obs, setObs] = useState('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    storage.get<Medicao[]>(STORAGE_KEYS.glicose).then((v) => { if (v && v.length) setMedicoes(v); });
  }, []);

  const ultima = medicoes[0];
  const { label: status } = ultima ? classify(ultima.valor, ultima.momento) : { label: '—' };
  const avg = medicoes.length ? Math.round(medicoes.reduce((s, m) => s + m.valor, 0) / medicoes.length) : 0;

  const salvar = async () => {
    const v = parseInt(valor);
    if (!v || v < 20 || v > 600) return;
    const nova: Medicao = { id: Date.now(), valor: v, momento, obs };
    const updated = [nova, ...medicoes];
    setMedicoes(updated);
    await storage.set(STORAGE_KEYS.glicose, updated);
    setModalVisible(false);
    setValor(''); setObs('');
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Glicose" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        <View style={styles.statsRow}>
          <StatBox value={String(medicoes.length)} label="Medições" />
          <StatBox value={ultima ? `${ultima.valor}` : '—'} label="Última (mg/dL)" />
          <StatBox value={avg ? `${avg}` : '—'} label="Média" />
          <StatBox value={status} label="Status" />
        </View>

        <Text style={styles.sectionTitle}>Evolução da glicose</Text>
        <GlicoseChart medicoes={medicoes} />

        <Text style={styles.sectionTitle}>Histórico</Text>
        {medicoes.map((m) => {
          const { label, color } = classify(m.valor, m.momento);
          return (
            <View key={m.id} style={styles.row}>
              <View style={[styles.bar, { backgroundColor: color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowValor}>{m.valor} <Text style={styles.rowUnit}>mg/dL</Text></Text>
                <Text style={styles.rowMomento}>{m.momento}{m.obs ? ` · ${m.obs}` : ''}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: color + '22' }]}>
                <Text style={[styles.badgeText, { color }]}>{label}</Text>
              </View>
            </View>
          );
        })}

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Classificação</Text>
        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Referência gestacional</Text>
          {[
            { color: colors.primaryLight, label: 'Hipoglicemia', val: '< 70 mg/dL' },
            { color: '#3CB371', label: 'Normal em jejum', val: '70–95 mg/dL' },
            { color: '#3CB371', label: 'Normal pós-refeição', val: '< 140 mg/dL' },
            { color: colors.yellow, label: 'Atenção', val: '96–125 / 140–199 mg/dL' },
            { color: colors.red, label: 'Elevada', val: '≥ 126 / ≥ 200 mg/dL' },
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
          <Text style={styles.sheetTitle}>Registrar Glicose</Text>
          <Text style={styles.fieldLabel}>Glicose (mg/dL)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={valor} onChangeText={setValor} placeholder="ex: 95" placeholderTextColor={colors.textInactive} />
          <Text style={styles.fieldLabel}>Momento da medição</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {MOMENTOS.map((m) => (
                <TouchableOpacity key={m} style={[styles.chip, momento === m && styles.chipActive]} onPress={() => setMomento(m)}>
                  <Text style={[styles.chipText, momento === m && styles.chipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text style={styles.fieldLabel}>Observação (opcional)</Text>
          <TextInput style={styles.input} value={obs} onChangeText={(t) => setObs(t.slice(0, 80))} placeholder="ex: após almoço" placeholderTextColor={colors.textInactive} />
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
  row: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  bar: { width: 5, borderRadius: 99, alignSelf: 'stretch', minHeight: 28 },
  rowValor: { fontSize: 20, fontWeight: '800', color: colors.text },
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
