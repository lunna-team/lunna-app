import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, TouchableWithoutFeedback, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DoctorStackParams } from '../../navigation/DoctorNavigator';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { patientsService } from '../../services/patients';
import { vitalsService } from '../../services/vitals';
import { appointmentsService } from '../../services/appointments';
import { examsService } from '../../services/exams';
import { storage, STORAGE_KEYS } from '../../services/storage';
import { colors, spacing, radius } from '../../theme';
import type {
  PatientDetail, PatientProntuario,
  BloodPressureReading, GlucoseReading, GlucoseMoment,
  Appointment, Ultrasound, LabTest, Vaccine, VaccineStatus,
  RiskLevel, AppointmentEvolution, EvolutionCreate, EdemaGrade,
  PatientAnamnesis, AnamneseCreate, AlcoolFrequencia, Medication,
} from '../../types';
import { medicationsService, MedicationCreate } from '../../services/medications';
import { EXAMES_PRIMEIRO_TRIMESTRE, EXAMES_SEGUNDO_TRIMESTRE, EXAMES_TERCEIRO_TRIMESTRE } from '../../constants';

type RouteType = RouteProp<DoctorStackParams, 'PacienteDetalhe'>;
type Tab = 'geral' | 'anamnese' | 'sinais' | 'consultas' | 'usg' | 'exames' | 'vacinas' | 'meds';

const TABS: { key: Tab; label: string }[] = [
  { key: 'geral',     label: 'Geral' },
  { key: 'anamnese',  label: 'Anamnese' },
  { key: 'sinais',    label: 'Sinais Vitais' },
  { key: 'consultas', label: 'Consultas' },
  { key: 'usg',       label: 'USG' },
  { key: 'exames',    label: 'Exames' },
  { key: 'vacinas',   label: 'Vacinas' },
  { key: 'meds',      label: 'Medicamentos' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const classifyPA = (sys: number, dia: number) => {
  if (sys >= 140 || dia >= 90) return { label: 'Hipertensão', color: colors.red };
  if (sys >= 130 || dia >= 80) return { label: 'Grau 1', color: colors.accent };
  return { label: 'Normal', color: '#3CB371' };
};

const classifyGlic = (v: number, m: string) => {
  const jejum = m === 'fasting';
  if (jejum ? v > 95 : v >= 140) return { label: 'Atenção', color: colors.yellow };
  return { label: 'Normal', color: '#3CB371' };
};

const VACCINE_STATUS_LABELS: Record<VaccineStatus, { bg: string; color: string; label: string }> = {
  completed: { bg: 'rgba(141,170,145,0.15)', color: colors.primaryDk, label: 'Aplicada' },
  scheduled: { bg: 'rgba(245,166,35,0.15)', color: '#8a5e00', label: 'Agendada' },
  missed: { bg: 'rgba(0,0,0,0.06)', color: colors.textInactive, label: 'Não aplicada' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function calcWeek(edd: string | null, currentWeek: number | null): number | null {
  if (currentWeek != null) return currentWeek;
  if (!edd) return null;
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const week = Math.round(40 - (new Date(edd).getTime() - Date.now()) / msPerWeek);
  return week >= 1 && week <= 42 ? week : null;
}

function getTriColor(week: number): string {
  if (week <= 13) return '#3A7DB5';
  if (week <= 27) return '#8DAA91';
  return '#E5987D';
}

function getTriLabel(week: number): string {
  if (week <= 13) return '1º Tri';
  if (week <= 27) return '2º Tri';
  return '3º Tri';
}

// ── Reusable components ───────────────────────────────────────────────────────

function Sheet({ visible, onClose, title, children }: {
  visible: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} />
      </TouchableWithoutFeedback>
      <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={s.handle} />
        <Text style={s.sheetTitle}>{title}</Text>
        <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </Modal>
  );
}

function Field({ label, value, onChange, multiline, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.fieldInput, multiline && { minHeight: 64 }]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        placeholder={placeholder || label}
        placeholderTextColor={colors.textInactive}
      />
    </View>
  );
}

function ExpandCard({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.expandCard}>
      <TouchableOpacity style={s.expandHeader} onPress={() => setOpen(!open)} activeOpacity={0.75}>
        <View style={{ flex: 1 }}>{header}</View>
        <Text style={{ fontSize: 16, color: colors.textInactive }}>{open ? '∧' : '∨'}</Text>
      </TouchableOpacity>
      {open && <View style={s.expandBody}>{children}</View>}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>;
}

// ── GERAL TAB ─────────────────────────────────────────────────────────────────

function GeralTab({ patientId }: { patientId: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<DoctorStackParams>>();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [prontuario, setProntuario] = useState<PatientProntuario | null>(null);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    height_cm: '', weight_initial_kg: '', blood_type: '',
    parity: '', acompanhante: '', hospital: '',
    number_of_fetuses: '1', cesarean_predicted: false,
    risk_level: 'low' as RiskLevel,
    lmp_date: '', edd: '',
  });

  const loadData = async () => {
    const [pt, pr, nota] = await Promise.all([
      patientsService.getPatient(patientId),
      patientsService.getProntuario(patientId),
      storage.get<string>(STORAGE_KEYS.notasMedica),
    ]);
    setPatient(pt);
    setProntuario(pr);
    if (nota) setNotas(nota);
    setForm({
      height_cm: pt.height_cm ?? '',
      weight_initial_kg: pt.weight_initial_kg ?? '',
      blood_type: pt.blood_type ?? '',
      parity: (pt as any).parity ?? '',
      acompanhante: (pt as any).acompanhante ?? '',
      hospital: pt.hospital ?? '',
      number_of_fetuses: String((pt as any).number_of_fetuses ?? 1),
      cesarean_predicted: (pt as any).cesarean_predicted ?? false,
      risk_level: (pt.risk_level as RiskLevel) ?? 'low',
      lmp_date: pr?.lmp_date ?? '',
      edd: pr?.edd ?? '',
    });
  };

  useEffect(() => {
    loadData().catch(() => {}).finally(() => setLoading(false));
  }, [patientId]);

  const saveNotas = async (text: string) => {
    setNotas(text);
    await storage.set(STORAGE_KEYS.notasMedica, text);
  };

  const salvarEdicao = async () => {
    setSaving(true);
    try {
      await patientsService.updateProntuario(patientId, {
        height_cm: form.height_cm || undefined,
        weight_initial_kg: form.weight_initial_kg || undefined,
        blood_type: form.blood_type || undefined,
        parity: form.parity || undefined,
        acompanhante: form.acompanhante || undefined,
        hospital: form.hospital || undefined,
        number_of_fetuses: form.number_of_fetuses ? parseInt(form.number_of_fetuses) : undefined,
        cesarean_predicted: form.cesarean_predicted,
        risk_level: form.risk_level,
        lmp_date: form.lmp_date || undefined,
        edd: form.edd || undefined,
      });
      await loadData();
      setEditModal(false);
    } catch {}
    finally { setSaving(false); }
  };

  const infoRow = (label: string, value: string) => (
    <View key={label} style={s.infoRow}>
      <Text style={s.infoKey}>{label}</Text>
      <Text style={s.infoVal}>{value || '—'}</Text>
    </View>
  );

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      <View style={s.darkCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={s.darkAvatar}>
            <Text style={s.darkAvatarText}>
              {(patient?.name ?? '??').split(' ').slice(0, 2).map((n) => n[0]).join('')}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.darkName}>{patient?.name ?? '—'}</Text>
            <Text style={s.darkMeta}>{patient?.blood_type ?? ''}</Text>
          </View>
          {(() => {
            const week = calcWeek(prontuario?.edd ?? null, prontuario?.current_week ?? null);
            if (week == null) return null;
            const color = getTriColor(week);
            return (
              <View style={{ alignItems: 'center', marginLeft: 8 }}>
                <Text style={{ fontSize: 28, fontWeight: '800', color, lineHeight: 30 }}>{week}</Text>
                <Text style={{ fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>sem. · {getTriLabel(week)}</Text>
              </View>
            );
          })()}
        </View>
        <View style={s.chipRow}>
          {prontuario?.edd && (
            <View style={s.chip}>
              <Text style={s.chipText}>DPP: {formatDate(prontuario.edd)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Banner cadastro incompleto — sem e-mail real */}
      {patient?.email?.includes('@sem-email.lunna.app') && (
        <TouchableOpacity style={s.incompleteBanner} onPress={() => setEditModal(true)} activeOpacity={0.8}>
          <Text style={s.incompleteBannerIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.incompleteBannerTitle}>Cadastro incompleto</Text>
            <Text style={s.incompleteBannerSub}>Adicione e-mail para liberar acesso ao app</Text>
          </View>
          <Text style={s.incompleteBannerAction}>Completar →</Text>
        </TouchableOpacity>
      )}

      <View style={[s.infoCard, { marginBottom: 12 }]}>
        <View style={s.infoCardHeader}>
          <Text style={s.infoCardTitle}>Prontuário</Text>
          <TouchableOpacity onPress={() => setEditModal(true)}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Editar</Text>
          </TouchableOpacity>
        </View>
        {infoRow('Tipo sanguíneo', patient?.blood_type ?? '—')}
        {infoRow('DUM', prontuario?.lmp_date ? formatDate(prontuario.lmp_date) : '—')}
        {infoRow('DPP', prontuario?.edd ? formatDate(prontuario.edd) : '—')}
        {infoRow('Paridade', (patient as any)?.parity ?? '—')}
        {infoRow('Altura', prontuario?.height_cm ? `${prontuario.height_cm} cm` : '—')}
        {infoRow('Peso inicial', prontuario?.weight_initial_kg ? `${prontuario.weight_initial_kg} kg` : '—')}
        {infoRow('Hospital', (patient as any)?.hospital ?? '—')}
        {infoRow('Acompanhante', (patient as any)?.acompanhante ?? '—')}
        {infoRow('Risco', (patient as any)?.risk_level ?? '—')}
      </View>

      <View style={[s.infoCard, { marginBottom: 12 }]}>
        <View style={s.infoCardHeader}>
          <Text style={s.infoCardTitle}>Contato</Text>
        </View>
        {infoRow('E-mail', patient?.email ?? '—')}
        {infoRow('Telefone', patient?.phone ?? '—')}
      </View>

      <TouchableOpacity
        style={[s.infoCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }]}
        onPress={() => navigation.navigate('PatientCard', { patientId, patientName: patient?.name ?? 'Paciente' })}
        activeOpacity={0.8}
      >
        <View>
          <Text style={s.infoCardTitle}>📋 Cartão da Gestante</Text>
          <Text style={{ fontSize: 12, color: colors.textMid, marginTop: 2 }}>
            Ver e preencher o cartão completo
          </Text>
        </View>
        <Text style={{ fontSize: 18, color: colors.primary }}>→</Text>
      </TouchableOpacity>

      <View style={s.notasCard}>
        <Text style={s.notasTitle}>🔒 Notas da Médica — Conteúdo privado</Text>
        <TextInput
          style={s.notasInput}
          multiline
          value={notas}
          onChangeText={saveNotas}
          placeholder="Anotações clínicas privadas..."
          placeholderTextColor={colors.textInactive}
        />
      </View>

      <Sheet visible={editModal} onClose={() => setEditModal(false)} title="Editar Prontuário">
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="Altura (cm)" value={form.height_cm}
              onChange={(v) => setForm((f) => ({ ...f, height_cm: v }))} placeholder="165" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Peso inicial (kg)" value={form.weight_initial_kg}
              onChange={(v) => setForm((f) => ({ ...f, weight_initial_kg: v }))} placeholder="62.5" />
          </View>
        </Row>
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="Tipo sanguíneo" value={form.blood_type}
              onChange={(v) => setForm((f) => ({ ...f, blood_type: v }))} placeholder="O+" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Paridade (G/P/A)" value={form.parity}
              onChange={(v) => setForm((f) => ({ ...f, parity: v }))} placeholder="G1P0A0" />
          </View>
        </Row>
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="DUM (AAAA-MM-DD)" value={form.lmp_date}
              onChange={(v) => setForm((f) => ({ ...f, lmp_date: v }))} placeholder="2023-11-01" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="DPP (AAAA-MM-DD)" value={form.edd}
              onChange={(v) => setForm((f) => ({ ...f, edd: v }))} placeholder="2024-08-07" />
          </View>
        </Row>
        <Field label="Acompanhante" value={form.acompanhante}
          onChange={(v) => setForm((f) => ({ ...f, acompanhante: v }))} placeholder="Nome do acompanhante" />
        <Field label="Hospital/Maternidade" value={form.hospital}
          onChange={(v) => setForm((f) => ({ ...f, hospital: v }))} placeholder="Hospital Santa Joana" />
        <Text style={s.fieldLabel}>Risco Gestacional</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['low', 'medium', 'high'] as RiskLevel[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[s.chip2, form.risk_level === r && s.chip2Active]}
              onPress={() => setForm((f) => ({ ...f, risk_level: r }))}
            >
              <Text style={[s.chip2Text, form.risk_level === r && s.chip2TextActive]}>
                {r === 'low' ? 'Baixo' : r === 'medium' ? 'Médio' : 'Alto'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={salvarEdicao} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
        </TouchableOpacity>
      </Sheet>
    </ScrollView>
  );
}

// ── ANAMNESE TAB ──────────────────────────────────────────────────────────────

const DOENCAS: { key: keyof AnamneseCreate; label: string }[] = [
  { key: 'has_diabetes', label: 'Diabetes' },
  { key: 'has_hipertensao', label: 'Hipertensão' },
  { key: 'has_cardiopatia', label: 'Cardiopatia' },
  { key: 'has_epilepsia', label: 'Epilepsia' },
  { key: 'has_tireoide', label: 'Doença da tireoide' },
  { key: 'has_doenca_renal', label: 'Doença renal' },
  { key: 'has_autoimune', label: 'Doença autoimune' },
];

const FAMILIARES: { key: keyof AnamneseCreate; label: string }[] = [
  { key: 'familiar_diabetes', label: 'Diabetes' },
  { key: 'familiar_hipertensao', label: 'Hipertensão' },
  { key: 'familiar_gemelaridade', label: 'Gemelaridade' },
  { key: 'familiar_malformacoes', label: 'Malformações congênitas' },
];

function CheckRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}
      onPress={() => onChange(!value)}
      activeOpacity={0.7}
    >
      <View style={{
        width: 22, height: 22, borderRadius: 6, borderWidth: 2,
        borderColor: value ? colors.primary : colors.textInactive,
        backgroundColor: value ? colors.primary : 'transparent',
        marginRight: 12, alignItems: 'center', justifyContent: 'center',
      }}>
        {value && <Text style={{ color: colors.white, fontSize: 13, fontWeight: '700' }}>✓</Text>}
      </View>
      <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function AnaSection({ title }: { title: string }) {
  return <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 8 }}>{title}</Text>;
}

function AnamneseTab({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AnamneseCreate>({
    has_diabetes: false, has_hipertensao: false, has_cardiopatia: false,
    has_epilepsia: false, has_tireoide: false, has_doenca_renal: false,
    has_autoimune: false, outras_doencas: '',
    alergias_medicamentos: '', outras_alergias: '',
    familiar_diabetes: false, familiar_hipertensao: false,
    familiar_gemelaridade: false, familiar_malformacoes: false, outros_familiares: '',
    tabagismo: false, tabagismo_cigarros_dia: undefined,
    alcool: false, alcool_frequencia: undefined,
    drogas_ilicitas: false,
    atividade_fisica: false, atividade_fisica_descricao: '',
    pre_eclampsia_anterior: false,
    diabetes_gestacional_anterior: false,
    perda_fetal_anterior: false,
  });

  const setField = <K extends keyof AnamneseCreate>(key: K, value: AnamneseCreate[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    patientsService.getAnamnesis(patientId)
      .then((a) => setForm(a as AnamneseCreate))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  const salvar = async () => {
    setSaving(true);
    try { await patientsService.saveAnamnesis(patientId, form); }
    catch {}
    finally { setSaving(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      <AnaSection title="Doenças pré-existentes" />
      {DOENCAS.map((d) => (
        <CheckRow key={d.key} label={d.label} value={!!(form[d.key])} onChange={(v) => setField(d.key, v)} />
      ))}
      <Field label="Outras doenças" value={form.outras_doencas ?? ''}
        onChange={(v) => setField('outras_doencas', v)} multiline placeholder="Descreva outras condições..." />

      <AnaSection title="Alergias" />
      <Field label="Alergias a medicamentos" value={form.alergias_medicamentos ?? ''}
        onChange={(v) => setField('alergias_medicamentos', v)} placeholder="ex: Penicilina, AAS" />
      <Field label="Outras alergias" value={form.outras_alergias ?? ''}
        onChange={(v) => setField('outras_alergias', v)} placeholder="ex: Látex, frutos do mar" />

      <AnaSection title="Antecedentes familiares" />
      {FAMILIARES.map((d) => (
        <CheckRow key={d.key} label={d.label} value={!!(form[d.key])} onChange={(v) => setField(d.key, v)} />
      ))}
      <Field label="Outros antecedentes familiares" value={form.outros_familiares ?? ''}
        onChange={(v) => setField('outros_familiares', v)} multiline placeholder="Descreva..." />

      <AnaSection title="Hábitos de vida" />
      <CheckRow label="Tabagismo" value={!!form.tabagismo} onChange={(v) => setField('tabagismo', v)} />
      {form.tabagismo && (
        <Field label="Cigarros por dia" value={form.tabagismo_cigarros_dia ? String(form.tabagismo_cigarros_dia) : ''}
          onChange={(v) => setField('tabagismo_cigarros_dia', v ? parseInt(v) : undefined)} placeholder="ex: 10" />
      )}
      <CheckRow label="Consumo de álcool" value={!!form.alcool} onChange={(v) => setField('alcool', v)} />
      {form.alcool && (
        <>
          <Text style={s.fieldLabel}>Frequência</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {(['social', 'semanal', 'diario'] as AlcoolFrequencia[]).map((f) => (
              <TouchableOpacity key={f} style={[s.chip2, form.alcool_frequencia === f && s.chip2Active]}
                onPress={() => setField('alcool_frequencia', f)}>
                <Text style={[s.chip2Text, form.alcool_frequencia === f && s.chip2TextActive]}>
                  {f === 'social' ? 'Social' : f === 'semanal' ? 'Semanal' : 'Diário'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
      <CheckRow label="Uso de drogas ilícitas" value={!!form.drogas_ilicitas} onChange={(v) => setField('drogas_ilicitas', v)} />
      <CheckRow label="Atividade física" value={!!form.atividade_fisica} onChange={(v) => setField('atividade_fisica', v)} />
      {form.atividade_fisica && (
        <Field label="Tipo e frequência" value={form.atividade_fisica_descricao ?? ''}
          onChange={(v) => setField('atividade_fisica_descricao', v)} placeholder="ex: Caminhada 3x por semana" />
      )}

      <AnaSection title="Antecedentes obstétricos" />
      <CheckRow label="Pré-eclâmpsia em gestação anterior" value={!!form.pre_eclampsia_anterior}
        onChange={(v) => setField('pre_eclampsia_anterior', v)} />
      <CheckRow label="Diabetes gestacional anterior" value={!!form.diabetes_gestacional_anterior}
        onChange={(v) => setField('diabetes_gestacional_anterior', v)} />
      <CheckRow label="Perda fetal anterior (aborto/óbito)" value={!!form.perda_fetal_anterior}
        onChange={(v) => setField('perda_fetal_anterior', v)} />

      <TouchableOpacity style={[s.saveBtn, { marginTop: 24 }, saving && { opacity: 0.6 }]}
        onPress={salvar} disabled={saving}>
        <Text style={s.saveBtnText}>{saving ? 'Salvando...' : 'Salvar Anamnese'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── SINAIS VITAIS TAB ─────────────────────────────────────────────────────────

function SinaisTab({ patientId }: { patientId: string }) {
  const [pressao, setPressao] = useState<BloodPressureReading[]>([]);
  const [glicose, setGlicose] = useState<GlucoseReading[]>([]);
  const [pressModal, setPressModal] = useState(false);
  const [glicModal, setGlicModal] = useState(false);
  const [sis, setSis] = useState('');
  const [dia, setDia] = useState('');
  const [glicVal, setGlicVal] = useState('');
  const [glicMom, setGlicMom] = useState<GlucoseMoment>('fasting');

  useEffect(() => {
    vitalsService.listBloodPressureReadings(patientId, 5).then((r) => setPressao(r.data)).catch(() => {});
    vitalsService.listGlucoseReadings(patientId, 5).then((r) => setGlicose(r.data)).catch(() => {});
  }, [patientId]);

  const addPA = async () => {
    const sys = parseInt(sis), d = parseInt(dia);
    if (!sys || !d) return;
    try {
      const rec = await vitalsService.createBloodPressure(patientId, { systolic: sys, diastolic: d, moment: 'morning' });
      setPressao((prev) => [rec, ...prev]);
      setPressModal(false); setSis(''); setDia('');
    } catch {}
  };

  const addGlic = async () => {
    const v = parseInt(glicVal);
    if (!v) return;
    try {
      const rec = await vitalsService.createGlucose(patientId, { value_mg_dl: v, moment: glicMom });
      setGlicose((prev) => [rec, ...prev]);
      setGlicModal(false); setGlicVal('');
    } catch {}
  };

  const MOM_LABELS: Record<string, string> = {
    fasting: 'Jejum', after_meal: 'Pós-refeição', random: 'Aleatório',
    morning: 'Manhã', afternoon: 'Tarde', evening: 'Noite',
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      <Text style={s.svTitle}>🩺 Pressão Arterial</Text>
      {pressao.slice(0, 3).map((m) => {
        const { label, color } = classifyPA(m.systolic, m.diastolic);
        return (
          <View key={m.id} style={s.dataRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.dataVal}>{m.systolic}/{m.diastolic} <Text style={s.dataUnit}>mmHg</Text></Text>
              <Text style={s.dataSub}>{MOM_LABELS[m.moment] ?? m.moment}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: color + '22' }]}>
              <Text style={[s.badgeText, { color }]}>{label}</Text>
            </View>
          </View>
        );
      })}
      {pressao.length === 0 && <Text style={s.emptyText}>Nenhum registro de pressão.</Text>}
      <TouchableOpacity style={s.addRowBtn} onPress={() => setPressModal(true)}>
        <Text style={s.addRowBtnText}>+ Registrar Pressão</Text>
      </TouchableOpacity>

      <Text style={[s.svTitle, { marginTop: 24 }]}>🩸 Glicose</Text>
      {glicose.slice(0, 3).map((m) => {
        const { label, color } = classifyGlic(m.value_mg_dl, m.moment);
        return (
          <View key={m.id} style={s.dataRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.dataVal}>{m.value_mg_dl} <Text style={s.dataUnit}>mg/dL</Text></Text>
              <Text style={s.dataSub}>{MOM_LABELS[m.moment] ?? m.moment}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: color + '22' }]}>
              <Text style={[s.badgeText, { color }]}>{label}</Text>
            </View>
          </View>
        );
      })}
      {glicose.length === 0 && <Text style={s.emptyText}>Nenhum registro de glicose.</Text>}
      <TouchableOpacity style={s.addRowBtn} onPress={() => setGlicModal(true)}>
        <Text style={s.addRowBtnText}>+ Registrar Glicose</Text>
      </TouchableOpacity>

      <Sheet visible={pressModal} onClose={() => setPressModal(false)} title="Registrar Pressão">
        <Row>
          <View style={{ flex: 1 }}><Field label="Sistólica" value={sis} onChange={setSis} placeholder="120" /></View>
          <View style={{ flex: 1 }}><Field label="Diastólica" value={dia} onChange={setDia} placeholder="80" /></View>
        </Row>
        <TouchableOpacity style={s.saveBtn} onPress={addPA}><Text style={s.saveBtnText}>Salvar</Text></TouchableOpacity>
      </Sheet>

      <Sheet visible={glicModal} onClose={() => setGlicModal(false)} title="Registrar Glicose">
        <Field label="Glicose (mg/dL)" value={glicVal} onChange={setGlicVal} placeholder="ex: 95" />
        <Text style={s.fieldLabel}>Momento</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['fasting', 'after_meal', 'random'] as const).map((m) => (
              <TouchableOpacity key={m} style={[s.chip2, glicMom === m && s.chip2Active]} onPress={() => setGlicMom(m)}>
                <Text style={[s.chip2Text, glicMom === m && s.chip2TextActive]}>
                  {MOM_LABELS[m]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <TouchableOpacity style={s.saveBtn} onPress={addGlic}><Text style={s.saveBtnText}>Salvar</Text></TouchableOpacity>
      </Sheet>
    </ScrollView>
  );
}

// ── CONSULTAS TAB ─────────────────────────────────────────────────────────────

function ConsultasTab({ patientId }: { patientId: string }) {
  const [consultas, setConsultas] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [evoLoading, setEvoLoading] = useState(false);
  const [evoSaving, setEvoSaving] = useState(false);
  const [evoForm, setEvoForm] = useState<{
    weight_kg: string; fundal_height_cm: string; fetal_heart_rate: string;
    presentation: '' | 'cephalic' | 'breech' | 'transverse';
    fetal_movements: boolean; edema: EdemaGrade;
    bp_systolic: string; bp_diastolic: string; clinical_notes: string;
    queixas: string; observacoes_medicas: string;
    pfe_gramas: string; pfe_percentil: string; doppler: string;
    observacoes_exame_fisico: string; conduta: string;
  }>({
    weight_kg: '', fundal_height_cm: '', fetal_heart_rate: '',
    presentation: '', fetal_movements: true, edema: 'none',
    bp_systolic: '', bp_diastolic: '', clinical_notes: '',
    queixas: '', observacoes_medicas: '',
    pfe_gramas: '', pfe_percentil: '', doppler: '',
    observacoes_exame_fisico: '', conduta: '',
  });

  useEffect(() => {
    appointmentsService
      .listPatientAppointments(patientId, { limit: 20 })
      .then((r) => setConsultas(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  const openEvolution = async (appt: Appointment) => {
    setSelectedAppt(appt);
    setEvoLoading(true);
    try {
      const evo = await appointmentsService.getEvolution(appt.id);
      setEvoForm({
        weight_kg: evo.weight_kg ? String(evo.weight_kg) : '',
        fundal_height_cm: evo.fundal_height_cm ? String(evo.fundal_height_cm) : '',
        fetal_heart_rate: evo.fetal_heart_rate ? String(evo.fetal_heart_rate) : '',
        presentation: (evo.presentation as any) ?? '',
        fetal_movements: evo.fetal_movements ?? true,
        edema: (evo.edema as EdemaGrade) ?? 'none',
        bp_systolic: evo.bp_systolic ? String(evo.bp_systolic) : '',
        bp_diastolic: evo.bp_diastolic ? String(evo.bp_diastolic) : '',
        clinical_notes: evo.clinical_notes ?? '',
        queixas: evo.queixas ?? '',
        observacoes_medicas: evo.observacoes_medicas ?? '',
        pfe_gramas: evo.pfe_gramas ? String(evo.pfe_gramas) : '',
        pfe_percentil: evo.pfe_percentil ?? '',
        doppler: evo.doppler ?? '',
        observacoes_exame_fisico: evo.observacoes_exame_fisico ?? '',
        conduta: evo.conduta ?? '',
      });
    } catch {
      setEvoForm({
        weight_kg: '', fundal_height_cm: '', fetal_heart_rate: '',
        presentation: '', fetal_movements: true, edema: 'none',
        bp_systolic: '', bp_diastolic: '', clinical_notes: '',
        queixas: '', observacoes_medicas: '',
        pfe_gramas: '', pfe_percentil: '', doppler: '',
        observacoes_exame_fisico: '', conduta: '',
      });
    } finally { setEvoLoading(false); }
  };

  const salvarEvo = async () => {
    if (!selectedAppt) return;
    setEvoSaving(true);
    try {
      await appointmentsService.saveEvolution(selectedAppt.id, {
        weight_kg: evoForm.weight_kg ? parseFloat(evoForm.weight_kg) : undefined,
        fundal_height_cm: evoForm.fundal_height_cm ? parseFloat(evoForm.fundal_height_cm) : undefined,
        fetal_heart_rate: evoForm.fetal_heart_rate ? parseInt(evoForm.fetal_heart_rate) : undefined,
        presentation: evoForm.presentation || undefined,
        fetal_movements: evoForm.fetal_movements,
        edema: evoForm.edema,
        bp_systolic: evoForm.bp_systolic ? parseInt(evoForm.bp_systolic) : undefined,
        bp_diastolic: evoForm.bp_diastolic ? parseInt(evoForm.bp_diastolic) : undefined,
        clinical_notes: evoForm.clinical_notes || undefined,
        queixas: evoForm.queixas || undefined,
        observacoes_medicas: evoForm.observacoes_medicas || undefined,
        pfe_gramas: evoForm.pfe_gramas ? parseInt(evoForm.pfe_gramas) : undefined,
        pfe_percentil: evoForm.pfe_percentil || undefined,
        doppler: evoForm.doppler || undefined,
        observacoes_exame_fisico: evoForm.observacoes_exame_fisico || undefined,
        conduta: evoForm.conduta || undefined,
      });
      setSelectedAppt(null);
    } catch {}
    finally { setEvoSaving(false); }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      <Text style={[s.addRowLabel, { marginBottom: 12 }]}>{consultas.length} consulta{consultas.length !== 1 ? 's' : ''}</Text>
      {consultas.length === 0 && <Text style={s.emptyText}>Nenhuma consulta registrada.</Text>}
      {consultas.map((c) => (
        <TouchableOpacity key={c.id} onPress={() => openEvolution(c)} activeOpacity={0.85}>
          <ExpandCard header={
            <>
              <Text style={s.expandDate}>{formatDate(c.date)}</Text>
              <Text style={s.expandMeta}>{c.type} · {c.time?.slice(0, 5) ?? '—'}</Text>
            </>
          }>
            <View style={s.expandGrid}>
              {[['Tipo', c.type], ['Status', c.status], ['Local', c.location ?? '—']].map(([k, v]) => (
                <View key={k} style={s.expandField}>
                  <Text style={s.expandKey}>{k}</Text>
                  <Text style={s.expandVal}>{v}</Text>
                </View>
              ))}
            </View>
            {c.notes ? <Text style={s.expandObs}>{c.notes}</Text> : null}
            <Text style={{ fontSize: 11, color: colors.primary, marginTop: 8, fontWeight: '600' }}>
              Toque para registrar evolução →
            </Text>
          </ExpandCard>
        </TouchableOpacity>
      ))}

      <Sheet
        visible={!!selectedAppt}
        onClose={() => setSelectedAppt(null)}
        title={`Evolução — ${selectedAppt?.date ? formatDate(selectedAppt.date) : ''}`}
      >
        {evoLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : (
          <>
            <Row>
              <View style={{ flex: 1 }}>
                <Field label="Peso (kg)" value={evoForm.weight_kg}
                  onChange={(v) => setEvoForm((f) => ({ ...f, weight_kg: v }))} placeholder="63.5" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="AU (cm)" value={evoForm.fundal_height_cm}
                  onChange={(v) => setEvoForm((f) => ({ ...f, fundal_height_cm: v }))} placeholder="28.0" />
              </View>
            </Row>
            <Row>
              <View style={{ flex: 1 }}>
                <Field label="BCF (bpm)" value={evoForm.fetal_heart_rate}
                  onChange={(v) => setEvoForm((f) => ({ ...f, fetal_heart_rate: v }))} placeholder="148" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="PA sistólica" value={evoForm.bp_systolic}
                  onChange={(v) => setEvoForm((f) => ({ ...f, bp_systolic: v }))} placeholder="110" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="PA diastólica" value={evoForm.bp_diastolic}
                  onChange={(v) => setEvoForm((f) => ({ ...f, bp_diastolic: v }))} placeholder="70" />
              </View>
            </Row>
            <Text style={s.fieldLabel}>Apresentação fetal</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {([['', 'N/A'], ['cephalic', 'Cefálica'], ['breech', 'Pélvica'], ['transverse', 'Transversa']] as const).map(([val, label]) => (
                <TouchableOpacity key={val}
                  style={[s.chip2, evoForm.presentation === val && s.chip2Active]}
                  onPress={() => setEvoForm((f) => ({ ...f, presentation: val }))}
                >
                  <Text style={[s.chip2Text, evoForm.presentation === val && s.chip2TextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.fieldLabel}>Edema</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(['none', '+', '++', '+++'] as EdemaGrade[]).map((g) => (
                <TouchableOpacity key={g}
                  style={[s.chip2, evoForm.edema === g && s.chip2Active]}
                  onPress={() => setEvoForm((f) => ({ ...f, edema: g }))}
                >
                  <Text style={[s.chip2Text, evoForm.edema === g && s.chip2TextActive]}>{g === 'none' ? 'Sem' : g}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.fieldLabel}>Movimentos fetais</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {([true, false] as const).map((v) => (
                <TouchableOpacity key={String(v)}
                  style={[s.chip2, evoForm.fetal_movements === v && s.chip2Active]}
                  onPress={() => setEvoForm((f) => ({ ...f, fetal_movements: v }))}
                >
                  <Text style={[s.chip2Text, evoForm.fetal_movements === v && s.chip2TextActive]}>
                    {v ? 'Presentes' : 'Ausentes'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Field label="Queixas" value={evoForm.queixas}
              onChange={(v) => setEvoForm((f) => ({ ...f, queixas: v }))}
              multiline placeholder="Descreva as queixas da paciente..." />
            <Row>
              <View style={{ flex: 1 }}>
                <Field label="PFE (gramas)" value={evoForm.pfe_gramas}
                  onChange={(v) => setEvoForm((f) => ({ ...f, pfe_gramas: v }))} placeholder="ex: 800" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="PFE percentil" value={evoForm.pfe_percentil}
                  onChange={(v) => setEvoForm((f) => ({ ...f, pfe_percentil: v }))} placeholder="ex: p30" />
              </View>
            </Row>
            <Text style={s.fieldLabel}>Doppler</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(['normal', 'alterado', 'não realizado'] as const).map((v) => (
                <TouchableOpacity key={v}
                  style={[s.chip2, evoForm.doppler === v && s.chip2Active]}
                  onPress={() => setEvoForm((f) => ({ ...f, doppler: v }))}
                >
                  <Text style={[s.chip2Text, evoForm.doppler === v && s.chip2TextActive]}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Field label="Obs. do Exame Físico" value={evoForm.observacoes_exame_fisico}
              onChange={(v) => setEvoForm((f) => ({ ...f, observacoes_exame_fisico: v }))}
              multiline placeholder="USG, achados do exame..." />
            <Field label="Observações Médicas (Confidencial)" value={evoForm.observacoes_medicas}
              onChange={(v) => setEvoForm((f) => ({ ...f, observacoes_medicas: v }))}
              multiline placeholder="Visível apenas para a equipe médica..." />
            <Field label="Conduta" value={evoForm.conduta}
              onChange={(v) => setEvoForm((f) => ({ ...f, conduta: v }))}
              multiline placeholder="Prescrições, orientações, retorno..." />
            <Field label="Notas clínicas" value={evoForm.clinical_notes}
              onChange={(v) => setEvoForm((f) => ({ ...f, clinical_notes: v }))}
              multiline placeholder="Observações adicionais..." />
            <TouchableOpacity style={[s.saveBtn, evoSaving && { opacity: 0.6 }]} onPress={salvarEvo} disabled={evoSaving}>
              <Text style={s.saveBtnText}>{evoSaving ? 'Salvando...' : 'Salvar Evolução'}</Text>
            </TouchableOpacity>
          </>
        )}
      </Sheet>
    </ScrollView>
  );
}

// ── USG TAB ───────────────────────────────────────────────────────────────────

function USGTab({ patientId }: { patientId: string }) {
  const [list, setList] = useState<Ultrasound[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [tipo, setTipo] = useState('obstetric');
  const [data, setData] = useState('');
  const [ig, setIg] = useState('');
  const [apres, setApres] = useState('');
  const [la, setLa] = useState('');
  const [bcf, setBcf] = useState('');

  useEffect(() => {
    examsService.listUltrasounds(patientId, { limit: 20 })
      .then((r) => setList(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  const salvar = async () => {
    if (!data || !ig) return;
    try {
      const novo = await examsService.createUltrasound(patientId, {
        type: tipo as 'obstetric' | 'morphology' | 'detailed',
        date: data,
        ig_weeks: parseInt(ig) || 0,
        presentation: apres as any || undefined,
        fetal_heart_rate: bcf ? parseInt(bcf) : undefined,
      });
      setList((prev) => [novo, ...prev]);
      setModal(false); setTipo('obstetric'); setData(''); setIg(''); setApres(''); setLa(''); setBcf('');
    } catch {}
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      <View style={s.addRow}>
        <Text style={s.addRowLabel}>{list.length} exame{list.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
          <Text style={s.addBtnText}>+ Novo USG</Text>
        </TouchableOpacity>
      </View>
      {list.length === 0 && <Text style={s.emptyText}>Nenhum exame de USG registrado.</Text>}
      {list.map((u) => (
        <ExpandCard key={u.id} header={
          <>
            <Text style={s.expandDate}>{formatDate(u.date)}</Text>
            <Text style={s.expandMeta}>{u.type} · IG {u.ig_weeks}sem</Text>
          </>
        }>
          <View style={s.expandGrid}>
            {[
              ['Apresentação', u.presentation ?? '—'],
              ['BCF', u.fetal_heart_rate ? `${u.fetal_heart_rate} bpm` : '—'],
              ['LA (ml)', u.amniotic_fluid_ml ? String(u.amniotic_fluid_ml) : '—'],
              ['Placenta', u.placenta_location ?? '—'],
            ].map(([k, v]) => (
              <View key={k} style={s.expandField}>
                <Text style={s.expandKey}>{k}</Text>
                <Text style={s.expandVal}>{v}</Text>
              </View>
            ))}
          </View>
          {u.notes ? <Text style={s.expandObs}>{u.notes}</Text> : null}
        </ExpandCard>
      ))}
      <Sheet visible={modal} onClose={() => setModal(false)} title="Novo USG">
        <Row>
          <View style={{ flex: 1 }}><Field label="Data (AAAA-MM-DD)" value={data} onChange={setData} placeholder="ex: 2025-04-15" /></View>
          <View style={{ flex: 1 }}><Field label="IG (semanas)" value={ig} onChange={setIg} placeholder="ex: 26" /></View>
        </Row>
        <Row>
          <View style={{ flex: 1 }}><Field label="Apresentação" value={apres} onChange={setApres} placeholder="ex: cephalic" /></View>
          <View style={{ flex: 1 }}><Field label="BCF (bpm)" value={bcf} onChange={setBcf} placeholder="ex: 150" /></View>
        </Row>
        <TouchableOpacity style={s.saveBtn} onPress={salvar}><Text style={s.saveBtnText}>Salvar</Text></TouchableOpacity>
      </Sheet>
    </ScrollView>
  );
}

// ── EXAMES TAB ────────────────────────────────────────────────────────────────

function ExamesTab({ patientId }: { patientId: string }) {
  const [list, setList] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [solicitarModal, setSolicitarModal] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<Record<string, boolean>>({});
  const [presetTrimestre, setPresetTrimestre] = useState<1 | 2 | 3>(1);
  const [solicitando, setSolicitando] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [data, setData] = useState('');
  const [resultado, setResultado] = useState('');

  useEffect(() => {
    examsService.listLabTests(patientId, { limit: 20 })
      .then((r) => setList(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  const solicitarLote = async () => {
    const presets = presetTrimestre === 1
      ? EXAMES_PRIMEIRO_TRIMESTRE
      : presetTrimestre === 2
      ? EXAMES_SEGUNDO_TRIMESTRE
      : EXAMES_TERCEIRO_TRIMESTRE;
    const selecionados = presets.filter((p) => selectedPresets[p.name]);
    if (selecionados.length === 0) return;
    setSolicitando(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await Promise.all(
        selecionados.map((p) =>
          examsService.createLabTest(patientId, { name: p.name, type: p.type, date: today, status: 'pending' })
        )
      );
      const r = await examsService.listLabTests(patientId, { limit: 20 });
      setList(r.data);
      setSolicitarModal(false);
      setSelectedPresets({});
    } catch {}
    finally { setSolicitando(false); }
  };

  const salvar = async () => {
    if (!nome || !data) return;
    try {
      const novo = await examsService.createLabTest(patientId, {
        name: nome, type: tipo || 'general', date: data,
        result: resultado || undefined, status: 'pending',
      });
      setList((prev) => [novo, ...prev]);
      setModal(false); setNome(''); setTipo(''); setData(''); setResultado('');
    } catch {}
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const STATUS_COLORS: Record<string, string> = {
    completed: '#3CB371', pending: colors.textInactive, abnormal: colors.accent,
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      <View style={s.addRow}>
        <Text style={s.addRowLabel}>{list.length} exame{list.length !== 1 ? 's' : ''}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primaryLight }]}
            onPress={() => setSolicitarModal(true)}>
            <Text style={[s.addBtnText, { color: colors.primaryDk }]}>Solicitar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
            <Text style={s.addBtnText}>+ Manual</Text>
          </TouchableOpacity>
        </View>
      </View>
      {list.length === 0 && <Text style={s.emptyText}>Nenhum exame laboratorial registrado.</Text>}
      {list.map((e) => (
        <ExpandCard key={e.id} header={
          <>
            <Text style={s.expandDate}>{formatDate(e.date)}</Text>
            <Text style={s.expandMeta}>{e.name}</Text>
          </>
        }>
          <View style={s.expandGrid}>
            {[
              ['Tipo', e.type],
              ['Resultado', e.result ?? '—'],
              ['Referência', e.reference_range ?? '—'],
              ['Status', e.status],
            ].map(([k, v]) => (
              <View key={k} style={s.expandField}>
                <Text style={s.expandKey}>{k}</Text>
                <Text style={[s.expandVal, k === 'Status' && { color: STATUS_COLORS[v] ?? colors.text }]}>{v}</Text>
              </View>
            ))}
          </View>
          {e.notes ? <Text style={s.expandObs}>{e.notes}</Text> : null}
        </ExpandCard>
      ))}
      <Sheet visible={modal} onClose={() => setModal(false)} title="Nova Coleta">
        <Field label="Nome do exame" value={nome} onChange={setNome} placeholder="ex: Hemograma" />
        <Row>
          <View style={{ flex: 1 }}><Field label="Tipo" value={tipo} onChange={setTipo} placeholder="ex: blood" /></View>
          <View style={{ flex: 1 }}><Field label="Data (AAAA-MM-DD)" value={data} onChange={setData} placeholder="ex: 2025-04-15" /></View>
        </Row>
        <Field label="Resultado" value={resultado} onChange={setResultado} multiline />
        <TouchableOpacity style={s.saveBtn} onPress={salvar}><Text style={s.saveBtnText}>Salvar</Text></TouchableOpacity>
      </Sheet>

      <Sheet visible={solicitarModal} onClose={() => setSolicitarModal(false)} title="Solicitar Exames">
        <Text style={s.fieldLabel}>Trimestre</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {([1, 2, 3] as const).map((t) => (
            <TouchableOpacity key={t}
              style={[s.chip2, presetTrimestre === t && s.chip2Active]}
              onPress={() => { setPresetTrimestre(t); setSelectedPresets({}); }}>
              <Text style={[s.chip2Text, presetTrimestre === t && s.chip2TextActive]}>{t}º Tri</Text>
            </TouchableOpacity>
          ))}
        </View>
        {(presetTrimestre === 1
          ? EXAMES_PRIMEIRO_TRIMESTRE
          : presetTrimestre === 2
          ? EXAMES_SEGUNDO_TRIMESTRE
          : EXAMES_TERCEIRO_TRIMESTRE
        ).map((p) => (
          <TouchableOpacity key={p.name}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}
            onPress={() => setSelectedPresets((prev) => ({ ...prev, [p.name]: !prev[p.name] }))}
            activeOpacity={0.7}
          >
            <View style={{
              width: 22, height: 22, borderRadius: 6, borderWidth: 2,
              borderColor: selectedPresets[p.name] ? colors.primary : colors.textInactive,
              backgroundColor: selectedPresets[p.name] ? colors.primary : 'transparent',
              marginRight: 12, alignItems: 'center', justifyContent: 'center',
            }}>
              {selectedPresets[p.name] && <Text style={{ color: colors.white, fontSize: 13, fontWeight: '700' }}>✓</Text>}
            </View>
            <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>{p.name}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[s.saveBtn, { marginTop: 16 }, solicitando && { opacity: 0.6 }]}
          onPress={solicitarLote} disabled={solicitando}
        >
          <Text style={s.saveBtnText}>
            {solicitando ? 'Solicitando...' : `Solicitar ${Object.values(selectedPresets).filter(Boolean).length} exame(s)`}
          </Text>
        </TouchableOpacity>
      </Sheet>
    </ScrollView>
  );
}

// ── VACINAS TAB ───────────────────────────────────────────────────────────────

function VacinasTab({ patientId }: { patientId: string }) {
  const [list, setList] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [nome, setNome] = useState('');
  const [data, setData] = useState('');
  const [dose, setDose] = useState('1');
  const [statusVal, setStatusVal] = useState<VaccineStatus>('scheduled');

  useEffect(() => {
    examsService.listVaccines(patientId, { limit: 20 })
      .then((r) => setList(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  const salvar = async () => {
    if (!nome || !data) return;
    try {
      const nova = await examsService.createVaccine(patientId, {
        vaccine_type: nome, date: data,
        dose_number: parseInt(dose) || 1, status: statusVal,
      });
      setList((prev) => [...prev, nova]);
      setModal(false); setNome(''); setData(''); setDose('1'); setStatusVal('scheduled');
    } catch {}
  };

  const updateStatus = async (v: Vaccine, status: VaccineStatus) => {
    try {
      const updated = await examsService.updateVaccine(patientId, v.id, { status });
      setList((prev) => prev.map((x) => x.id === v.id ? updated : x));
    } catch {}
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      <View style={s.addRow}>
        <Text style={s.addRowLabel}>{list.length} vacina{list.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
          <Text style={s.addBtnText}>+ Registrar Vacina</Text>
        </TouchableOpacity>
      </View>
      {list.length === 0 && <Text style={s.emptyText}>Nenhuma vacina registrada.</Text>}
      <View style={s.vacinasCard}>
        {list.map((v, i) => {
          const { bg, color, label } = VACCINE_STATUS_LABELS[v.status] ?? VACCINE_STATUS_LABELS.missed;
          return (
            <View key={v.id} style={[s.vacinaRow, i < list.length - 1 && s.vacinaRowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={s.vacinaNome}>{v.vaccine_type}</Text>
                <Text style={s.vacinaInfo}>Dose {v.dose_number} · {formatDate(v.date)}</Text>
              </View>
              <TouchableOpacity
                style={[s.badge, { backgroundColor: bg }]}
                onPress={() => {
                  const next: VaccineStatus = v.status === 'scheduled' ? 'completed'
                    : v.status === 'completed' ? 'missed' : 'scheduled';
                  updateStatus(v, next);
                }}
              >
                <Text style={[s.badgeText, { color }]}>{label}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
      <Sheet visible={modal} onClose={() => setModal(false)} title="Registrar Vacina">
        <Field label="Vacina" value={nome} onChange={setNome} placeholder="ex: dTpa" />
        <Row>
          <View style={{ flex: 1 }}><Field label="Data (AAAA-MM-DD)" value={data} onChange={setData} placeholder="ex: 2025-04-10" /></View>
          <View style={{ flex: 1 }}><Field label="Dose nº" value={dose} onChange={setDose} placeholder="1" /></View>
        </Row>
        <Text style={s.fieldLabel}>Status</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['scheduled', 'completed', 'missed'] as VaccineStatus[]).map((opt) => (
            <TouchableOpacity key={opt} style={[s.chip2, statusVal === opt && s.chip2Active]} onPress={() => setStatusVal(opt)}>
              <Text style={[s.chip2Text, statusVal === opt && s.chip2TextActive]}>
                {VACCINE_STATUS_LABELS[opt].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.saveBtn} onPress={salvar}><Text style={s.saveBtnText}>Salvar</Text></TouchableOpacity>
      </Sheet>
    </ScrollView>
  );
}

// ── MEDICAMENTOS TAB ──────────────────────────────────────────────────────────

function MedicamentosTab({ patientId }: { patientId: string }) {
  const [list, setList] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MedicationCreate>({
    name: '', dosage: '', frequency: '',
    start_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    medicationsService.list(patientId, { limit: 20 })
      .then((r) => setList(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  const salvar = async () => {
    if (!form.name || !form.dosage || !form.frequency || !form.start_date) return;
    setSaving(true);
    try {
      const novo = await medicationsService.create(patientId, form);
      setList((prev) => [novo, ...prev]);
      setModal(false);
      setForm({ name: '', dosage: '', frequency: '', start_date: new Date().toISOString().split('T')[0] });
    } catch {}
    finally { setSaving(false); }
  };

  const toggleAtivo = async (med: Medication) => {
    try {
      const updated = await medicationsService.update(med.id, { active: !med.active });
      setList((prev) => prev.map((m) => m.id === med.id ? updated : m));
    } catch {}
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      <View style={s.addRow}>
        <Text style={s.addRowLabel}>{list.length} medicamento{list.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
          <Text style={s.addBtnText}>+ Prescrever</Text>
        </TouchableOpacity>
      </View>
      {list.length === 0 && <Text style={s.emptyText}>Nenhum medicamento prescrito.</Text>}
      {list.map((m) => (
        <View key={m.id} style={[s.dataRow, { opacity: m.active ? 1 : 0.5 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.dataVal}>{m.name}</Text>
            <Text style={s.dataSub}>{m.dosage} · {m.frequency}</Text>
            {m.instructions ? <Text style={s.dataSub}>{m.instructions}</Text> : null}
            <Text style={s.dataSub}>
              Início: {formatDate(m.start_date)}{m.end_date ? ` · Fim: ${formatDate(m.end_date)}` : ' · Uso contínuo'}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.badge, { backgroundColor: m.active ? 'rgba(141,170,145,0.15)' : 'rgba(0,0,0,0.06)' }]}
            onPress={() => toggleAtivo(m)}
          >
            <Text style={[s.badgeText, { color: m.active ? colors.primaryDk : colors.textInactive }]}>
              {m.active ? 'Ativo' : 'Inativo'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
      <Sheet visible={modal} onClose={() => setModal(false)} title="Prescrever Medicamento">
        <Field label="Medicamento" value={form.name}
          onChange={(v) => setForm((f: MedicationCreate) => ({ ...f, name: v }))} placeholder="ex: Ácido fólico 5mg" />
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="Dosagem" value={form.dosage}
              onChange={(v) => setForm((f: MedicationCreate) => ({ ...f, dosage: v }))} placeholder="ex: 5mg" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Frequência" value={form.frequency}
              onChange={(v) => setForm((f: MedicationCreate) => ({ ...f, frequency: v }))} placeholder="ex: 1x ao dia" />
          </View>
        </Row>
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="Início (AAAA-MM-DD)" value={form.start_date}
              onChange={(v) => setForm((f: MedicationCreate) => ({ ...f, start_date: v }))} placeholder="2026-05-29" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Fim (vazio = contínuo)" value={form.end_date ?? ''}
              onChange={(v) => setForm((f: MedicationCreate) => ({ ...f, end_date: v || undefined }))} placeholder="opcional" />
          </View>
        </Row>
        <Field label="Instruções" value={form.instructions ?? ''}
          onChange={(v) => setForm((f: MedicationCreate) => ({ ...f, instructions: v }))}
          multiline placeholder="ex: Tomar em jejum, longe do ferro" />
        <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={salvar} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? 'Salvando...' : 'Prescrever'}</Text>
        </TouchableOpacity>
      </Sheet>
    </ScrollView>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────

export function PacienteDetalheScreen() {
  const route = useRoute<RouteType>();
  const { patientId } = route.params;
  const [tab, setTab] = useState<Tab>('geral');
  const [patientName, setPatientName] = useState('Paciente');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    patientsService.getPatient(patientId)
      .then((p) => setPatientName(p.name))
      .catch(() => {});
  }, [patientId]);

  const renderTab = () => {
    switch (tab) {
      case 'geral':     return <GeralTab patientId={patientId} />;
      case 'anamnese':  return <AnamneseTab patientId={patientId} />;
      case 'sinais':    return <SinaisTab patientId={patientId} />;
      case 'consultas': return <ConsultasTab patientId={patientId} />;
      case 'usg':       return <USGTab patientId={patientId} />;
      case 'exames':    return <ExamesTab patientId={patientId} />;
      case 'vacinas':   return <VacinasTab patientId={patientId} />;
      case 'meds':      return <MedicamentosTab patientId={patientId} />;
    }
  };

  return (
    <View style={[s.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title={patientName} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabBar}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 4, alignItems: 'center' }}
      >
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tabBtn, tab === t.key && s.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={{ flex: 1 }}>{renderTab()}</View>
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 13, color: colors.textMid, textAlign: 'center', marginBottom: 16 },

  tabBar: { maxHeight: 52, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.07)' },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.full },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textInactive },
  tabTextActive: { color: colors.white },

  incompleteBanner: {
    backgroundColor: 'rgba(245,166,35,0.12)', borderRadius: radius.md, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
    borderLeftWidth: 3, borderLeftColor: '#d4a017',
  },
  incompleteBannerIcon: { fontSize: 18 },
  incompleteBannerTitle: { fontSize: 13, fontWeight: '800', color: '#7a5c00' },
  incompleteBannerSub: { fontSize: 11, color: '#a07800', marginTop: 2 },
  incompleteBannerAction: { fontSize: 12, fontWeight: '700', color: '#d4a017' },
  darkCard: { backgroundColor: colors.darkCard, borderRadius: radius.lg, padding: 18, marginBottom: 12 },
  darkAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  darkAvatarText: { fontSize: 17, fontWeight: '800', color: colors.white },
  darkName: { fontSize: 16, fontWeight: '800', color: colors.white },
  darkMeta: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.1)' },
  chipAccent: { backgroundColor: 'rgba(229,152,125,0.25)' },
  chipText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  chipTextAccent: { color: '#f4b9a5' },

  infoCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  infoCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: colors.bg },
  infoCardTitle: { fontSize: 11, fontWeight: '800', color: colors.primaryDk, textTransform: 'uppercase', letterSpacing: 1 },
  editBtn: { backgroundColor: 'rgba(141,170,145,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  editBtnText: { fontSize: 12, fontWeight: '600', color: colors.primaryDk },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)', gap: 12 },
  infoKey: { fontSize: 12, color: colors.textInactive, fontWeight: '600', flexShrink: 0 },
  infoVal: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'right', flex: 1 },

  notasCard: { backgroundColor: '#FFFDF0', borderRadius: radius.md, padding: 16, borderLeftWidth: 3, borderLeftColor: colors.accent },
  notasTitle: { fontSize: 12, fontWeight: '600', color: colors.textMid, marginBottom: 10 },
  notasInput: { fontSize: 14, color: colors.text, minHeight: 100 },

  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: '85%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.textInactive, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 16 },

  fieldLabel: { fontSize: 11, fontWeight: '600', color: colors.textInactive, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  fieldInput: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 12, fontSize: 14, color: colors.text, marginBottom: 12 },

  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.full, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },

  addRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addRowLabel: { fontSize: 13, fontWeight: '700', color: colors.textMid },
  addBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },

  expandCard: { backgroundColor: colors.white, borderRadius: radius.md, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  expandHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  expandBody: { padding: 14, borderTopWidth: 1, borderTopColor: colors.bg },
  expandDate: { fontSize: 14, fontWeight: '700', color: colors.text },
  expandMeta: { fontSize: 12, color: colors.textMid, marginTop: 2 },
  expandGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  expandField: { minWidth: '44%' },
  expandKey: { fontSize: 10, fontWeight: '700', color: colors.textInactive, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  expandVal: { fontSize: 13, fontWeight: '700', color: colors.text },
  expandObs: { fontSize: 13, color: colors.textMid, lineHeight: 18, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.bg },

  svTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  dataRow: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  dataVal: { fontSize: 16, fontWeight: '800', color: colors.text },
  dataUnit: { fontSize: 11, fontWeight: '500', color: colors.textMid },
  dataSub: { fontSize: 12, color: colors.textMid, marginTop: 2 },
  addRowBtn: { borderWidth: 1.5, borderColor: colors.accent, borderStyle: 'dashed', borderRadius: radius.md, padding: 12, alignItems: 'center', marginTop: 4 },
  addRowBtnText: { fontSize: 13, fontWeight: '700', color: colors.accent },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },

  chip2: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.bg },
  chip2Active: { backgroundColor: colors.primary },
  chip2Text: { fontSize: 13, fontWeight: '600', color: colors.textMid },
  chip2TextActive: { color: colors.white },

  vacinasCard: { backgroundColor: colors.white, borderRadius: radius.md, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  vacinaRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  vacinaRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.bg },
  vacinaNome: { fontSize: 13, fontWeight: '700', color: colors.text },
  vacinaInfo: { fontSize: 11.5, color: colors.textMid, marginTop: 2 },
});
