import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import Svg, { Path, Polyline, Line, Rect, Circle, Ellipse } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, spacing, radius } from '../../theme';

// ── PILL ICON ──────────────────────────────────────────────────────────────
function PillIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10.5 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7" />
      <Ellipse cx="16.5" cy="15.5" rx="5.5" ry="5.5" />
    </Svg>
  );
}

function WaveIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </Svg>
  );
}

function FileIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z" />
      <Polyline points="17 3 17 8 12 8" />
      <Line x1="9" y1="12" x2="15" y2="12" />
      <Line x1="9" y1="16" x2="15" y2="16" />
    </Svg>
  );
}

function DownloadIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <Polyline points="7 10 12 15 17 10" />
      <Line x1="12" y1="15" x2="12" y2="3" />
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="18" rx="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  );
}

function CheckIcon({ done }: { done: boolean }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={done ? 'white' : 'transparent'} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  );
}

interface MedItem {
  id: number;
  nome: string;
  horario: string;
  done: boolean;
}

const MEDS_INITIAL: MedItem[] = [
  { id: 1, nome: 'Ácido Fólico', horario: '08:00 AM · 1 comprimido', done: true },
  { id: 2, nome: 'Sulfato Ferroso', horario: 'Após o almoço · 1 comprimido', done: false },
  { id: 3, nome: 'Vitamina D3', horario: 'Junto ao jantar · 1 cápsula', done: false },
];

const PROXIMOS = [
  { id: 1, nome: 'Ômega-3', horario: 'Amanhã · 08:00 AM', badge: 'Manhã' },
  { id: 2, nome: 'Ácido Fólico', horario: 'Amanhã · 08:00 AM', badge: 'Manhã' },
];

const EXAMES = [
  {
    id: 1, nome: 'Ultrassom Morfológico', status: '✓ Disponível para download',
    statusType: 'available' as const, iconColor: 'green' as const, actionType: 'download' as const,
  },
  {
    id: 2, nome: 'Exame de Sangue (Hemograma)', status: '📅 Agendado: 15 de Mar',
    statusType: 'scheduled' as const, iconColor: 'peach' as const, actionType: 'calendar' as const,
  },
  {
    id: 3, nome: 'Glicemia de Jejum', status: '⏳ Aguardando resultado',
    statusType: 'pending' as const, iconColor: 'green' as const, actionType: 'disabled' as const,
  },
];

export function AreaMedicaScreen() {
  const [tab, setTab] = useState<'meds' | 'exames'>('meds');
  const [meds, setMeds] = useState<MedItem[]>(MEDS_INITIAL);
  const insets = useSafeAreaInsets();

  const toggleMed = (id: number) => {
    setMeds((prev) => prev.map((m) => m.id === id ? { ...m, done: !m.done } : m));
  };

  const statusColor = (type: 'available' | 'scheduled' | 'pending') => {
    if (type === 'available') return colors.primary;
    if (type === 'scheduled') return colors.accent;
    return colors.textInactive;
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Área Médica" />

      {/* ── TABS ── */}
      <View style={styles.tabsWrap}>
        <View style={styles.tabPillContainer}>
          {(['meds', 'exames'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
                {t === 'meds' ? 'Medicamentos' : 'Meus Exames'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === 'meds' && (
          <>
            <Text style={styles.sectionTitle}>Checklist de hoje</Text>
            <View style={styles.checklistCard}>
              <Text style={styles.checklistHeader}>Hoje — Seg, 03 Mar</Text>
              {meds.map((m, i) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.medItem, i === meds.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => toggleMed(m.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.medInfo}>
                    <Text style={[styles.medName, m.done && styles.medNameDone]}>{m.nome}</Text>
                    <Text style={[styles.medTime, m.done && styles.medTimeDone]}>{m.horario}</Text>
                  </View>
                  <View style={[styles.checkIcon, m.done ? styles.checkIconDone : styles.checkIconPending]}>
                    <CheckIcon done={m.done} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Próximos</Text>
            {PROXIMOS.map((p) => (
              <View key={p.id} style={styles.upcomingCard}>
                <View style={styles.pillIconWrap}>
                  <PillIcon />
                </View>
                <View style={styles.upcomingInfo}>
                  <Text style={styles.upcomingName}>{p.nome}</Text>
                  <Text style={styles.upcomingTime}>{p.horario}</Text>
                </View>
                <View style={styles.upcomingBadge}>
                  <Text style={styles.upcomingBadgeText}>{p.badge}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'exames' && (
          <>
            <Text style={styles.sectionTitle}>Resultados disponíveis</Text>
            {EXAMES.slice(0, 1).map((e) => (
              <View key={e.id} style={styles.examCard}>
                <View style={[styles.examIconWrap, e.iconColor === 'green' ? styles.iconGreen : styles.iconPeach]}>
                  {e.iconColor === 'green' ? <WaveIcon color={colors.primary} /> : <FileIcon color={colors.accent} />}
                </View>
                <View style={styles.examInfo}>
                  <Text style={styles.examName}>{e.nome}</Text>
                  <Text style={[styles.examStatus, { color: statusColor(e.statusType) }]}>{e.status}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.examActionBtn, styles.actionDownload]}
                  onPress={() => Alert.alert('Download', 'Abrindo resultado...')}
                >
                  <DownloadIcon />
                </TouchableOpacity>
              </View>
            ))}

            <Text style={styles.sectionTitle}>Agendados</Text>
            {EXAMES.slice(1, 2).map((e) => (
              <View key={e.id} style={styles.examCard}>
                <View style={[styles.examIconWrap, styles.iconPeach]}>
                  <FileIcon color={colors.accent} />
                </View>
                <View style={styles.examInfo}>
                  <Text style={styles.examName}>{e.nome}</Text>
                  <Text style={[styles.examStatus, { color: statusColor(e.statusType) }]}>{e.status}</Text>
                </View>
                <TouchableOpacity style={[styles.examActionBtn, styles.actionCalendar]}>
                  <CalendarIcon />
                </TouchableOpacity>
              </View>
            ))}

            {EXAMES.slice(2).map((e) => (
              <View key={e.id} style={styles.examCard}>
                <View style={[styles.examIconWrap, styles.iconGreen]}>
                  <WaveIcon color={colors.primary} />
                </View>
                <View style={styles.examInfo}>
                  <Text style={styles.examName}>{e.nome}</Text>
                  <Text style={[styles.examStatus, { color: statusColor(e.statusType) }]}>{e.status}</Text>
                </View>
                <View style={[styles.examActionBtn, styles.actionDownload, { opacity: 0.4 }]}>
                  <DownloadIcon />
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabsWrap: { paddingHorizontal: 20, paddingVertical: 10 },
  tabPillContainer: {
    flexDirection: 'row', backgroundColor: colors.primaryLight,
    borderRadius: 99, padding: 4, gap: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 99, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  tabBtnTextActive: { color: colors.white },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: colors.textInactive,
    textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 18, marginBottom: 10,
  },
  // checklist
  checklistCard: {
    backgroundColor: colors.white, borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  checklistHeader: { fontSize: 13, fontWeight: '600', color: colors.textInactive, marginBottom: 14 },
  medItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  medInfo: { flex: 1 },
  medName: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 3 },
  medNameDone: { textDecorationLine: 'line-through', color: colors.textInactive, fontWeight: '500' },
  medTime: { fontSize: 11.5, color: '#9aa09d' },
  medTimeDone: { color: '#c0c8c5' },
  checkIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  checkIconDone: { backgroundColor: colors.accent },
  checkIconPending: { borderWidth: 2, borderColor: colors.primary, backgroundColor: 'transparent' },
  // upcoming
  upcomingCard: {
    backgroundColor: colors.white, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    marginBottom: 10,
  },
  pillIconWrap: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(141,170,145,0.14)', alignItems: 'center', justifyContent: 'center',
  },
  upcomingInfo: { flex: 1 },
  upcomingName: { fontSize: 13, fontWeight: '700', color: colors.text },
  upcomingTime: { fontSize: 11, color: colors.textInactive, marginTop: 2 },
  upcomingBadge: { backgroundColor: 'rgba(141,170,145,0.14)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  upcomingBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  // exames
  examCard: {
    backgroundColor: colors.white, borderRadius: 20, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    marginBottom: 12,
  },
  examIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconGreen: { backgroundColor: colors.primaryLight },
  iconPeach: { backgroundColor: 'rgba(229,152,125,0.15)' },
  examInfo: { flex: 1 },
  examName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  examStatus: { fontSize: 11.5, fontWeight: '500' },
  examActionBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionDownload: { backgroundColor: colors.primaryLight },
  actionCalendar: { backgroundColor: 'rgba(229,152,125,0.18)' },
});
