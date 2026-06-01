import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Modal,
  ScrollView, Switch, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { patientsService } from '../../services/patients';
import { examsService } from '../../services/exams';
import { colors, spacing, radius } from '../../theme';

// ── Types ─────────────────────────────────────────────────────────────────────

type VaccineStatus = 'pending' | 'immunized';

interface PopupProps {
  patientId: string;
  onNext: () => void;
  onSkip: () => void;
  onCancel: () => void;
}

// ── Shared UI ──────────────────────────────────────────────────────────────────

function PopupShell({
  title, step, children, onNext, onSkip, onCancel, loading,
}: {
  title: string; step: number; children: React.ReactNode;
  onNext: () => void; onSkip: () => void; onCancel: () => void; loading?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[shell.sheet, { paddingBottom: insets.bottom + 16 }]}>
      <View style={shell.handle} />
      <View style={shell.header}>
        <View style={shell.stepRow}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={[shell.dot, i === step - 1 && shell.dotActive]} />
          ))}
        </View>
        <Text style={shell.step}>{step} de 6</Text>
      </View>
      <Text style={shell.title}>{title}</Text>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {children}
        <View style={shell.actions}>
          <TouchableOpacity style={shell.btnSkip} onPress={onSkip}>
            <Text style={shell.btnSkipText}>Pular</Text>
          </TouchableOpacity>
          <TouchableOpacity style={shell.btnCancel} onPress={onCancel}>
            <Text style={shell.btnCancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={shell.btnSave} onPress={onNext} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={shell.btnSaveText}>Salvar</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, multiline, keyboardType }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: any;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={[f.input, multiline && { height: 90, textAlignVertical: 'top' }]}
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={colors.textInactive} multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={f.label}>{label}</Text>
      <TextInput style={f.input} value={value} onChangeText={onChange}
        keyboardType="number-pad" placeholderTextColor={colors.textInactive} placeholder="0" />
    </View>
  );
}

// ── Popup 1 — Antecedentes Obstétricos ────────────────────────────────────────

function Popup1({ patientId, onNext, onSkip, onCancel }: PopupProps) {
  const [g, setG] = useState('');
  const [p, setP] = useState('');
  const [a, setA] = useState('');
  const [cesareans, setCesareans] = useState('');
  const [vaginal, setVaginal] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      const existing = await patientsService.getAnamnesis(patientId).catch(() => null);
      await patientsService.saveAnamnesis(patientId, {
        ...(existing ?? {}),
        obstetric_g: g ? parseInt(g) : undefined,
        obstetric_p: p ? parseInt(p) : undefined,
        obstetric_a: a ? parseInt(a) : undefined,
        cesareans: cesareans ? parseInt(cesareans) : undefined,
        vaginal_deliveries: vaginal ? parseInt(vaginal) : undefined,
        newborn_weights: notes || undefined,
      } as any);
      onNext();
    } catch {
      onNext();
    } finally {
      setLoading(false);
    }
  }

  return (
    <PopupShell title="Antecedentes Obstétricos" step={1} onNext={save} onSkip={onSkip} onCancel={onCancel} loading={loading}>
      <Text style={f.sectionLabel}>Fórmula GPA</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <NumField label="G — Gestações" value={g} onChange={setG} />
        <NumField label="P — Partos" value={p} onChange={setP} />
        <NumField label="A — Abortos" value={a} onChange={setA} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <NumField label="Cesáreas" value={cesareans} onChange={setCesareans} />
        <NumField label="Partos Normais" value={vaginal} onChange={setVaginal} />
        <View style={{ flex: 1 }} />
      </View>
      <Field label="Partos anteriores" value={notes} onChange={setNotes} multiline
        placeholder="Ex: 1º filho: 3.200g, parto normal; 2º filho: cesárea..." />
    </PopupShell>
  );
}

// ── Popup 2 — Patologias, Medicações e Hábitos ────────────────────────────────

function Popup2({ patientId, onNext, onSkip, onCancel }: PopupProps) {
  const [altoRisco, setAltoRisco] = useState(false);
  const [alterations, setAlterations] = useState('');
  const [medications, setMedications] = useState('');
  const [habits, setHabits] = useState('');
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      const existing = await patientsService.getAnamnesis(patientId).catch(() => null);
      await patientsService.saveAnamnesis(patientId, {
        ...(existing ?? {}),
        high_risk: altoRisco,
        alterations: alterations || undefined,
        medications: medications || undefined,
        habits: habits || undefined,
      } as any);
      if (altoRisco) {
        await patientsService.updateProntuario(patientId, { risk_level: 'high' }).catch(() => {});
      }
      onNext();
    } catch {
      onNext();
    } finally {
      setLoading(false);
    }
  }

  return (
    <PopupShell title="Patologias, Medicações e Hábitos" step={2} onNext={save} onSkip={onSkip} onCancel={onCancel} loading={loading}>
      <View style={f.toggleRow}>
        <Text style={f.toggleLabel}>Gestação de Alto Risco</Text>
        <Switch value={altoRisco} onValueChange={setAltoRisco}
          trackColor={{ true: colors.red, false: '#ccc' }} thumbColor="#fff" />
      </View>
      {altoRisco && (
        <View style={f.riskBanner}>
          <Text style={f.riskBannerText}>⚠️ Marcada como alto risco</Text>
        </View>
      )}
      <Field label="Patologias da Gestação Atual" value={alterations} onChange={setAlterations}
        multiline placeholder="Descreva patologias relevantes desta gestação..." />
      <Field label="Medicações em Uso" value={medications} onChange={setMedications}
        multiline placeholder="Liste as medicações em uso..." />
      <Field label="Hábitos" value={habits} onChange={setHabits}
        multiline placeholder="Atividade física, alimentação, esportes..." />
    </PopupShell>
  );
}

// ── Popup 3 — Histórico Clínico ───────────────────────────────────────────────

function Popup3({ patientId, onNext, onSkip, onCancel }: PopupProps) {
  const [comorbidities, setComorbidities] = useState('');
  const [allergies, setAllergies] = useState('');
  const [vices, setVices] = useState('');
  const [surgeries, setSurgeries] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      const existing = await patientsService.getAnamnesis(patientId).catch(() => null);
      await patientsService.saveAnamnesis(patientId, {
        ...(existing ?? {}),
        comorbidities: comorbidities || undefined,
        allergies: allergies || undefined,
        vices: vices || undefined,
        surgeries: surgeries || undefined,
        family_history: familyHistory || undefined,
      } as any);
      onNext();
    } catch {
      onNext();
    } finally {
      setLoading(false);
    }
  }

  return (
    <PopupShell title="Histórico Clínico" step={3} onNext={save} onSkip={onSkip} onCancel={onCancel} loading={loading}>
      <Text style={f.sectionLabel}>Histórico Médico</Text>
      <Field label="Comorbidades" value={comorbidities} onChange={setComorbidities} multiline placeholder="Descreva as comorbidades..." />
      <Field label="Alergias" value={allergies} onChange={setAllergies} multiline placeholder="Alergias conhecidas..." />
      <Field label="Vícios" value={vices} onChange={setVices} multiline placeholder="Tabagismo, alcoolismo, drogas..." />
      <Field label="Cirurgias" value={surgeries} onChange={setSurgeries} multiline placeholder="Cirurgias realizadas..." />
      <Text style={f.sectionLabel}>Histórico Familiar</Text>
      <Field label="Histórico Familiar" value={familyHistory} onChange={setFamilyHistory} multiline placeholder="Doenças na família, antecedentes obstétricos familiares..." />
    </PopupShell>
  );
}

// ── Popup 4 — Perfil da Gestante ──────────────────────────────────────────────

const BLOOD_TYPES = ['A', 'B', 'AB', 'O'];
const RH_FACTORS = [{ label: 'Positivo (+)', value: '+' }, { label: 'Negativo (-)', value: '-' }];
const HB_TYPES = ['AA', 'AS', 'AC', 'SS', 'SC'];

function Popup4({ patientId, onNext, onSkip, onCancel }: PopupProps) {
  const [bloodType, setBloodType] = useState('');
  const [rh, setRh] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [hb, setHb] = useState('');
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);

  const imc = weight && height
    ? (parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1)
    : '';

  async function save() {
    setLoading(true);
    try {
      const fullBloodType = bloodType && rh ? `${bloodType}${rh}` : bloodType || undefined;
      await patientsService.updateProntuario(patientId, {
        blood_type: fullBloodType,
        weight_initial_kg: weight || undefined,
        height_cm: height || undefined,
        imc: imc || undefined,
      });
      if (observations || hb) {
        const existing = await patientsService.getAnamnesis(patientId).catch(() => null);
        await patientsService.saveAnamnesis(patientId, {
          ...(existing ?? {}),
          observations: observations || undefined,
          hb_electrophoresis: hb || undefined,
        } as any);
      }
      onNext();
    } catch {
      onNext();
    } finally {
      setLoading(false);
    }
  }

  return (
    <PopupShell title="Perfil da Gestante" step={4} onNext={save} onSkip={onSkip} onCancel={onCancel} loading={loading}>
      <Text style={f.label}>Tipo Sanguíneo</Text>
      <View style={f.chipRow}>
        {BLOOD_TYPES.map((t) => (
          <TouchableOpacity key={t} style={[f.chip, bloodType === t && f.chipActive]} onPress={() => setBloodType(t)}>
            <Text style={[f.chipText, bloodType === t && f.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={f.label}>Fator RH</Text>
      <View style={f.chipRow}>
        {RH_FACTORS.map((r) => (
          <TouchableOpacity key={r.value} style={[f.chip, rh === r.value && f.chipActive]} onPress={() => setRh(r.value)}>
            <Text style={[f.chipText, rh === r.value && f.chipTextActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Peso inicial (kg)" value={weight} onChange={setWeight} keyboardType="decimal-pad" placeholder="Ex: 65.5" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Altura (cm)" value={height} onChange={setHeight} keyboardType="number-pad" placeholder="Ex: 165" />
        </View>
      </View>
      {imc ? (
        <View style={f.imcBox}>
          <Text style={f.imcText}>IMC Inicial: <Text style={{ fontWeight: '800' }}>{imc}</Text></Text>
        </View>
      ) : null}
      <Text style={f.label}>Eletroforese de Hemoglobina (Hb)</Text>
      <View style={f.chipRow}>
        {HB_TYPES.map((t) => (
          <TouchableOpacity key={t} style={[f.chip, hb === t && f.chipActive]} onPress={() => setHb(t)}>
            <Text style={[f.chipText, hb === t && f.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Field label="Observações e Anotações" value={observations} onChange={setObservations} multiline
        placeholder="Adicione observações relevantes sobre a gestante..." />
    </PopupShell>
  );
}

// ── Popup 5 — Cartão de Vacinação ─────────────────────────────────────────────

function maskDate(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDateToISO(s: string): string | undefined {
  const parts = s.split('/');
  if (parts.length !== 3 || parts[2].length !== 4) return undefined;
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

function VaccineRow({ name, status, onStatus, date, onDate }: {
  name: string; status: VaccineStatus; onStatus: (s: VaccineStatus) => void;
  date: string; onDate: (d: string) => void;
}) {
  return (
    <View style={f.vaccineRow}>
      <Text style={f.vaccineLabel}>{name}</Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <View style={f.chipRow}>
          {(['pending', 'immunized'] as VaccineStatus[]).map((s) => (
            <TouchableOpacity key={s} style={[f.chip, status === s && f.chipActive]} onPress={() => onStatus(s)}>
              <Text style={[f.chipText, status === s && f.chipTextActive]}>
                {s === 'pending' ? 'Pendente' : 'Imunizada'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {status === 'immunized' && (
          <TextInput style={[f.input, { flex: 1, marginBottom: 0 }]}
            placeholder="DD/MM/AAAA" keyboardType="number-pad"
            placeholderTextColor={colors.textInactive}
            value={date} onChangeText={(v) => onDate(maskDate(v))} />
        )}
      </View>
    </View>
  );
}

function Popup5({ patientId, onNext, onSkip, onCancel }: PopupProps) {
  const [influenza, setInfluenza] = useState<VaccineStatus>('pending');
  const [influenzaDate, setInfluenzaDate] = useState('');
  const [rhogam, setRhogam] = useState<VaccineStatus>('pending');
  const [rhogamDate, setRhogamDate] = useState('');
  const [dtpa, setDtpa] = useState<VaccineStatus>('pending');
  const [dtpaDate, setDtpaDate] = useState('');
  const [abrysvo, setAbrysvo] = useState<VaccineStatus>('pending');
  const [abrysvoDate, setAbrysvoDate] = useState('');
  const [covid, setCovid] = useState<VaccineStatus>('pending');
  const [covidDoses, setCovidDoses] = useState('');
  const [covidDate, setCovidDate] = useState('');
  const [hepB1, setHepB1] = useState<VaccineStatus>('pending');
  const [hepB1Date, setHepB1Date] = useState('');
  const [hepB2, setHepB2] = useState<VaccineStatus>('pending');
  const [hepB2Date, setHepB2Date] = useState('');
  const [hepBR, setHepBR] = useState<VaccineStatus>('pending');
  const [hepBRDate, setHepBRDate] = useState('');
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const vaccines = [
      { name: 'Influenza', status: influenza, date: parseDateToISO(influenzaDate) },
      { name: 'Rhogam', status: rhogam, date: parseDateToISO(rhogamDate) },
      { name: 'dTpa', status: dtpa, date: parseDateToISO(dtpaDate) },
      { name: 'Abrysvo', status: abrysvo, date: parseDateToISO(abrysvoDate) },
      { name: 'COVID-19', status: covid, date: parseDateToISO(covidDate) },
      { name: 'Hepatite B - 1ª Dose', status: hepB1, date: parseDateToISO(hepB1Date) },
      { name: 'Hepatite B - 2ª Dose', status: hepB2, date: parseDateToISO(hepB2Date) },
      { name: 'Hepatite B - Reforço', status: hepBR, date: parseDateToISO(hepBRDate) },
    ];
    try {
      for (const v of vaccines) {
        if (v.status === 'immunized' && v.date) {
          await examsService.createVaccine(patientId, {
            vaccine_type: v.name,
            date: v.date,
            status: 'completed',
            dose_number: 1,
          }).catch(() => {});
        }
      }
      onNext();
    } catch {
      onNext();
    } finally {
      setLoading(false);
    }
  }

  return (
    <PopupShell title="Cartão de Vacinação" step={5} onNext={save} onSkip={onSkip} onCancel={onCancel} loading={loading}>
      <VaccineRow name="Influenza" status={influenza} onStatus={setInfluenza} date={influenzaDate} onDate={setInfluenzaDate} />
      <VaccineRow name="Rhogam" status={rhogam} onStatus={setRhogam} date={rhogamDate} onDate={setRhogamDate} />
      <VaccineRow name="dTpa" status={dtpa} onStatus={setDtpa} date={dtpaDate} onDate={setDtpaDate} />
      <VaccineRow name="Abrysvo" status={abrysvo} onStatus={setAbrysvo} date={abrysvoDate} onDate={setAbrysvoDate} />
      <View style={f.vaccineRow}>
        <Text style={f.vaccineLabel}>Vacina COVID-19</Text>
        <View style={f.chipRow}>
          {(['pending', 'immunized'] as VaccineStatus[]).map((s) => (
            <TouchableOpacity key={s} style={[f.chip, covid === s && f.chipActive]} onPress={() => setCovid(s)}>
              <Text style={[f.chipText, covid === s && f.chipTextActive]}>{s === 'pending' ? 'Pendente' : 'Imunizada'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {covid === 'immunized' && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[f.input, { flex: 1, marginBottom: 0 }]} placeholder="Nº doses"
              keyboardType="number-pad" placeholderTextColor={colors.textInactive}
              value={covidDoses} onChangeText={setCovidDoses} />
            <TextInput style={[f.input, { flex: 1, marginBottom: 0 }]} placeholder="DD/MM/AAAA"
              keyboardType="number-pad" placeholderTextColor={colors.textInactive}
              value={covidDate} onChangeText={(v) => setCovidDate(maskDate(v))} />
          </View>
        )}
      </View>
      <VaccineRow name="Hepatite B — 1ª Dose" status={hepB1} onStatus={setHepB1} date={hepB1Date} onDate={setHepB1Date} />
      <VaccineRow name="Hepatite B — 2ª Dose" status={hepB2} onStatus={setHepB2} date={hepB2Date} onDate={setHepB2Date} />
      <VaccineRow name="Hepatite B — Reforço" status={hepBR} onStatus={setHepBR} date={hepBRDate} onDate={setHepBRDate} />
    </PopupShell>
  );
}

// ── Popup 6 — Coletas Vaginais ────────────────────────────────────────────────

function Popup6({ patientId, onNext, onSkip, onCancel }: PopupProps) {
  const [colpoDate, setColpoDate] = useState('');
  const [colpoResult, setColpoResult] = useState('');
  const [pcrStrep, setPcrStrep] = useState('');
  const [pcrStrepDate, setPcrStrepDate] = useState('');
  const [pcrClamDate, setPcrClamDate] = useState('');
  const [pcrClamResult, setPcrClamResult] = useState('');
  const [pcrGonDate, setPcrGonDate] = useState('');
  const [pcrGonResult, setPcrGonResult] = useState('');
  const [pcrHpv, setPcrHpv] = useState('');
  const [pcrHpvDate, setPcrHpvDate] = useState('');
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const exams = [
      { name: 'Colpocitologia Oncótica', date: colpoDate, result: colpoResult },
      { name: 'PCR Streptococcus', date: pcrStrepDate, result: pcrStrep },
      { name: 'PCR Clamídia', date: pcrClamDate, result: pcrClamResult },
      { name: 'PCR Gonococco', date: pcrGonDate, result: pcrGonResult },
      { name: 'PCR HPV', date: pcrHpvDate, result: pcrHpv },
    ];
    try {
      for (const e of exams) {
        const iso = parseDateToISO(e.date);
        if (iso && e.result) {
          await examsService.createLabTest(patientId, {
            name: e.name,
            date: iso,
            result: e.result,
            type: 'other',
            status: 'completed',
          }).catch(() => {});
        }
      }
      onNext();
    } catch {
      onNext();
    } finally {
      setLoading(false);
    }
  }

  const posNeg = ['Positivo', 'Negativo'];

  return (
    <PopupShell title="Coletas Vaginais" step={6} onNext={save} onSkip={onSkip} onCancel={onCancel} loading={loading}>
      <View style={f.vaccineRow}>
        <Text style={f.vaccineLabel}>Colpocitologia Oncótica</Text>
        <TextInput style={f.input} placeholder="DD/MM/AAAA" keyboardType="number-pad"
          placeholderTextColor={colors.textInactive} value={colpoDate} onChangeText={(v) => setColpoDate(maskDate(v))} />
        <TextInput style={f.input} placeholder="Resultado..." placeholderTextColor={colors.textInactive}
          value={colpoResult} onChangeText={setColpoResult} />
      </View>
      <View style={f.vaccineRow}>
        <Text style={f.vaccineLabel}>PCR Streptococcus</Text>
        <TextInput style={f.input} placeholder="DD/MM/AAAA" keyboardType="number-pad"
          placeholderTextColor={colors.textInactive} value={pcrStrepDate} onChangeText={(v) => setPcrStrepDate(maskDate(v))} />
        <View style={f.chipRow}>
          {posNeg.map((r) => (
            <TouchableOpacity key={r} style={[f.chip, pcrStrep === r && f.chipActive]} onPress={() => setPcrStrep(r)}>
              <Text style={[f.chipText, pcrStrep === r && f.chipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={f.vaccineRow}>
        <Text style={f.vaccineLabel}>PCR Clamídia</Text>
        <TextInput style={f.input} placeholder="DD/MM/AAAA" keyboardType="number-pad"
          placeholderTextColor={colors.textInactive} value={pcrClamDate} onChangeText={(v) => setPcrClamDate(maskDate(v))} />
        <TextInput style={f.input} placeholder="Resultado..." placeholderTextColor={colors.textInactive}
          value={pcrClamResult} onChangeText={setPcrClamResult} />
      </View>
      <View style={f.vaccineRow}>
        <Text style={f.vaccineLabel}>PCR Gonococco</Text>
        <TextInput style={f.input} placeholder="DD/MM/AAAA" keyboardType="number-pad"
          placeholderTextColor={colors.textInactive} value={pcrGonDate} onChangeText={(v) => setPcrGonDate(maskDate(v))} />
        <TextInput style={f.input} placeholder="Resultado..." placeholderTextColor={colors.textInactive}
          value={pcrGonResult} onChangeText={setPcrGonResult} />
      </View>
      <View style={f.vaccineRow}>
        <Text style={f.vaccineLabel}>PCR HPV</Text>
        <TextInput style={f.input} placeholder="DD/MM/AAAA" keyboardType="number-pad"
          placeholderTextColor={colors.textInactive} value={pcrHpvDate} onChangeText={(v) => setPcrHpvDate(maskDate(v))} />
        <View style={f.chipRow}>
          {posNeg.map((r) => (
            <TouchableOpacity key={r} style={[f.chip, pcrHpv === r && f.chipActive]} onPress={() => setPcrHpv(r)}>
              <Text style={[f.chipText, pcrHpv === r && f.chipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </PopupShell>
  );
}

// ── Orquestrador ──────────────────────────────────────────────────────────────

interface OnboardingProps {
  visible: boolean;
  patientId: string;
  onFinish: () => void;
}

export function OnboardingGestante({ visible, patientId, onFinish }: OnboardingProps) {
  const [step, setStep] = useState(1);

  function next() { step < 6 ? setStep(step + 1) : onFinish(); }
  function skip() { step < 6 ? setStep(step + 1) : onFinish(); }
  function cancel() { onFinish(); }

  const props: PopupProps = { patientId, onNext: next, onSkip: skip, onCancel: cancel };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={cancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {step === 1 && <Popup1 {...props} />}
          {step === 2 && <Popup2 {...props} />}
          {step === 3 && <Popup3 {...props} />}
          {step === 4 && <Popup4 {...props} />}
          {step === 5 && <Popup5 {...props} />}
          {step === 6 && <Popup6 {...props} />}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const shell = StyleSheet.create({
  sheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg, paddingTop: 12, maxHeight: '92%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stepRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd' },
  dotActive: { backgroundColor: colors.primary, width: 20 },
  step: { fontSize: 12, fontWeight: '600', color: colors.textInactive },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 8 },
  btnSkip: { flex: 1, paddingVertical: 13, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center' },
  btnSkipText: { fontSize: 13, fontWeight: '600', color: colors.textInactive },
  btnCancel: { flex: 1, paddingVertical: 13, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  btnCancelText: { fontSize: 13, fontWeight: '600', color: colors.textMid },
  btnSave: { flex: 2, paddingVertical: 13, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
  btnSaveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

const f = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: colors.textMid, marginBottom: 6, marginTop: 2 },
  sublabel: { fontSize: 11, color: colors.textInactive, marginBottom: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 10, marginTop: 4 },
  input: {
    backgroundColor: colors.bg, borderRadius: radius.md, padding: 12,
    fontSize: 14, color: colors.text, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)',
  },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingVertical: 4 },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  riskBanner: { backgroundColor: 'rgba(225,91,91,0.1)', borderRadius: radius.md, padding: 10, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: colors.red },
  riskBannerText: { fontSize: 13, fontWeight: '700', color: colors.red },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.bg, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textMid },
  chipTextActive: { color: '#fff' },
  imcBox: { backgroundColor: 'rgba(141,170,145,0.12)', borderRadius: radius.md, padding: 10, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: colors.primary },
  imcText: { fontSize: 13, color: colors.primaryDk },
  vaccineRow: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)', paddingBottom: 12, marginBottom: 12 },
  vaccineLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 },
});
