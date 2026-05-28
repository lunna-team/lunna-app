import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DoctorStackParams } from '../../navigation/DoctorNavigator';
import { ScreenHeader } from '../../components/ScreenHeader';
import { RiskBadge, Risk } from '../../components/RiskBadge';
import { colors, spacing, radius } from '../../theme';

type Nav = NativeStackNavigationProp<DoctorStackParams>;

const PACIENTES = [
  { iniciais: 'MS', nome: 'Maria da Silva', prontuario: '2024-00847', semana: 24, risk: 'low' as Risk, proxima: '07 Mar' },
  { iniciais: 'CM', nome: 'Carla Mendes', prontuario: '2024-00312', semana: 20, risk: 'low' as Risk, proxima: '10 Mar' },
  { iniciais: 'FC', nome: 'Fernanda Costa', prontuario: '2024-00589', semana: 10, risk: 'med' as Risk, proxima: '08 Mar' },
  { iniciais: 'JR', nome: 'Juliana Rocha', prontuario: '2024-00201', semana: 32, risk: 'low' as Risk, proxima: '15 Mar' },
  { iniciais: 'PS', nome: 'Patrícia Souza', prontuario: '2024-00734', semana: 36, risk: 'high' as Risk, proxima: '06 Mar' },
];

export function MedicoPacientesScreen() {
  const [busca, setBusca] = useState('');
  const [filtroRisk, setFiltroRisk] = useState<'todos' | Risk>('todos');
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const filtradas = PACIENTES.filter((p) => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) || p.prontuario.includes(busca);
    const matchRisk = filtroRisk === 'todos' || p.risk === filtroRisk;
    return matchBusca && matchRisk;
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Pacientes" />
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: 16, gap: 12 }}>
        <TextInput style={styles.searchInput} placeholder="Buscar por nome ou prontuário..." placeholderTextColor={colors.textInactive} value={busca} onChangeText={setBusca} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(['todos', 'low', 'med', 'high'] as const).map((r) => (
            <TouchableOpacity key={r} style={[styles.chip, filtroRisk === r && styles.chipActive]} onPress={() => setFiltroRisk(r)}>
              <Text style={[styles.chipText, filtroRisk === r && styles.chipTextActive]}>
                {r === 'todos' ? 'Todos' : r === 'low' ? 'Baixo risco' : r === 'med' ? 'Atenção' : 'Alto risco'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        {filtradas.map((p) => (
          <TouchableOpacity key={p.prontuario} style={styles.card} onPress={() => navigation.navigate('PacienteDetalhe')} activeOpacity={0.85}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{p.iniciais}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nome}>{p.nome}</Text>
              <Text style={styles.meta}>Prontuário {p.prontuario}</Text>
              <Text style={styles.meta}>Próxima: {p.proxima}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View style={styles.weekBadge}><Text style={styles.weekText}>Sem. {p.semana}</Text></View>
              <RiskBadge risk={p.risk} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
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
