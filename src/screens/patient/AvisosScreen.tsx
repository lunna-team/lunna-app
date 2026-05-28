import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { announcementsService } from '../../services/announcements';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../theme';
import type { Announcement } from '../../types';

const CATEGORIAS = ['Todos', 'Agenda', 'Saúde', 'Clínica', 'Geral'];

const CATEGORY_ICONS: Record<string, string> = {
  Agenda: '📅', Saúde: '💉', Clínica: '🏥', Geral: '📢',
};

function formatRelativeDate(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  if (diff < 7) return `${diff} dias atrás`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function AvisosScreen() {
  const { user } = useAuth();
  const [catAtiva, setCatAtiva] = useState('Todos');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!user?.clinic_id) return;
    announcementsService
      .list(user.clinic_id, { limit: 50 })
      .then((res) => setAvisos(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.clinic_id]);

  const filtrados = catAtiva === 'Todos'
    ? avisos
    : avisos.filter((a) => a.category === catAtiva);

  const handleExpand = (aviso: Announcement) => {
    const next = expandido === aviso.id ? null : aviso.id;
    setExpandido(next);
    if (next && aviso.is_new && user?.clinic_id) {
      announcementsService.markRead(user.clinic_id, aviso.id).catch(() => {});
      setAvisos((prev) =>
        prev.map((a) => (a.id === aviso.id ? { ...a, is_new: false } : a)),
      );
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Avisos da Clínica" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtros}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8 }}
      >
        {CATEGORIAS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, catAtiva === c && styles.chipActive]}
            onPress={() => setCatAtiva(c)}
          >
            <Text style={[styles.chipText, catAtiva === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
          {filtrados.length === 0 && (
            <Text style={styles.empty}>Nenhum aviso encontrado.</Text>
          )}
          {filtrados.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={styles.card}
              onPress={() => handleExpand(a)}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <Text style={{ fontSize: 22 }}>{CATEGORY_ICONS[a.category] ?? '📢'}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.titulo}>{a.title}</Text>
                    {a.is_new && (
                      <View style={styles.novoBadge}>
                        <Text style={styles.novoBadgeText}>Novo</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.curto}>{a.short_description}</Text>
                  <Text style={styles.data}>{formatRelativeDate(a.created_at)}</Text>
                </View>
                <Text style={{ fontSize: 18, color: colors.textInactive }}>
                  {expandido === a.id ? '∧' : '∨'}
                </Text>
              </View>
              {expandido === a.id && (
                <Text style={styles.completo}>{a.full_description}</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  filtros: { maxHeight: 52, paddingVertical: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  empty: { textAlign: 'center', color: colors.textMid, marginTop: 40, fontSize: 14 },
});
