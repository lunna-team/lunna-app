import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { NovaGestanteModal } from './NovaGestanteModal';
import { OnboardingGestante } from './OnboardingGestante';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DoctorStackParams } from '../../navigation/DoctorNavigator';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { RiskBadge } from '../../components/domain/RiskBadge';
import { patientsService } from '../../services/patients';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../theme';
import type { PatientDetail, RiskLevel } from '../../types';

type Nav = NativeStackNavigationProp<DoctorStackParams>;
type RiskFilter = 'todos' | RiskLevel;

const RISK_BADGE_MAP: Record<RiskLevel, 'low' | 'med' | 'high'> = {
  low: 'low', medium: 'med', high: 'high',
};

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function calcWeek(edd: string | null, currentWeek: number | null): number | null {
  if (currentWeek != null) return currentWeek;
  if (!edd) return null;
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksUntilEdd = (new Date(edd).getTime() - Date.now()) / msPerWeek;
  const week = Math.round(40 - weeksUntilEdd);
  return week >= 1 && week <= 42 ? week : null;
}

function getTriColor(week: number): string {
  if (week <= 13) return '#3A7DB5';
  if (week <= 27) return '#5E7E63';
  return '#b5522a';
}

function getTriLabel(week: number): string {
  if (week <= 13) return '1º Tri';
  if (week <= 27) return '2º Tri';
  return '3º Tri';
}

export function MedicoPacientesScreen() {
  const { user } = useAuth();
  const [busca, setBusca] = useState('');
  const [filtroRisk, setFiltroRisk] = useState<RiskFilter>('todos');
  const [pacientes, setPacientes] = useState<PatientDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNova, setShowNova] = useState(false);
  const [onboardingPatientId, setOnboardingPatientId] = useState<string | null>(null);
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPacientes = (search: string, risk: RiskFilter) => {
    if (!user?.id) return;
    setLoading(true);
    patientsService
      .getDoctorPatients(user.id, {
        search: search || undefined,
        risk_level: risk !== 'todos' ? risk : undefined,
        limit: 50,
      })
      .then((res) => setPacientes(res.data))
      .catch(() => setPacientes([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPacientes('', 'todos');
  }, [user?.id]);

  const handleBusca = (text: string) => {
    setBusca(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPacientes(text, filtroRisk), 300);
  };

  const handleRisk = (risk: RiskFilter) => {
    setFiltroRisk(risk);
    fetchPacientes(busca, risk);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Pacientes" />

      <NovaGestanteModal
        visible={showNova}
        onClose={() => setShowNova(false)}
        onCreated={(id) => {
          setShowNova(false);
          setOnboardingPatientId(id);
        }}
      />
      {onboardingPatientId && (
        <OnboardingGestante
          visible={true}
          patientId={onboardingPatientId}
          onFinish={() => {
            setOnboardingPatientId(null);
            fetchPacientes(busca, filtroRisk);
          }}
        />
      )}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: 16, gap: 12 }}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome..."
          placeholderTextColor={colors.textInactive}
          value={busca}
          onChangeText={handleBusca}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(['todos', 'low', 'medium', 'high'] as RiskFilter[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.chip, filtroRisk === r && styles.chipActive]}
              onPress={() => handleRisk(r)}
            >
              <Text style={[styles.chipText, filtroRisk === r && styles.chipTextActive]}>
                {r === 'todos' ? 'Todos' : r === 'low' ? 'Baixo risco' : r === 'medium' ? 'Atenção' : 'Alto risco'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
          {pacientes.length === 0 && (
            <Text style={styles.empty}>Nenhum paciente encontrado.</Text>
          )}
          {pacientes.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.card}
              onPress={() => navigation.navigate('PacienteDetalhe', { patientId: p.id })}
              activeOpacity={0.85}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(p.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>{p.name}</Text>
                {p.prontuario && <Text style={styles.meta}>Prontuário {p.prontuario}</Text>}
                {p.edd && (
                  <Text style={styles.meta}>
                    DPP: {new Date(p.edd).toLocaleDateString('pt-BR')}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                {(() => {
                  const week = calcWeek(p.edd, p.current_week);
                  if (week == null) return null;
                  const color = getTriColor(week);
                  return (
                    <View style={styles.weekBadge}>
                      <Text style={[styles.weekNum, { color }]}>{week}</Text>
                      <Text style={styles.weekSub}>{getTriLabel(week)}</Text>
                    </View>
                  );
                })()}
                <RiskBadge risk={RISK_BADGE_MAP[p.risk_level]} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowNova(true)} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: colors.textMid, fontSize: 14, marginTop: 40 },
  searchInput: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, fontSize: 14, color: colors.text, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textMid },
  chipTextActive: { color: colors.white },
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primaryDk },
  nome: { fontSize: 14, fontWeight: '700', color: colors.text },
  meta: { fontSize: 11.5, color: colors.textMid, marginTop: 1 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  fabText: { fontSize: 28, color: '#fff', lineHeight: 32, fontWeight: '300' },
  weekBadge: { alignItems: 'center' },
  weekNum: { fontSize: 20, fontWeight: '800', lineHeight: 22 },
  weekSub: { fontSize: 10, fontWeight: '600', color: colors.textInactive, marginTop: 1 },
});
