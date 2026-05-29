import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { cardService } from '../../services/card';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../theme';
import type { CardSection } from '../../types';
import type { DoctorStackParams } from '../../navigation/DoctorNavigator';

type Nav = NativeStackNavigationProp<DoctorStackParams>;

const BUILTIN_LABELS: Record<string, string> = {
  dados_gestacionais: '📋 Built-in',
  evolucao:           '📈 Built-in',
  exames:             '🧪 Built-in',
  vacinas:            '💉 Built-in',
  medicamentos:       '💊 Built-in',
  anamnese:           '📝 Built-in',
};

export function DoctorCardTemplateScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [sections, setSections] = useState<CardSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingTitle, setAddingTitle] = useState('');
  const [addingType, setAddingType] = useState<'text' | 'fields'>('text');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    const data = await cardService.getTemplate(user.id);
    setSections(data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const move = async (sectionId: string, direction: 'up' | 'down') => {
    if (!user?.id) return;
    const updated = await cardService.moveSection(user.id, sectionId, direction);
    setSections(updated);
  };

  const toggleVisible = async (section: CardSection) => {
    if (!user?.id) return;
    const updated = await cardService.updateSection(user.id, section.id, { visible: !section.visible });
    setSections((prev) => prev.map((s) => s.id === section.id ? updated : s));
  };

  const saveTitle = async (section: CardSection) => {
    if (!user?.id || !editingTitle.trim()) { setEditingId(null); return; }
    const updated = await cardService.updateSection(user.id, section.id, { title: editingTitle.trim() });
    setSections((prev) => prev.map((s) => s.id === section.id ? updated : s));
    setEditingId(null);
  };

  const addSection = async () => {
    if (!user?.id || !addingTitle.trim()) return;
    setSaving(true);
    try {
      const novo = await cardService.addSection(user.id, { title: addingTitle.trim(), section_type: addingType });
      setSections((prev) => [...prev, novo]);
      setAddingTitle(''); setShowAdd(false);
    } catch {}
    finally { setSaving(false); }
  };

  const deleteSection = (section: CardSection) => {
    Alert.alert('Remover seção', `Remover "${section.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          if (!user?.id) return;
          await cardService.deleteSection(user.id, section.id);
          setSections((prev) => prev.filter((s) => s.id !== section.id));
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[s.container, { paddingBottom: insets.bottom }]}>
        <ScreenHeader title="Template do Cartão" />
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Template do Cartão" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <Text style={s.hint}>
          Configure a ordem e visibilidade das seções. As seções built-in puxam dados automaticamente. Use ↑↓ para reordenar.
        </Text>

        {sections.map((section, idx) => (
          <View key={section.id} style={[s.card, !section.visible && s.cardHidden]}>
            <View style={s.cardLeft}>
              <View style={s.arrowCol}>
                <TouchableOpacity onPress={() => move(section.id, 'up')} disabled={idx === 0} style={s.arrow}>
                  <Text style={[s.arrowText, idx === 0 && s.arrowDisabled]}>↑</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => move(section.id, 'down')} disabled={idx === sections.length - 1} style={s.arrow}>
                  <Text style={[s.arrowText, idx === sections.length - 1 && s.arrowDisabled]}>↓</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                {editingId === section.id ? (
                  <TextInput
                    style={s.titleInput}
                    value={editingTitle}
                    onChangeText={setEditingTitle}
                    onBlur={() => saveTitle(section)}
                    onSubmitEditing={() => saveTitle(section)}
                    autoFocus
                  />
                ) : (
                  <TouchableOpacity onPress={() => { setEditingId(section.id); setEditingTitle(section.title); }}>
                    <Text style={[s.sectionTitle, !section.visible && s.sectionTitleHidden]}>{section.title}</Text>
                  </TouchableOpacity>
                )}
                {section.builtin_key && (
                  <Text style={s.builtinBadge}>{BUILTIN_LABELS[section.builtin_key] ?? '⚙ Built-in'}</Text>
                )}
                {!section.builtin_key && (
                  <Text style={s.builtinBadge}>{section.section_type === 'text' ? '📄 Texto livre' : '📋 Campos'}</Text>
                )}
              </View>
            </View>
            <View style={s.cardActions}>
              <TouchableOpacity onPress={() => toggleVisible(section)} style={s.actionBtn}>
                <Text style={s.actionBtnText}>{section.visible ? '👁' : '🙈'}</Text>
              </TouchableOpacity>
              {section.section_type !== 'builtin' && (
                <TouchableOpacity onPress={() => deleteSection(section)} style={s.actionBtn}>
                  <Text style={[s.actionBtnText, { color: colors.red }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {showAdd ? (
          <View style={s.addCard}>
            <TextInput
              style={s.titleInput}
              value={addingTitle}
              onChangeText={setAddingTitle}
              placeholder="Título da seção"
              placeholderTextColor={colors.textInactive}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {(['text', 'fields'] as const).map((t) => (
                <TouchableOpacity key={t}
                  style={[s.typeChip, addingType === t && s.typeChipActive]}
                  onPress={() => setAddingType(t)}>
                  <Text style={[s.typeChipText, addingType === t && s.typeChipTextActive]}>
                    {t === 'text' ? 'Texto livre' : 'Campos label+valor'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: colors.bg }]} onPress={() => setShowAdd(false)}>
                <Text style={[s.btnText, { color: colors.textMid }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { flex: 1 }, saving && { opacity: 0.6 }]} onPress={addSection} disabled={saving}>
                <Text style={s.btnText}>{saving ? 'Adicionando...' : 'Adicionar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
            <Text style={s.addBtnText}>+ Nova seção</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 13, color: colors.textMid, marginBottom: 20, lineHeight: 19 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardHidden: { opacity: 0.45 },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  arrowCol: { gap: 2 },
  arrow: { padding: 4 },
  arrowText: { fontSize: 16, color: colors.primary, fontWeight: '700' },
  arrowDisabled: { color: colors.textInactive },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  sectionTitleHidden: { color: colors.textInactive },
  builtinBadge: { fontSize: 10, color: colors.textMid, fontWeight: '600' },
  titleInput: { fontSize: 14, fontWeight: '700', color: colors.text, borderBottomWidth: 1.5, borderBottomColor: colors.primary, paddingBottom: 2, marginBottom: 4 },
  cardActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 8 },
  actionBtnText: { fontSize: 16 },
  addCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 16, marginTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  addBtn: { borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 8 },
  addBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.textInactive },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { fontSize: 12, fontWeight: '600', color: colors.textMid },
  typeChipTextActive: { color: colors.white },
  btn: { backgroundColor: colors.primary, borderRadius: radius.full, padding: 14, alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '700', color: colors.white },
});
