import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { cardService } from '../../services/card';
import { colors, spacing, radius } from '../../theme';
import type { PatientCard, RenderedCardSection, CardFieldValue } from '../../types';
import type { DoctorStackParams } from '../../navigation/DoctorNavigator';

type RouteType = RouteProp<DoctorStackParams, 'PatientCard'>;

// ── Renderizadores por tipo de seção ─────────────────────────────────────────

function BuiltinDadosGestacionais({ data }: { data: Record<string, any> }) {
  const rows = [
    ['DUM', data.lmp_date ? new Date(data.lmp_date).toLocaleDateString('pt-BR') : '—'],
    ['DPP', data.edd ? new Date(data.edd).toLocaleDateString('pt-BR') : '—'],
    ['Semana gestacional', data.current_week ? `${data.current_week}ª semana` : '—'],
    ['Tipo sanguíneo', data.blood_type ?? '—'],
    ['Altura', data.height_cm ? `${data.height_cm} cm` : '—'],
    ['Peso inicial', data.weight_initial_kg ? `${data.weight_initial_kg} kg` : '—'],
    ['Risco', data.risk_level ?? '—'],
    ['Hospital', data.hospital ?? '—'],
    ['Paridade', data.parity ?? '—'],
    ['Nº de fetos', data.number_of_fetuses ? String(data.number_of_fetuses) : '—'],
  ];
  return (
    <View>
      {rows.map(([label, value]) => (
        <View key={label} style={s.infoRow}>
          <Text style={s.infoKey}>{label}</Text>
          <Text style={s.infoVal}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function BuiltinEvolucao({ data }: { data: Record<string, any> }) {
  const evos: any[] = data.evolutions ?? [];
  if (evos.length === 0) return <Text style={s.emptyText}>Nenhuma evolução registrada ainda.</Text>;
  return (
    <View>
      <View style={s.tableHeader}>
        {['Data', 'Peso', 'PA', 'AU', 'BCF', 'Edema'].map((h) => (
          <Text key={h} style={s.tableHeaderCell}>{h}</Text>
        ))}
      </View>
      {evos.map((e, i) => (
        <View key={i} style={[s.tableRow, i % 2 === 1 && { backgroundColor: colors.bg }]}>
          <Text style={s.tableCell}>{e.date ? new Date(e.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}</Text>
          <Text style={s.tableCell}>{e.weight_kg ?? '—'}</Text>
          <Text style={s.tableCell}>{e.bp ?? '—'}</Text>
          <Text style={s.tableCell}>{e.fundal_height_cm ?? '—'}</Text>
          <Text style={s.tableCell}>{e.fetal_heart_rate ?? '—'}</Text>
          <Text style={s.tableCell}>{e.edema && e.edema !== 'none' ? e.edema : '—'}</Text>
        </View>
      ))}
    </View>
  );
}

function BuiltinList({ items, labelKey, subKeys }: { items: any[]; labelKey: string; subKeys: string[] }) {
  if (!items || items.length === 0) return <Text style={s.emptyText}>Nenhum item registrado.</Text>;
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={s.listItem}>
          <Text style={s.listItemTitle}>{item[labelKey]}</Text>
          {subKeys.map((k) => item[k] ? (
            <Text key={k} style={s.listItemSub}>{item[k]}</Text>
          ) : null)}
        </View>
      ))}
    </View>
  );
}

function BuiltinAnamnese({ data }: { data: Record<string, any> }) {
  const doencas = [
    data.has_diabetes && 'Diabetes',
    data.has_hipertensao && 'Hipertensão',
  ].filter(Boolean);
  return (
    <View>
      {doencas.length > 0 && <Text style={s.infoVal}>Doenças: {doencas.join(', ')}</Text>}
      {data.alergias_medicamentos && <Text style={s.infoVal}>Alergias: {data.alergias_medicamentos}</Text>}
      {data.tabagismo && <Text style={s.infoVal}>Tabagismo: sim</Text>}
      {data.alcool && <Text style={s.infoVal}>Álcool: {data.alcool_frequencia ?? 'sim'}</Text>}
      {data.pre_eclampsia_anterior && <Text style={s.infoVal}>Pré-eclâmpsia anterior: sim</Text>}
      {doencas.length === 0 && !data.alergias_medicamentos && !data.tabagismo && !data.alcool && (
        <Text style={s.emptyText}>Anamnese não preenchida.</Text>
      )}
    </View>
  );
}

function BuiltinSection({ builtin_key, builtin_data }: { builtin_key: string; builtin_data: Record<string, any> }) {
  if (builtin_key === 'dados_gestacionais') return <BuiltinDadosGestacionais data={builtin_data} />;
  if (builtin_key === 'evolucao') return <BuiltinEvolucao data={builtin_data} />;
  if (builtin_key === 'exames') return <BuiltinList items={builtin_data.exames ?? []} labelKey="name" subKeys={['date', 'status', 'result']} />;
  if (builtin_key === 'vacinas') return <BuiltinList items={builtin_data.vacinas ?? []} labelKey="type" subKeys={['date', 'status']} />;
  if (builtin_key === 'medicamentos') return <BuiltinList items={builtin_data.medicamentos ?? []} labelKey="name" subKeys={['dosage', 'frequency']} />;
  if (builtin_key === 'anamnese') return <BuiltinAnamnese data={builtin_data} />;
  return null;
}

// ── Seção editável ────────────────────────────────────────────────────────────

function EditableTextSection({
  section, patientId, onSaved,
}: { section: RenderedCardSection; patientId: string; onSaved: () => void }) {
  const [value, setValue] = useState(section.content ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await cardService.saveSectionContent(patientId, section.section_id, { content: value });
      onSaved();
    } catch {}
    finally { setSaving(false); }
  };

  return (
    <View>
      <TextInput
        style={s.textArea}
        multiline
        value={value}
        onChangeText={setValue}
        placeholder="Escreva aqui..."
        placeholderTextColor={colors.textInactive}
        textAlignVertical="top"
      />
      <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        <Text style={s.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function EditableFieldsSection({
  section, patientId, onSaved,
}: { section: RenderedCardSection; patientId: string; onSaved: () => void }) {
  const [fields, setFields] = useState<CardFieldValue[]>(
    section.fields?.length ? section.fields : [{ label: '', value: '', position: 0 }]
  );
  const [saving, setSaving] = useState(false);

  const updateField = (idx: number, key: 'label' | 'value', val: string) => {
    setFields((prev) => prev.map((f, i) => i === idx ? { ...f, [key]: val } : f));
  };

  const addField = () => {
    setFields((prev) => [...prev, { label: '', value: '', position: prev.length }]);
  };

  const removeField = (idx: number) => {
    setFields((prev) => prev.filter((_, i) => i !== idx).map((f, i) => ({ ...f, position: i })));
  };

  const save = async () => {
    setSaving(true);
    try {
      const valid = fields.filter((f) => f.label.trim());
      await cardService.saveSectionContent(patientId, section.section_id, { fields: valid });
      onSaved();
    } catch {}
    finally { setSaving(false); }
  };

  return (
    <View>
      {fields.map((f, idx) => (
        <View key={idx} style={s.fieldRow}>
          <TextInput
            style={[s.fieldInput, { flex: 1 }]}
            value={f.label}
            onChangeText={(v) => updateField(idx, 'label', v)}
            placeholder="Label"
            placeholderTextColor={colors.textInactive}
          />
          <Text style={{ color: colors.textMid, marginHorizontal: 6 }}>:</Text>
          <TextInput
            style={[s.fieldInput, { flex: 2 }]}
            value={f.value ?? ''}
            onChangeText={(v) => updateField(idx, 'value', v)}
            placeholder="Valor"
            placeholderTextColor={colors.textInactive}
          />
          <TouchableOpacity onPress={() => removeField(idx)} style={{ padding: 6 }}>
            <Text style={{ color: colors.accent, fontWeight: '700' }}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={addField} style={s.addFieldBtn}>
        <Text style={s.addFieldBtnText}>+ Adicionar campo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        <Text style={s.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function PatientCardScreen() {
  const route = useRoute<RouteType>();
  const { patientId, patientName } = route.params;
  const insets = useSafeAreaInsets();
  const [card, setCard] = useState<PatientCard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await cardService.getPatientCard(patientId);
      setCard(data);
    } catch {}
    finally { setLoading(false); }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const visibleSections = card?.sections.filter((s) => s.visible) ?? [];

  if (loading) {
    return (
      <View style={[s.container, { paddingBottom: insets.bottom }]}>
        <ScreenHeader title={`Cartão — ${patientName}`} />
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title={`Cartão — ${patientName}`} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        {visibleSections.map((section) => (
          <View key={section.section_id} style={s.sectionCard}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <View style={s.divider} />
            {section.section_type === 'builtin' && section.builtin_key && section.builtin_data ? (
              <BuiltinSection builtin_key={section.builtin_key} builtin_data={section.builtin_data} />
            ) : section.section_type === 'text' ? (
              <EditableTextSection section={section} patientId={patientId} onSaved={load} />
            ) : section.section_type === 'fields' ? (
              <EditableFieldsSection section={section} patientId={patientId} onSaved={load} />
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 10 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  infoKey: { fontSize: 12, color: colors.textMid, fontWeight: '600', flex: 1 },
  infoVal: { fontSize: 13, color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  emptyText: { fontSize: 13, color: colors.textMid, fontStyle: 'italic' },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.primaryLight, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 4, marginBottom: 4 },
  tableHeaderCell: { flex: 1, fontSize: 10, fontWeight: '700', color: colors.primaryDk, textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, backgroundColor: colors.white },
  tableCell: { flex: 1, fontSize: 11, color: colors.text, textAlign: 'center' },
  listItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  listItemTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  listItemSub: { fontSize: 11, color: colors.textMid, marginTop: 2 },
  textArea: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 12, fontSize: 14, color: colors.text, minHeight: 100, marginBottom: 12 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  fieldInput: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 10, fontSize: 13, color: colors.text },
  addFieldBtn: { borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: radius.sm, padding: 10, alignItems: 'center', marginBottom: 12 },
  addFieldBtnText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.full, padding: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
});
