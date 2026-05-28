import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, TouchableWithoutFeedback, ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
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
} from '../../types';

type RouteType = RouteProp<DoctorStackParams, 'PacienteDetalhe'>;
type Tab = 'geral' | 'sinais' | 'consultas' | 'usg' | 'exames' | 'vacinas';

const TABS: { key: Tab; label: string }[] = [
  { key: 'geral', label: 'Geral' },
  { key: 'sinais', label: 'Sinais Vitais' },
  { key: 'consultas', label: 'Consultas' },
  { key: 'usg', label: 'USG' },
  { key: 'exames', label: 'Exames' },
  { key: 'vacinas', label: 'Vacinas' },
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
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [prontuario, setProntuario] = useState<PatientProntuario | null>(null);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      patientsService.getPatient(patientId),
      patientsService.getProntuario(patientId),
      storage.get<string>(STORAGE_KEYS.notasMedica),
    ])
      .then(([pt, pr, nota]) => {
        setPatient(pt);
        setProntuario(pr);
        if (nota) setNotas(nota);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  const saveNotas = async (text: string) => {
    setNotas(text);
    await storage.set(STORAGE_KEYS.notasMedica, text);
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
          <View>
            <Text style={s.darkName}>{patient?.name ?? '—'}</Text>
            <Text style={s.darkMeta}>
              {[patient?.blood_type, prontuario?.current_week ? `Sem. ${prontuario.current_week}` : null]
                .filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
        <View style={s.chipRow}>
          {prontuario?.current_week && (
            <View style={s.chip}><Text style={s.chipText}>Sem. {prontuario.current_week}/42</Text></View>
          )}
          {prontuario?.edd && (
            <View style={s.chip}>
              <Text style={s.chipText}>DPP: {formatDate(prontuario.edd)}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[s.infoCard, { marginBottom: 12 }]}>
        <View style={s.infoCardHeader}>
          <Text style={s.infoCardTitle}>Prontuário</Text>
          {patient?.prontuario && <Text style={s.infoKey}>{patient.prontuario}</Text>}
        </View>
        {infoRow('Tipo sanguíneo', patient?.blood_type ?? '—')}
        {infoRow('DUM', prontuario?.lmp_date ? formatDate(prontuario.lmp_date) : '—')}
        {infoRow('DPP', prontuario?.edd ? formatDate(prontuario.edd) : '—')}
        {infoRow('Altura', prontuario?.height_cm ? `${prontuario.height_cm} cm` : '—')}
        {infoRow('Peso inicial', prontuario?.weight_initial_kg ? `${prontuario.weight_initial_kg} kg` : '—')}
      </View>

      <View style={[s.infoCard, { marginBottom: 12 }]}>
        <View style={s.infoCardHeader}>
          <Text style={s.infoCardTitle}>Contato</Text>
        </View>
        {infoRow('E-mail', patient?.email ?? '—')}
        {infoRow('Telefone', patient?.phone ?? '—')}
      </View>

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

  useEffect(() => {
    appointmentsService
      .listPatientAppointments(patientId, { limit: 20 })
      .then((r) => setConsultas(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      <Text style={[s.addRowLabel, { marginBottom: 12 }]}>{consultas.length} consulta{consultas.length !== 1 ? 's' : ''}</Text>
      {consultas.length === 0 && <Text style={s.emptyText}>Nenhuma consulta registrada.</Text>}
      {consultas.map((c) => (
        <ExpandCard key={c.id} header={
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
        </ExpandCard>
      ))}
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
        <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
          <Text style={s.addBtnText}>+ Nova Coleta</Text>
        </TouchableOpacity>
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
      case 'geral': return <GeralTab patientId={patientId} />;
      case 'sinais': return <SinaisTab patientId={patientId} />;
      case 'consultas': return <ConsultasTab patientId={patientId} />;
      case 'usg': return <USGTab patientId={patientId} />;
      case 'exames': return <ExamesTab patientId={patientId} />;
      case 'vacinas': return <VacinasTab patientId={patientId} />;
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
