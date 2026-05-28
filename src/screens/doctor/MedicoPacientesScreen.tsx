import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
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

export function MedicoPacientesScreen() {
  const { user } = useAuth();
  const [busca, setBusca] = useState('');
  const [filtroRisk, setFiltroRisk] = useState<RiskFilter>('todos');
  const [pacientes, setPacientes] = useState<PatientDetail[]>([]);
  const [loading, setLoading] = useState(true);
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
                {p.current_week != null && (
                  <View style={styles.weekBadge}>
                    <Text style={styles.weekText}>Sem. {p.current_week}</Text>
                  </View>
                )}
                <RiskBadge risk={RISK_BADGE_MAP[p.risk_level]} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
  weekBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  weekText: { fontSize: 11, fontWeight: '700', color: colors.primaryDk },
});
