import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, spacing, radius } from '../../theme';

const CATEGORIAS = ['Todos', 'Agenda', 'Saúde', 'Clínica', 'Geral'];
const AVISOS = [
  { id: 1, cat: 'Agenda', icon: '📅', titulo: 'Recesso de Carnaval', curto: 'Clínica fechada de 1 a 5 de Março.', completo: 'A Clínica Gerar Vida estará fechada durante o Recesso de Carnaval, de 1 a 5 de Março. Retornamos normalmente no dia 6 de Março. Em caso de urgência, entre em contato pelo Chat.', data: 'Ontem', novo: true },
  { id: 2, cat: 'Saúde', icon: '💉', titulo: 'Campanha de Vacinação', curto: 'Vacina da gripe disponível até 28 de Fevereiro.', completo: 'A vacina da gripe está disponível gratuitamente para gestantes até o dia 28 de Fevereiro. Agende no chat ou presencialmente.', data: '2 dias atrás', novo: true },
  { id: 3, cat: 'Clínica', icon: '🏥', titulo: 'Novo Horário de Atendimento', curto: 'A partir de Março, atendimento até às 19h.', completo: 'A partir de 1 de Março, nosso horário de atendimento será estendido até às 19h de segunda a sexta.', data: '1 semana atrás', novo: false },
  { id: 4, cat: 'Geral', icon: '📢', titulo: 'Pesquisa de Satisfação', curto: 'Compartilhe sua experiência conosco.', completo: 'Queremos saber como foi sua experiência na clínica. Responda nossa pesquisa de satisfação pelo link enviado por e-mail.', data: '2 semanas atrás', novo: false },
  { id: 5, cat: 'Agenda', icon: '📋', titulo: 'Lembrete de Exames', curto: 'Exames do 2º trimestre disponíveis.', completo: 'Os exames do segundo trimestre já estão disponíveis para agendamento. Solicite à sua médica na próxima consulta ou pelo chat.', data: '1 mês atrás', novo: false },
];

export function AvisosScreen() {
  const [catAtiva, setCatAtiva] = useState('Todos');
  const [expandido, setExpandido] = useState<number | null>(null);
  const insets = useSafeAreaInsets();

  const filtrados = catAtiva === 'Todos' ? AVISOS : AVISOS.filter((a) => a.cat === catAtiva);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Avisos da Clínica" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8 }}>
        {CATEGORIAS.map((c) => (
          <TouchableOpacity key={c} style={[styles.chip, catAtiva === c && styles.chipActive]} onPress={() => setCatAtiva(c)}>
            <Text style={[styles.chipText, catAtiva === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        {filtrados.map((a) => (
          <TouchableOpacity key={a.id} style={styles.card} onPress={() => setExpandido(expandido === a.id ? null : a.id)} activeOpacity={0.85}>
            <View style={styles.cardHeader}>
              <Text style={{ fontSize: 22 }}>{a.icon}</Text>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.titulo}>{a.titulo}</Text>
                  {a.novo && <View style={styles.novoBadge}><Text style={styles.novoBadgeText}>Novo</Text></View>}
                </View>
                <Text style={styles.curto}>{a.curto}</Text>
                <Text style={styles.data}>{a.data}</Text>
              </View>
              <Text style={{ fontSize: 18, color: colors.textInactive }}>{expandido === a.id ? '∧' : '∨'}</Text>
            </View>
            {expandido === a.id && <Text style={styles.completo}>{a.completo}</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  filtros: { maxHeight: 52, paddingVertical: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textMid },
  chipTextActive: { color: colors.white },
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titulo: { fontSize: 14, fontWeight: '700', color: colors.text },
  curto: { fontSize: 12, color: colors.textMid, marginTop: 2 },
  data: { fontSize: 11, color: colors.textInactive, marginTop: 4 },
  novoBadge: { backgroundColor: colors.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  novoBadgeText: { fontSize: 9, fontWeight: '700', color: colors.white },
  completo: { fontSize: 13, color: colors.text, lineHeight: 20, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.bg },
});
