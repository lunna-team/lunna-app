import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { patientsService } from '../../services/patients';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../theme';
import type { AgendaAppointment, BirthItem, AppointmentStatus, AppointmentType } from '../../types';

type TabView = 'day' | 'week' | 'month' | 'births';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function durationLabel(minutes: number): string {
  return minutes >= 60 ? `${minutes / 60}h` : `${minutes}min`;
}

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
  completed: 'Realizada',
  cancelled: 'Cancelada',
};

// Cor por tipo de compromisso
const TYPE_COLORS: Record<AppointmentType, string> = {
  routine:   colors.primary,    // verde
  follow_up: '#E5987D',         // coral (accent)
  ultrasound:'#9B7FD4',         // roxo
  lab:       '#5B9BD5',         // azul
  emergency: '#E05C5C',         // vermelho
};

const TYPE_LABELS: Record<AppointmentType, string> = {
  routine:   'Rotina',
  follow_up: 'Retorno',
  ultrasound:'Ultrassom',
  lab:       'Exame',
  emergency: 'Emergência',
};

// markedDates: { [iso]: AppointmentType[] }
type MarkedMap = Record<string, AppointmentType[]>;

// ── Day Navigator ─────────────────────────────────────────────────────────────

function DayNavigator({ selected, onPrev, onNext }: {
  selected: Date; onPrev: () => void; onNext: () => void;
}) {
  const isToday = sameDay(selected, new Date());
  const label = isToday
    ? 'Hoje'
    : selected.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

  return (
    <View style={dn.row}>
      <TouchableOpacity onPress={onPrev} style={dn.arrow}><Text style={dn.arrowText}>‹</Text></TouchableOpacity>
      <View style={dn.center}><Text style={dn.dateText}>{label}</Text></View>
      <TouchableOpacity onPress={onNext} style={dn.arrow}><Text style={dn.arrowText}>›</Text></TouchableOpacity>
    </View>
  );
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────

function MiniCalendar({
  selected,
  onSelect,
  markedMap,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
  markedMap: MarkedMap;
}) {
  const [cursor, setCursor] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));
  const today = new Date();

  useEffect(() => {
    setCursor(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [selected.getMonth(), selected.getFullYear()]);

  const prevMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const nextMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));

  const firstDow = cursor.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={cal.wrapper}>
      <View style={cal.header}>
        <TouchableOpacity onPress={prevMonth} style={cal.arrow}><Text style={cal.arrowText}>‹</Text></TouchableOpacity>
        <Text style={cal.monthLabel}>{MONTHS_PT[cursor.getMonth()]} {cursor.getFullYear()}</Text>
        <TouchableOpacity onPress={nextMonth} style={cal.arrow}><Text style={cal.arrowText}>›</Text></TouchableOpacity>
      </View>

      <View style={cal.dowRow}>
        {DAYS_PT.map((d) => <Text key={d} style={cal.dowCell}>{d}</Text>)}
      </View>

      <View style={cal.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={`e${i}`} style={cal.cell} />;
          const isSelected = sameDay(d, selected);
          const isToday = sameDay(d, today);
          const iso = toISO(d);
          const types = markedMap[iso] ?? [];

          return (
            <TouchableOpacity key={iso} style={cal.cell} onPress={() => onSelect(d)}>
              <View style={[
                cal.dayCircle,
                isSelected && cal.daySelected,
                !isSelected && isToday && cal.dayToday,
              ]}>
                <Text style={[
                  cal.dayText,
                  isSelected && cal.dayTextSelected,
                  !isSelected && isToday && cal.dayTextToday,
                ]}>{d.getDate()}</Text>
              </View>
              {types.length > 0 && !isSelected && (
                <View style={cal.dotsRow}>
                  {types.slice(0, 3).map((t, ti) => (
                    <View key={ti} style={[cal.dot, { backgroundColor: TYPE_COLORS[t] }]} />
                  ))}
                </View>
              )}
              {types.length === 0 && <View style={cal.dotsPlaceholder} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Week Strip ────────────────────────────────────────────────────────────────

function WeekStrip({
  selected,
  onSelect,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
}) {
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(selected);
    d.setDate(d.getDate() - d.getDay());
    return d;
  });
  const today = new Date();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const prevWeek = () => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; });
  const nextWeek = () => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; });

  return (
    <View style={week.wrapper}>
      <View style={week.nav}>
        <TouchableOpacity onPress={prevWeek} style={week.arrow}><Text style={week.arrowText}>‹</Text></TouchableOpacity>
        <Text style={week.label}>
          {days[0].getDate()} {MONTHS_PT[days[0].getMonth()].slice(0, 3)} – {days[6].getDate()} {MONTHS_PT[days[6].getMonth()].slice(0, 3)} {days[6].getFullYear()}
        </Text>
        <TouchableOpacity onPress={nextWeek} style={week.arrow}><Text style={week.arrowText}>›</Text></TouchableOpacity>
      </View>
      <View style={week.strip}>
        {days.map((d) => {
          const isSelected = sameDay(d, selected);
          const isToday = sameDay(d, today);
          return (
            <TouchableOpacity key={toISO(d)} style={week.dayCol} onPress={() => onSelect(d)}>
              <Text style={[week.dowText, isToday && { color: colors.primary }]}>{DAYS_PT[d.getDay()]}</Text>
              <View style={[week.circle, isSelected && week.circleSelected, !isSelected && isToday && week.circleToday]}>
                <Text style={[week.numText, isSelected && week.numSelected, !isSelected && isToday && week.numToday]}>
                  {d.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Month Selector ────────────────────────────────────────────────────────────

function MonthSelector({ year, month, onChange }: {
  year: number; month: number; onChange: (y: number, m: number) => void;
}) {
  const prev = () => month === 0 ? onChange(year - 1, 11) : onChange(year, month - 1);
  const next = () => month === 11 ? onChange(year + 1, 0) : onChange(year, month + 1);
  return (
    <View style={ms.row}>
      <TouchableOpacity onPress={prev} style={ms.arrow}><Text style={ms.arrowText}>‹</Text></TouchableOpacity>
      <Text style={ms.label}>{MONTHS_PT[month]} {year}</Text>
      <TouchableOpacity onPress={next} style={ms.arrow}><Text style={ms.arrowText}>›</Text></TouchableOpacity>
    </View>
  );
}

// ── Appointment Card ──────────────────────────────────────────────────────────

function ApptCard({ a }: { a: AgendaAppointment }) {
  const isPending = a.status === 'pending';
  const isCompleted = a.status === 'completed';
  const typeColor = TYPE_COLORS[a.type] ?? colors.primary;
  const badgeBg = isCompleted ? 'rgba(141,170,145,0.15)' : isPending ? colors.accent + '22' : colors.bg;
  const badgeColor = isCompleted ? colors.primaryDk : isPending ? colors.accent : colors.textMid;

  return (
    <View style={[s.apptCard, isPending && { borderWidth: 1.5, borderColor: colors.accent }]}>
      <View style={s.timeCol}>
        <Text style={[s.hora, { color: typeColor }]}>{a.time.slice(0, 5)}</Text>
        <Text style={s.dur}>{durationLabel(a.duration_minutes)}</Text>
      </View>
      <View style={[s.bar, { backgroundColor: typeColor + '66' }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.apptType}>{TYPE_LABELS[a.type] ?? a.type}</Text>
        {a.location ? <Text style={s.apptLocation}>{a.location}</Text> : null}
      </View>
      <View style={[s.badge, { backgroundColor: badgeBg }]}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: badgeColor }}>
          {STATUS_LABELS[a.status] ?? a.status}
        </Text>
      </View>
    </View>
  );
}

// ── Birth Card ────────────────────────────────────────────────────────────────

function BirthCard({ p }: { p: BirthItem }) {
  const edd = new Date(p.edd);
  const label = edd.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <View style={s.partoCard}>
      <View style={s.dppBadge}><Text style={s.dppText}>{label}</Text></View>
      <Text style={s.partoName}>{p.name}</Text>
      {p.current_week != null && <Text style={s.partoMeta}>Semana {p.current_week}</Text>}
      {p.hospital && <Text style={s.partoHospital}>🏥 {p.hospital}</Text>}
    </View>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function TypeLegend() {
  return (
    <View style={s.legend}>
      {(Object.keys(TYPE_COLORS) as AppointmentType[]).map((t) => (
        <View key={t} style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: TYPE_COLORS[t] }]} />
          <Text style={s.legendText}>{TYPE_LABELS[t]}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function AgendaMedicoScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const today = new Date();

  const [tab, setTab] = useState<TabView>('day');
  const [selectedDate, setSelectedDate] = useState(today);
  const [birthYear, setBirthYear] = useState(today.getFullYear());
  const [birthMonth, setBirthMonth] = useState(today.getMonth());

  const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
  const [allBirths, setAllBirths] = useState<BirthItem[]>([]);
  const [monthAppointments, setMonthAppointments] = useState<AgendaAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthLoading, setMonthLoading] = useState(false);

  // Busca compromissos do dia ou semana selecionada
  const fetchAgenda = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      if (tab === 'births') {
        const res = await patientsService.getDoctorAgenda(user.id, 'births');
        setAllBirths(res.upcoming_births ?? []);
        setAppointments([]);
      } else if (tab === 'day') {
        const res = await patientsService.getDoctorAgenda(user.id, 'day', toISO(selectedDate));
        setAppointments(res.appointments ?? []);
      } else if (tab === 'week') {
        const res = await patientsService.getDoctorAgenda(user.id, 'week', toISO(selectedDate));
        setAppointments(res.appointments ?? []);
      } else {
        // month: carrega o mês inteiro para os dots; lista mostra do dia selecionado
        const res = await patientsService.getDoctorAgenda(user.id, 'day', toISO(selectedDate));
        setAppointments(res.appointments ?? []);
      }
    } catch {
      setAppointments([]); setAllBirths([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, tab, selectedDate]);

  // Busca o mês inteiro para alimentar os dots do calendário
  const fetchMonth = useCallback(async () => {
    if (!user?.id || tab !== 'month') return;
    setMonthLoading(true);
    try {
      const firstOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const res = await patientsService.getDoctorAgenda(user.id, 'week', toISO(firstOfMonth));
      setMonthAppointments(res.appointments ?? []);
    } catch {
      setMonthAppointments([]);
    } finally {
      setMonthLoading(false);
    }
  }, [user?.id, tab, selectedDate.getFullYear(), selectedDate.getMonth()]);

  useEffect(() => { fetchAgenda(); }, [fetchAgenda]);
  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  // Mapa de dots para o calendário: { iso -> AppointmentType[] }
  const markedMap: MarkedMap = {};
  for (const a of monthAppointments) {
    if (a.status === 'cancelled') continue;
    if (!markedMap[a.date]) markedMap[a.date] = [];
    if (!markedMap[a.date].includes(a.type)) markedMap[a.date].push(a.type);
  }

  const filteredBirths = allBirths.filter((b) => {
    const d = new Date(b.edd);
    return d.getFullYear() === birthYear && d.getMonth() === birthMonth;
  });

  const TAB_LABELS: Record<TabView, string> = { day: 'Dia', week: 'Semana', month: 'Mês', births: 'Partos' };

  const weekRangeLabel = (() => {
    const d = new Date(selectedDate);
    const start = new Date(d); start.setDate(d.getDate() - d.getDay());
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return `${start.getDate()} – ${end.getDate()} de ${MONTHS_PT[end.getMonth()]}`;
  })();

  const selectedDayLabel = sameDay(selectedDate, today)
    ? 'Hoje'
    : selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <View style={[s.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Agenda" />

      {/* Tabs */}
      <View style={s.tabs}>
        {(['day', 'week', 'month', 'births'] as TabView[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tab, tab === t && s.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{TAB_LABELS[t]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Dia ── */}
        {tab === 'day' && (
          <DayNavigator
            selected={selectedDate}
            onPrev={() => setSelectedDate((d) => addDays(d, -1))}
            onNext={() => setSelectedDate((d) => addDays(d, 1))}
          />
        )}

        {/* ── Semana ── */}
        {tab === 'week' && (
          <WeekStrip selected={selectedDate} onSelect={setSelectedDate} />
        )}

        {/* ── Mês ── */}
        {tab === 'month' && (
          <>
            {monthLoading
              ? <View style={s.center}><ActivityIndicator size="small" color={colors.primary} /></View>
              : (
                <>
                  <MiniCalendar
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    markedMap={markedMap}
                  />
                  <TypeLegend />
                </>
              )
            }
          </>
        )}

        {/* ── Partos ── */}
        {tab === 'births' && (
          <MonthSelector
            year={birthYear}
            month={birthMonth}
            onChange={(y, m) => { setBirthYear(y); setBirthMonth(m); }}
          />
        )}

        <View style={{ paddingHorizontal: spacing.lg }}>
          {loading ? (
            <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
          ) : (
            <>
              {(tab === 'day' || tab === 'month') && (
                <>
                  {tab === 'month' && (
                    <Text style={s.sectionLabel}>{selectedDayLabel}</Text>
                  )}
                  {appointments.length === 0
                    ? <Text style={s.empty}>Nenhum compromisso.</Text>
                    : appointments.map((a) => <ApptCard key={a.id} a={a} />)
                  }
                </>
              )}
              {tab === 'week' && (
                <>
                  <Text style={s.sectionLabel}>{weekRangeLabel}</Text>
                  {appointments.length === 0
                    ? <Text style={s.empty}>Nenhum compromisso.</Text>
                    : appointments.map((a) => <ApptCard key={a.id} a={a} />)
                  }
                </>
              )}
              {tab === 'births' && (
                filteredBirths.length === 0
                  ? <Text style={s.empty}>Nenhum parto previsto em {MONTHS_PT[birthMonth]}.</Text>
                  : filteredBirths.map((p) => <BirthCard key={p.patient_id} p={p} />)
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', paddingVertical: 40 },
  empty: { textAlign: 'center', color: colors.textMid, fontSize: 14, marginTop: 24 },
  tabs: { flexDirection: 'row', backgroundColor: colors.white, padding: 6, margin: spacing.lg, borderRadius: radius.md },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMid },
  tabTextActive: { color: colors.white },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textMid, marginBottom: 12 },
  apptCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  timeCol: { width: 44, alignItems: 'center' },
  hora: { fontSize: 13, fontWeight: '700' },
  dur: { fontSize: 10, color: colors.textInactive, marginTop: 2 },
  bar: { width: 2, height: 36, borderRadius: 1 },
  apptType: { fontSize: 14, fontWeight: '700', color: colors.text },
  apptLocation: { fontSize: 11.5, color: colors.textMid, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  partoCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  dppBadge: { backgroundColor: colors.accent + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, alignSelf: 'flex-start', marginBottom: 8 },
  dppText: { fontSize: 11, fontWeight: '700', color: colors.accent },
  partoName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  partoMeta: { fontSize: 13, color: colors.textMid, marginBottom: 4 },
  partoHospital: { fontSize: 12, color: colors.primary },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: colors.textMid, fontWeight: '600' },
});

const dn = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: spacing.lg, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 8, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  arrow: { padding: 8 },
  arrowText: { fontSize: 24, color: colors.primary, fontWeight: '600', lineHeight: 28 },
  center: { flex: 1, alignItems: 'center' },
  dateText: { fontSize: 15, fontWeight: '800', color: colors.text, textTransform: 'capitalize' },

});

const cal = StyleSheet.create({
  wrapper: { backgroundColor: colors.white, marginHorizontal: spacing.lg, borderRadius: radius.md, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, marginBottom: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  arrow: { padding: 6 },
  arrowText: { fontSize: 22, color: colors.primary, fontWeight: '600', lineHeight: 26 },
  monthLabel: { fontSize: 14, fontWeight: '800', color: colors.text },
  dowRow: { flexDirection: 'row', marginBottom: 4 },
  dowCell: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: colors.textMid },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', alignItems: 'center', paddingVertical: 2 },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: colors.primary },
  dayToday: { borderWidth: 1.5, borderColor: colors.primary },
  dayText: { fontSize: 12, color: colors.text, fontWeight: '500' },
  dayTextSelected: { color: colors.white, fontWeight: '700' },
  dayTextToday: { color: colors.primary, fontWeight: '700' },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2, height: 5 },
  dotsPlaceholder: { height: 7 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});

const week = StyleSheet.create({
  wrapper: { backgroundColor: colors.white, marginHorizontal: spacing.lg, borderRadius: radius.md, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, marginBottom: 8 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  arrow: { padding: 6 },
  arrowText: { fontSize: 22, color: colors.primary, fontWeight: '600', lineHeight: 26 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  strip: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { flex: 1, alignItems: 'center', gap: 4 },
  dowText: { fontSize: 10, fontWeight: '700', color: colors.textMid },
  circle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  circleSelected: { backgroundColor: colors.primary },
  circleToday: { borderWidth: 1.5, borderColor: colors.primary },
  numText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  numSelected: { color: colors.white, fontWeight: '700' },
  numToday: { color: colors.primary, fontWeight: '700' },
});

const ms = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, marginHorizontal: spacing.lg, borderRadius: radius.md, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, marginBottom: 8 },
  arrow: { padding: 6 },
  arrowText: { fontSize: 22, color: colors.primary, fontWeight: '600', lineHeight: 26 },
  label: { fontSize: 15, fontWeight: '800', color: colors.text },
});
