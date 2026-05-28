import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Pressable,
} from 'react-native';
import Svg, { Path, Polyline, Line, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, spacing, radius } from '../../theme';

interface Nome {
  nome: string;
  origem: string;
  significado: string;
  popularidade: number[];
}

const MENINAS: Nome[] = [
  { nome: 'Helena', origem: 'Grega', significado: 'A reluzente, a iluminada.', popularidade: [40, 50, 60, 72, 80, 75, 82, 88, 85, 90] },
  { nome: 'Sofia', origem: 'Grega', significado: 'Sabedoria, a sábia.', popularidade: [35, 55, 65, 78, 88, 92, 95, 90, 87, 89] },
  { nome: 'Valentina', origem: 'Latina', significado: 'Corajosa, forte, intensa.', popularidade: [30, 42, 55, 68, 75, 80, 85, 88, 84, 86] },
  { nome: 'Laura', origem: 'Latina', significado: 'Laureada, coroada de louros.', popularidade: [50, 55, 60, 58, 65, 68, 70, 72, 74, 76] },
  { nome: 'Isabela', origem: 'Hebraica', significado: 'Consagrada a Deus, promessa divina.', popularidade: [60, 65, 72, 70, 68, 72, 74, 76, 78, 80] },
];

const MENINOS: Nome[] = [
  { nome: 'Miguel', origem: 'Hebraica', significado: 'Quem é como Deus?', popularidade: [55, 60, 72, 80, 88, 92, 90, 93, 91, 94] },
  { nome: 'Arthur', origem: 'Celta', significado: 'Urso, forte como uma rocha.', popularidade: [50, 60, 68, 78, 84, 88, 90, 92, 91, 93] },
  { nome: 'Gael', origem: 'Hebraica', significado: 'Deus é forte, vigor divino.', popularidade: [20, 30, 45, 55, 65, 72, 78, 80, 82, 85] },
  { nome: 'Heitor', origem: 'Grega', significado: 'O que sustenta, o guardião.', popularidade: [30, 38, 45, 50, 55, 58, 62, 65, 64, 67] },
  { nome: 'Benício', origem: 'Latina', significado: 'Aquele que abençoa, benevolente.', popularidade: [15, 25, 38, 48, 55, 62, 68, 70, 72, 75] },
];

function ArrowUp() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.textInactive} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="18 15 12 9 6 15" />
    </Svg>
  );
}
function ArrowDown() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.textInactive} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="6 9 12 15 18 9" />
    </Svg>
  );
}

interface ModalData {
  nome: Nome;
  genero: 'girl' | 'boy';
}

export function NomesScreen() {
  const insets = useSafeAreaInsets();
  const [modalData, setModalData] = useState<ModalData | null>(null);

  const openModal = (nome: Nome, genero: 'girl' | 'boy') => setModalData({ nome, genero });
  const closeModal = () => setModalData(null);

  const renderColumn = (nomes: Nome[], genero: 'girl' | 'boy') => (
    <View style={genero === 'girl' ? styles.colGirl : styles.colBoy}>
      <View style={styles.colHeader}>
        <Text style={styles.colIcon}>{genero === 'girl' ? '🌸' : '⭐'}</Text>
        <Text style={[styles.colHeaderLabel, genero === 'girl' ? styles.colLabelGirl : styles.colLabelBoy]}>
          {genero === 'girl' ? 'Menina' : 'Menino'}
        </Text>
      </View>
      {nomes.map((n, i) => (
        <TouchableOpacity
          key={n.nome}
          style={[styles.nameSlot, i === 0 && (genero === 'girl' ? styles.rankOneGirl : styles.rankOneBoy)]}
          onPress={() => openModal(n, genero)}
          activeOpacity={0.8}
        >
          <Text style={styles.slotNum}>{i + 1}</Text>
          <Text style={styles.slotName} numberOfLines={1}>{n.nome}</Text>
          <View style={styles.slotArrows}>
            <TouchableOpacity style={styles.arrowBtn} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
              <ArrowUp />
            </TouchableOpacity>
            <TouchableOpacity style={styles.arrowBtn} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
              <ArrowDown />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.addSlot}>
        <Text style={styles.addSlotIcon}>＋</Text>
        <Text style={styles.addSlotText}>Adicionar nome</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Meus Nomes Favoritos" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.columnsWrap}>
          {renderColumn(MENINAS, 'girl')}
          {renderColumn(MENINOS, 'boy')}
        </View>
      </ScrollView>

      {/* Save bar */}
      <View style={styles.saveBar}>
        <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>💾 Salvar Minha Lista</Text>
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <Modal visible={!!modalData} transparent animationType="slide" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            {modalData && (
              <>
                <Text style={styles.modalName}>{modalData.nome.nome}</Text>
                <View style={[styles.genderBadge, modalData.genero === 'girl' ? styles.badgeGirl : styles.badgeBoy]}>
                  <Text style={[styles.genderBadgeText, modalData.genero === 'girl' ? styles.badgeTextGirl : styles.badgeTextBoy]}>
                    {modalData.genero === 'girl' ? '♀ Menina' : '♂ Menino'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>ORIGEM</Text>
                    <Text style={styles.infoValue}>{modalData.nome.origem}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>SIGNIFICADO</Text>
                    <Text style={styles.infoValue}>{modalData.nome.significado}</Text>
                  </View>
                </View>
                <View style={styles.chartWrap}>
                  <Text style={styles.chartLabel}>POPULARIDADE (2015–2024)</Text>
                  <MiniChart data={modalData.nome.popularidade} color={modalData.genero === 'girl' ? colors.accent : colors.primary} />
                  <View style={styles.chartYears}>
                    {['2015', '2017', '2019', '2021', '2023', '2024'].map((y) => (
                      <Text key={y} style={styles.chartYear}>{y}</Text>
                    ))}
                  </View>
                </View>
                <TouchableOpacity style={styles.actionBtn} onPress={closeModal}>
                  <Text style={styles.actionBtnText}>⭐ Guardar no Top 1</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MiniChart({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const W = 260, H = 80;
  const maxVal = Math.max(...data);
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - (v / maxVal) * (H - 8),
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = pathD + ` L${W},${H} L0,${H} Z`;

  return (
    <View style={styles.miniChart}>
      <Svg width={W} height={H}>
        <Path d={areaD} fill={color} opacity={0.15} />
        <Path d={pathD} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 100 },
  columnsWrap: { flexDirection: 'row', gap: 12 },
  colGirl: { flex: 1 },
  colBoy: { flex: 1 },
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  colIcon: { fontSize: 16 },
  colHeaderLabel: { fontSize: 14, fontWeight: '700' },
  colLabelGirl: { color: colors.accent },
  colLabelBoy: { color: colors.primary },
  nameSlot: {
    backgroundColor: colors.white, borderRadius: 14, padding: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  rankOneGirl: { borderLeftWidth: 3, borderLeftColor: colors.accent },
  rankOneBoy: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  slotNum: { fontSize: 10, fontWeight: '700', color: colors.textInactive, minWidth: 14 },
  slotName: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  slotArrows: { flexDirection: 'column', gap: 2 },
  arrowBtn: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  addSlot: {
    borderWidth: 1.5, borderColor: colors.primaryLight, borderStyle: 'dashed',
    backgroundColor: 'rgba(197,213,200,0.1)', borderRadius: 14, padding: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  addSlotIcon: { fontSize: 14, color: colors.primary },
  addSlotText: { fontSize: 11.5, fontWeight: '600', color: colors.primary },
  saveBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: '#dfe5df',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 20, paddingVertical: 14,
    alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(45,49,46,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 22, paddingBottom: 28, maxHeight: '80%',
  },
  modalHandle: { width: 36, height: 4, backgroundColor: '#e2e8e2', borderRadius: 99, alignSelf: 'center', marginTop: 12, marginBottom: 18 },
  modalName: { fontSize: 28, fontWeight: '800', color: colors.accent, letterSpacing: -0.5, marginBottom: 4 },
  genderBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, marginBottom: 18 },
  badgeGirl: { backgroundColor: 'rgba(229,152,125,0.15)' },
  badgeBoy: { backgroundColor: 'rgba(141,170,145,0.15)' },
  genderBadgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextGirl: { color: colors.accent },
  badgeTextBoy: { color: colors.primary },
  infoRow: { gap: 12, marginBottom: 20 },
  infoItem: { backgroundColor: colors.bg, borderRadius: 12, padding: 14 },
  infoLabel: { fontSize: 10, fontWeight: '700', color: colors.textInactive, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  infoValue: { fontSize: 13.5, fontWeight: '600', color: colors.text, lineHeight: 20 },
  chartWrap: { marginBottom: 20 },
  chartLabel: { fontSize: 10, fontWeight: '700', color: colors.textInactive, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  miniChart: { backgroundColor: colors.bg, borderRadius: 12, padding: 14, overflow: 'hidden' },
  chartYears: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 2 },
  chartYear: { fontSize: 9, color: colors.textInactive },
  actionBtn: {
    backgroundColor: colors.primary, borderRadius: 20, paddingVertical: 14, alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
});
