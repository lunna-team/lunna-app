import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { storage, STORAGE_KEYS } from '../../services/storage';
import { colors, spacing, radius } from '../../theme';

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = 'geral' | 'sinais' | 'consultas' | 'usg' | 'exames' | 'vacinas';

interface Consulta { id: number; data: string; ig: string; pa: string; peso: string; bcf: string; obs: string; }
interface USG { id: number; tipo: string; data: string; ig: string; apresentacao: string; la: string; bcf: string; peso: string; }
interface Exame { id: number; data: string; hb: string; glicemia: string; tsh: string; obs: string; }
interface Vacina { id: number; nome: string; data: string; dose: string; status: 'aplicada' | 'agendada' | 'nao'; }
interface PressaoItem { id: number; sistolica: number; diastolica: number; momento: string; }
interface GlicoseItem { id: number; valor: number; momento: string; }

// ── Mock data ─────────────────────────────────────────────────────────────────

const CONSULTAS_MOCK: Consulta[] = [
  { id: 1, data: '03 Mar 2025', ig: '24ª sem', pa: '118/76', peso: '67,3 kg', bcf: '148 bpm', obs: 'Evolução normal. Orientações nutricionais.' },
  { id: 2, data: '14 Fev 2025', ig: '20ª sem', pa: '115/74', peso: '65,2 kg', bcf: '152 bpm', obs: 'USG morfológico solicitado.' },
  { id: 3, data: '17 Jan 2025', ig: '16ª sem', pa: '112/72', peso: '63,4 kg', bcf: '144 bpm', obs: 'Exames do 2º trimestre solicitados.' },
];

const USG_MOCK: USG[] = [
  { id: 1, tipo: 'Morfológico 2º trimestre', data: '20 Fev 2025', ig: '21ª sem', apresentacao: 'Cefálica', la: 'Normal (ILA 12)', bcf: '150 bpm', peso: '480g' },
  { id: 2, tipo: 'Translucência nucal', data: '12 Nov 2024', ig: '12ª sem', apresentacao: '—', la: '—', bcf: '168 bpm', peso: '60g' },
];

const EXAMES_MOCK: Exame[] = [
  { id: 1, data: '14 Fev 2025', hb: '11,2 g/dL', glicemia: '88 mg/dL', tsh: '2,1 uUI/mL', obs: 'Anemia leve. Suplementação mantida.' },
  { id: 2, data: '10 Nov 2024', hb: '12,4 g/dL', glicemia: '82 mg/dL', tsh: '1,8 uUI/mL', obs: 'Dentro da normalidade.' },
];

const VACINAS_MOCK: Vacina[] = [
  { id: 1, nome: 'dTpa', data: '08 Nov 2024', dose: 'Única', status: 'aplicada' },
  { id: 2, nome: 'Influenza', data: '15 Mar 2025', dose: 'Anual', status: 'agendada' },
  { id: 3, nome: 'Hepatite B', data: '—', dose: '3ª dose', status: 'nao' },
  { id: 4, nome: 'Covid-19', data: '02 Out 2024', dose: 'Reforço', status: 'aplicada' },
];

const PRESS_MOCK: PressaoItem[] = [
  { id: 1, sistolica: 118, diastolica: 76, momento: 'Manhã' },
  { id: 2, sistolica: 122, diastolica: 80, momento: 'Tarde' },
];
const GLIC_MOCK: GlicoseItem[] = [
  { id: 1, valor: 88, momento: 'Jejum' },
  { id: 2, valor: 132, momento: '2h pós-refeição' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const classifyPA = (s: number, d: number) => {
  if (s >= 140 || d >= 90) return { label: 'Hipertensão', color: colors.red };
  if (s >= 130 || d >= 80) return { label: 'Grau 1', color: colors.accent };
  return { label: 'Normal', color: '#3CB371' };
};

const classifyGlic = (v: number, m: string) => {
  const jejum = m.toLowerCase().includes('jejum');
  if (jejum ? v > 95 : v >= 140) return { label: 'Atenção', color: colors.yellow };
  return { label: 'Normal', color: '#3CB371' };
};

const vacinaColor = (s: Vacina['status']) =>
  s === 'aplicada' ? { bg: 'rgba(141,170,145,0.15)', color: colors.primaryDk, label: 'Aplicada' }
  : s === 'agendada' ? { bg: 'rgba(245,166,35,0.15)', color: '#8a5e00', label: 'Agendada' }
  : { bg: 'rgba(0,0,0,0.06)', color: colors.textInactive, label: 'Não aplicada' };

// ── Sheet (bottom modal) ───────────────────────────────────────────────────────

function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} />
      </TouchableWithoutFeedback>
      <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={s.handle} />
        <Text style={s.sheetTitle}>{title}</Text>
        <ScrollView keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, multiline, placeholder }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string }) {
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

// ── Expandable card ───────────────────────────────────────────────────────────

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

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'geral', label: 'Geral' },
  { key: 'sinais', label: 'Sinais Vitais' },
  { key: 'consultas', label: 'Consultas' },
  { key: 'usg', label: 'USG' },
  { key: 'exames', label: 'Exames' },
  { key: 'vacinas', label: 'Vacinas' },
];

// ── GERAL TAB ─────────────────────────────────────────────────────────────────

function GeralTab() {
  const [notas, setNotas] = useState('');
  const [editIdent, setEditIdent] = useState(false);
  const [editClin, setEditClin] = useState(false);
  const [editEsp, setEditEsp] = useState(false);

  // Identificação fields
  const [nomeBebe, setNomeBebe] = useState('Aurora');
  const [acomp, setAcomp] = useState('Carlos Silva');
  const [hospital, setHospital] = useState('Hospital São Luiz');
  const [paridade, setParidade] = useState('G1P0');
  const [fetos, setFetos] = useState('1');
  const [fatores, setFatores] = useState('Nenhum');
  const [altura, setAltura] = useState('165 cm');
  const [pesoIni, setPesoIni] = useState('62 kg');
  const [dpp, setDpp] = useState('06/06/2026');

  // Dados clínicos fields
  const [alergias, setAlergias] = useState('Dipirona');
  const [meds, setMeds] = useState('Ácido fólico 5mg · Sulfato ferroso 40mg');
  const [doencas, setDoencas] = useState('Nenhuma');
  const [cirurgias, setCirurgias] = useState('Nenhuma');
  const [antecedentes, setAntecedentes] = useState('Mãe: HAS · Pai: DM2');
  const [profissao, setProfissao] = useState('Professora');
  const [vicios, setVicios] = useState('Não fuma · Sem álcool');

  // Exames especiais
  const [tipoSang, setTipoSang] = useState('A+');
  const [nipt, setNipt] = useState('Não realizado');
  const [totg0, setTotg0] = useState('88');
  const [totg1, setTotg1] = useState('165');
  const [totg2, setTotg2] = useState('138');
  const [strep, setStrep] = useState('Não testado');

  useEffect(() => {
    storage.get<string>(STORAGE_KEYS.notasMedica).then((v) => { if (v) setNotas(v); });
  }, []);

  const saveNotas = async (text: string) => {
    setNotas(text);
    await storage.set(STORAGE_KEYS.notasMedica, text);
  };

  const infoRow = (label: string, value: string) => (
    <View key={label} style={s.infoRow}>
      <Text style={s.infoKey}>{label}</Text>
      <Text style={s.infoVal}>{value}</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      {/* Patient card */}
      <View style={s.darkCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={s.darkAvatar}><Text style={s.darkAvatarText}>MS</Text></View>
          <View>
            <Text style={s.darkName}>Maria da Silva</Text>
            <Text style={s.darkMeta}>28 anos · A+ · G1P0</Text>
          </View>
        </View>
        <View style={s.chipRow}>
          {['Sem. 32/42', 'DPP: 06 Jun', 'Cefálico', '1ª gestação'].map((c, i) => (
            <View key={c} style={[s.chip, i === 3 && s.chipAccent]}><Text style={[s.chipText, i === 3 && s.chipTextAccent]}>{c}</Text></View>
          ))}
        </View>
      </View>

      {/* Identificação */}
      <View style={[s.infoCard, { marginBottom: 12 }]}>
        <View style={s.infoCardHeader}>
          <Text style={s.infoCardTitle}>Identificação</Text>
          <TouchableOpacity style={s.editBtn} onPress={() => setEditIdent(true)}>
            <Text style={s.editBtnText}>✏️ Editar</Text>
          </TouchableOpacity>
        </View>
        {infoRow('Nome do bebê', nomeBebe)}
        {infoRow('Acompanhante', acomp)}
        {infoRow('Hospital', hospital)}
        {infoRow('Paridade', paridade)}
        {infoRow('Altura / Peso', `${altura} · ${pesoIni}`)}
        {infoRow('DPP', dpp)}
      </View>

      {/* Dados Clínicos */}
      <View style={[s.infoCard, { marginBottom: 12 }]}>
        <View style={s.infoCardHeader}>
          <Text style={s.infoCardTitle}>Dados Clínicos</Text>
          <TouchableOpacity style={s.editBtn} onPress={() => setEditClin(true)}>
            <Text style={s.editBtnText}>✏️ Editar</Text>
          </TouchableOpacity>
        </View>
        {infoRow('Alergias', alergias)}
        {infoRow('Medicamentos', meds)}
        {infoRow('Doenças crônicas', doencas)}
        {infoRow('Cirurgias', cirurgias)}
        {infoRow('Antecedentes fam.', antecedentes)}
        {infoRow('Profissão', profissao)}
        {infoRow('Vícios', vicios)}
      </View>

      {/* Exames Especiais */}
      <View style={[s.infoCard, { marginBottom: 12 }]}>
        <View style={s.infoCardHeader}>
          <Text style={s.infoCardTitle}>Exames Especiais</Text>
          <TouchableOpacity style={s.editBtn} onPress={() => setEditEsp(true)}>
            <Text style={s.editBtnText}>✏️ Editar</Text>
          </TouchableOpacity>
        </View>
        {infoRow('Tipo sanguíneo', tipoSang)}
        {infoRow('NIPT', nipt)}
        {infoRow('TOTG (jejum/1h/2h)', `${totg0} / ${totg1} / ${totg2} mg/dL`)}
        {infoRow('Estreptococo B', strep)}
      </View>

      {/* Notas */}
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

      {/* MODALS */}
      <Sheet visible={editIdent} onClose={() => setEditIdent(false)} title="Editar Identificação">
        <Field label="Nome do bebê" value={nomeBebe} onChange={setNomeBebe} />
        <Field label="Acompanhante" value={acomp} onChange={setAcomp} />
        <Field label="Hospital" value={hospital} onChange={setHospital} />
        <Row>
          <View style={{ flex: 1 }}><Field label="Paridade" value={paridade} onChange={setParidade} /></View>
          <View style={{ flex: 1 }}><Field label="Nº fetos" value={fetos} onChange={setFetos} /></View>
        </Row>
        <Field label="Fatores de risco" value={fatores} onChange={setFatores} multiline />
        <Row>
          <View style={{ flex: 1 }}><Field label="Altura" value={altura} onChange={setAltura} /></View>
          <View style={{ flex: 1 }}><Field label="Peso inicial" value={pesoIni} onChange={setPesoIni} /></View>
        </Row>
        <Field label="DPP" value={dpp} onChange={setDpp} />
        <TouchableOpacity style={s.saveBtn} onPress={() => setEditIdent(false)}>
          <Text style={s.saveBtnText}>Salvar</Text>
        </TouchableOpacity>
      </Sheet>

      <Sheet visible={editClin} onClose={() => setEditClin(false)} title="Editar Dados Clínicos">
        <Field label="Alergias" value={alergias} onChange={setAlergias} />
        <Field label="Medicamentos" value={meds} onChange={setMeds} multiline />
        <Field label="Doenças crônicas" value={doencas} onChange={setDoencas} />
        <Field label="Cirurgias anteriores" value={cirurgias} onChange={setCirurgias} />
        <Field label="Antecedentes familiares" value={antecedentes} onChange={setAntecedentes} multiline />
        <Field label="Profissão" value={profissao} onChange={setProfissao} />
        <Field label="Vícios e hábitos" value={vicios} onChange={setVicios} />
        <TouchableOpacity style={s.saveBtn} onPress={() => setEditClin(false)}>
          <Text style={s.saveBtnText}>Salvar</Text>
        </TouchableOpacity>
      </Sheet>

      <Sheet visible={editEsp} onClose={() => setEditEsp(false)} title="Editar Exames Especiais">
        <Field label="Tipo sanguíneo" value={tipoSang} onChange={setTipoSang} />
        <Field label="NIPT" value={nipt} onChange={setNipt} />
        <Text style={s.fieldLabel}>TOTG (mg/dL)</Text>
        <Row>
          <View style={{ flex: 1 }}><Field label="Jejum" value={totg0} onChange={setTotg0} placeholder="ex: 88" /></View>
          <View style={{ flex: 1 }}><Field label="1h" value={totg1} onChange={setTotg1} placeholder="ex: 165" /></View>
          <View style={{ flex: 1 }}><Field label="2h" value={totg2} onChange={setTotg2} placeholder="ex: 138" /></View>
        </Row>
        <Field label="Estreptococo B" value={strep} onChange={setStrep} />
        <TouchableOpacity style={s.saveBtn} onPress={() => setEditEsp(false)}>
          <Text style={s.saveBtnText}>Salvar</Text>
        </TouchableOpacity>
      </Sheet>
    </ScrollView>
  );
}

// ── SINAIS VITAIS TAB ─────────────────────────────────────────────────────────

function SinaisTab() {
  const [pressao, setPressao] = useState<PressaoItem[]>(PRESS_MOCK);
  const [glicose, setGlicose] = useState<GlicoseItem[]>(GLIC_MOCK);
  const [pressModal, setPressModal] = useState(false);
  const [glicModal, setGlicModal] = useState(false);
  const [sis, setSis] = useState(''); const [dia, setDia] = useState('');
  const [glicVal, setGlicVal] = useState('');
  const [glicMom, setGlicMom] = useState('Jejum');

  useEffect(() => {
    storage.get<PressaoItem[]>(STORAGE_KEYS.pressao).then((v) => { if (v?.length) setPressao(v); });
    storage.get<GlicoseItem[]>(STORAGE_KEYS.glicose).then((v) => { if (v?.length) setGlicose(v); });
  }, []);

  const addPA = async () => {
    const s = parseInt(sis), d = parseInt(dia);
    if (!s || !d) return;
    const updated = [{ id: Date.now(), sistolica: s, diastolica: d, momento: 'Agora' }, ...pressao];
    setPressao(updated); await storage.set(STORAGE_KEYS.pressao, updated);
    setPressModal(false); setSis(''); setDia('');
  };

  const addGlic = async () => {
    const v = parseInt(glicVal);
    if (!v) return;
    const updated = [{ id: Date.now(), valor: v, momento: glicMom }, ...glicose];
    setGlicose(updated); await storage.set(STORAGE_KEYS.glicose, updated);
    setGlicModal(false); setGlicVal('');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      {/* Pressão */}
      <Text style={s.svTitle}>🩺 Pressão Arterial</Text>
      {pressao.slice(0, 3).map((m) => {
        const { label, color } = classifyPA(m.sistolica, m.diastolica);
        return (
          <View key={m.id} style={s.dataRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.dataVal}>{m.sistolica}/{m.diastolica} <Text style={s.dataUnit}>mmHg</Text></Text>
              <Text style={s.dataSub}>{m.momento}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: color + '22' }]}>
              <Text style={[s.badgeText, { color }]}>{label}</Text>
            </View>
          </View>
        );
      })}
      <TouchableOpacity style={s.addRowBtn} onPress={() => setPressModal(true)}>
        <Text style={s.addRowBtnText}>+ Registrar Pressão</Text>
      </TouchableOpacity>

      {/* Glicose */}
      <Text style={[s.svTitle, { marginTop: 24 }]}>🩸 Glicose</Text>
      {glicose.slice(0, 3).map((m) => {
        const { label, color } = classifyGlic(m.valor, m.momento);
        return (
          <View key={m.id} style={s.dataRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.dataVal}>{m.valor} <Text style={s.dataUnit}>mg/dL</Text></Text>
              <Text style={s.dataSub}>{m.momento}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: color + '22' }]}>
              <Text style={[s.badgeText, { color }]}>{label}</Text>
            </View>
          </View>
        );
      })}
      <TouchableOpacity style={s.addRowBtn} onPress={() => setGlicModal(true)}>
        <Text style={s.addRowBtnText}>+ Registrar Glicose</Text>
      </TouchableOpacity>

      {/* Modals */}
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
            {['Jejum', 'Pós-café', 'Pós-almoço', 'Pós-jantar'].map((m) => (
              <TouchableOpacity key={m} style={[s.chip2, glicMom === m && s.chip2Active]} onPress={() => setGlicMom(m)}>
                <Text style={[s.chip2Text, glicMom === m && s.chip2TextActive]}>{m}</Text>
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

function ConsultasTab() {
  const [consultas, setConsultas] = useState<Consulta[]>(CONSULTAS_MOCK);
  const [modal, setModal] = useState(false);
  const [data, setData] = useState(''); const [ig, setIg] = useState('');
  const [pa, setPa] = useState(''); const [peso, setPeso] = useState('');
  const [bcf, setBcf] = useState(''); const [obs, setObs] = useState('');

  useEffect(() => {
    storage.get<Consulta[]>(STORAGE_KEYS.consultasMedico).then((v) => { if (v?.length) setConsultas(v); });
  }, []);

  const salvar = async () => {
    if (!data) return;
    const nova: Consulta = { id: Date.now(), data, ig, pa, peso, bcf, obs };
    const updated = [nova, ...consultas];
    setConsultas(updated); await storage.set(STORAGE_KEYS.consultasMedico, updated);
    setModal(false); setData(''); setIg(''); setPa(''); setPeso(''); setBcf(''); setObs('');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      <View style={s.addRow}>
        <Text style={s.addRowLabel}>{consultas.length} consulta{consultas.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
          <Text style={s.addBtnText}>+ Nova Consulta</Text>
        </TouchableOpacity>
      </View>

      {consultas.map((c) => (
        <ExpandCard key={c.id} header={
          <>
            <Text style={s.expandDate}>{c.data}</Text>
            <Text style={s.expandMeta}>IG: {c.ig} · PA: {c.pa} · {c.peso}</Text>
          </>
        }>
          <View style={s.expandGrid}>
            {[['IG', c.ig], ['PA', c.pa], ['Peso', c.peso], ['BCF', c.bcf]].map(([k, v]) => (
              <View key={k} style={s.expandField}>
                <Text style={s.expandKey}>{k}</Text>
                <Text style={s.expandVal}>{v || '—'}</Text>
              </View>
            ))}
          </View>
          {c.obs ? <Text style={s.expandObs}>{c.obs}</Text> : null}
        </ExpandCard>
      ))}

      <Sheet visible={modal} onClose={() => setModal(false)} title="Nova Consulta">
        <Row>
          <View style={{ flex: 1 }}><Field label="Data" value={data} onChange={setData} placeholder="ex: 15 Abr" /></View>
          <View style={{ flex: 1 }}><Field label="IG" value={ig} onChange={setIg} placeholder="ex: 26ª sem" /></View>
        </Row>
        <Row>
          <View style={{ flex: 1 }}><Field label="PA" value={pa} onChange={setPa} placeholder="ex: 120/78" /></View>
          <View style={{ flex: 1 }}><Field label="Peso" value={peso} onChange={setPeso} placeholder="ex: 68,0 kg" /></View>
        </Row>
        <Row>
          <View style={{ flex: 1 }}><Field label="BCF" value={bcf} onChange={setBcf} placeholder="ex: 148 bpm" /></View>
        </Row>
        <Field label="Observações / Conduta" value={obs} onChange={setObs} multiline />
        <TouchableOpacity style={s.saveBtn} onPress={salvar}><Text style={s.saveBtnText}>Salvar</Text></TouchableOpacity>
      </Sheet>
    </ScrollView>
  );
}

// ── USG TAB ───────────────────────────────────────────────────────────────────

function USGTab() {
  const [list, setList] = useState<USG[]>(USG_MOCK);
  const [modal, setModal] = useState(false);
  const [tipo, setTipo] = useState(''); const [data, setData] = useState('');
  const [ig, setIg] = useState(''); const [apres, setApres] = useState('');
  const [la, setLa] = useState(''); const [bcf, setBcf] = useState('');
  const [peso, setPeso] = useState('');

  useEffect(() => {
    storage.get<USG[]>(STORAGE_KEYS.usgMedico).then((v) => { if (v?.length) setList(v); });
  }, []);

  const salvar = async () => {
    if (!data) return;
    const novo: USG = { id: Date.now(), tipo, data, ig, apresentacao: apres, la, bcf, peso };
    const updated = [novo, ...list];
    setList(updated); await storage.set(STORAGE_KEYS.usgMedico, updated);
    setModal(false); setTipo(''); setData(''); setIg(''); setApres(''); setLa(''); setBcf(''); setPeso('');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      <View style={s.addRow}>
        <Text style={s.addRowLabel}>{list.length} exame{list.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
          <Text style={s.addBtnText}>+ Novo USG</Text>
        </TouchableOpacity>
      </View>

      {list.map((u) => (
        <ExpandCard key={u.id} header={
          <>
            <Text style={s.expandDate}>{u.data}</Text>
            <Text style={s.expandMeta}>{u.tipo} · IG: {u.ig}</Text>
          </>
        }>
          <View style={s.expandGrid}>
            {[['Apresentação', u.apresentacao], ['LA', u.la], ['BCF', u.bcf], ['Peso fetal', u.peso]].map(([k, v]) => (
              <View key={k} style={s.expandField}>
                <Text style={s.expandKey}>{k}</Text>
                <Text style={s.expandVal}>{v || '—'}</Text>
              </View>
            ))}
          </View>
        </ExpandCard>
      ))}

      <Sheet visible={modal} onClose={() => setModal(false)} title="Novo USG">
        <Field label="Tipo" value={tipo} onChange={setTipo} placeholder="ex: Morfológico 2º trimestre" />
        <Row>
          <View style={{ flex: 1 }}><Field label="Data" value={data} onChange={setData} placeholder="ex: 15 Abr" /></View>
          <View style={{ flex: 1 }}><Field label="IG" value={ig} onChange={setIg} placeholder="ex: 26ª sem" /></View>
        </Row>
        <Row>
          <View style={{ flex: 1 }}><Field label="Apresentação" value={apres} onChange={setApres} placeholder="ex: Cefálica" /></View>
          <View style={{ flex: 1 }}><Field label="LA" value={la} onChange={setLa} placeholder="ex: ILA 12" /></View>
        </Row>
        <Row>
          <View style={{ flex: 1 }}><Field label="BCF" value={bcf} onChange={setBcf} placeholder="ex: 150 bpm" /></View>
          <View style={{ flex: 1 }}><Field label="Peso fetal" value={peso} onChange={setPeso} placeholder="ex: 850g" /></View>
        </Row>
        <TouchableOpacity style={s.saveBtn} onPress={salvar}><Text style={s.saveBtnText}>Salvar</Text></TouchableOpacity>
      </Sheet>
    </ScrollView>
  );
}

// ── EXAMES TAB ────────────────────────────────────────────────────────────────

function ExamesTab() {
  const [list, setList] = useState<Exame[]>(EXAMES_MOCK);
  const [modal, setModal] = useState(false);
  const [data, setData] = useState(''); const [hb, setHb] = useState('');
  const [glic, setGlic] = useState(''); const [tsh, setTsh] = useState('');
  const [obs, setObs] = useState('');

  useEffect(() => {
    storage.get<Exame[]>(STORAGE_KEYS.examesMedico).then((v) => { if (v?.length) setList(v); });
  }, []);

  const salvar = async () => {
    if (!data) return;
    const novo: Exame = { id: Date.now(), data, hb, glicemia: glic, tsh, obs };
    const updated = [novo, ...list];
    setList(updated); await storage.set(STORAGE_KEYS.examesMedico, updated);
    setModal(false); setData(''); setHb(''); setGlic(''); setTsh(''); setObs('');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      <View style={s.addRow}>
        <Text style={s.addRowLabel}>{list.length} coleta{list.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
          <Text style={s.addBtnText}>+ Nova Coleta</Text>
        </TouchableOpacity>
      </View>

      {list.map((e) => (
        <ExpandCard key={e.id} header={
          <>
            <Text style={s.expandDate}>{e.data}</Text>
            <Text style={s.expandMeta}>Hb: {e.hb} · Glicemia: {e.glicemia}</Text>
          </>
        }>
          <View style={s.expandGrid}>
            {[['Hemoglobina', e.hb], ['Glicemia jejum', e.glicemia], ['TSH', e.tsh]].map(([k, v]) => (
              <View key={k} style={s.expandField}>
                <Text style={s.expandKey}>{k}</Text>
                <Text style={s.expandVal}>{v || '—'}</Text>
              </View>
            ))}
          </View>
          {e.obs ? <Text style={s.expandObs}>{e.obs}</Text> : null}
        </ExpandCard>
      ))}

      <Sheet visible={modal} onClose={() => setModal(false)} title="Nova Coleta">
        <Field label="Data" value={data} onChange={setData} placeholder="ex: 15 Abr 2025" />
        <Row>
          <View style={{ flex: 1 }}><Field label="Hemoglobina" value={hb} onChange={setHb} placeholder="ex: 11,2 g/dL" /></View>
          <View style={{ flex: 1 }}><Field label="Glicemia jejum" value={glic} onChange={setGlic} placeholder="ex: 88 mg/dL" /></View>
        </Row>
        <Field label="TSH" value={tsh} onChange={setTsh} placeholder="ex: 2,1 uUI/mL" />
        <Field label="Observações" value={obs} onChange={setObs} multiline />
        <TouchableOpacity style={s.saveBtn} onPress={salvar}><Text style={s.saveBtnText}>Salvar</Text></TouchableOpacity>
      </Sheet>
    </ScrollView>
  );
}

// ── VACINAS TAB ───────────────────────────────────────────────────────────────

function VacinasTab() {
  const [list, setList] = useState<Vacina[]>(VACINAS_MOCK);
  const [modal, setModal] = useState(false);
  const [nome, setNome] = useState(''); const [data, setData] = useState('');
  const [dose, setDose] = useState(''); const [status, setStatus] = useState<Vacina['status']>('aplicada');

  useEffect(() => {
    storage.get<Vacina[]>(STORAGE_KEYS.vacinasMedico).then((v) => { if (v?.length) setList(v); });
  }, []);

  const salvar = async () => {
    if (!nome) return;
    const nova: Vacina = { id: Date.now(), nome, data, dose, status };
    const updated = [...list, nova];
    setList(updated); await storage.set(STORAGE_KEYS.vacinasMedico, updated);
    setModal(false); setNome(''); setData(''); setDose('');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      <View style={s.addRow}>
        <Text style={s.addRowLabel}>{list.length} vacina{list.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
          <Text style={s.addBtnText}>+ Registrar Vacina</Text>
        </TouchableOpacity>
      </View>

      <View style={s.vacinasCard}>
        {list.map((v, i) => {
          const { bg, color, label } = vacinaColor(v.status);
          return (
            <View key={v.id} style={[s.vacinaRow, i < list.length - 1 && s.vacinaRowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={s.vacinaNome}>{v.nome}</Text>
                <Text style={s.vacinaInfo}>{v.dose}{v.data !== '—' ? ` · ${v.data}` : ''}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: bg }]}>
                <Text style={[s.badgeText, { color }]}>{label}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <Sheet visible={modal} onClose={() => setModal(false)} title="Registrar Vacina">
        <Field label="Vacina" value={nome} onChange={setNome} placeholder="ex: dTpa" />
        <Row>
          <View style={{ flex: 1 }}><Field label="Data" value={data} onChange={setData} placeholder="ex: 10 Abr" /></View>
          <View style={{ flex: 1 }}><Field label="Dose" value={dose} onChange={setDose} placeholder="ex: 1ª dose" /></View>
        </Row>
        <Text style={s.fieldLabel}>Status</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['aplicada', 'agendada', 'nao'] as const).map((opt) => (
            <TouchableOpacity key={opt} style={[s.chip2, status === opt && s.chip2Active]} onPress={() => setStatus(opt)}>
              <Text style={[s.chip2Text, status === opt && s.chip2TextActive]}>
                {opt === 'aplicada' ? 'Aplicada' : opt === 'agendada' ? 'Agendada' : 'Não aplicada'}
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
  const [tab, setTab] = useState<Tab>('geral');
  const insets = useSafeAreaInsets();

  const renderTab = () => {
    switch (tab) {
      case 'geral': return <GeralTab />;
      case 'sinais': return <SinaisTab />;
      case 'consultas': return <ConsultasTab />;
      case 'usg': return <USGTab />;
      case 'exames': return <ExamesTab />;
      case 'vacinas': return <VacinasTab />;
    }
  };

  return (
    <View style={[s.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Maria da Silva" />
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

  // Tabs
  tabBar: { maxHeight: 52, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.07)' },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.full },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textInactive },
  tabTextActive: { color: colors.white },

  // Dark patient card
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

  // Info card (read view)
  infoCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  infoCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: colors.bg },
  infoCardTitle: { fontSize: 11, fontWeight: '800', color: colors.primaryDk, textTransform: 'uppercase', letterSpacing: 1 },
  editBtn: { backgroundColor: 'rgba(141,170,145,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  editBtnText: { fontSize: 12, fontWeight: '600', color: colors.primaryDk },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)', gap: 12 },
  infoKey: { fontSize: 12, color: colors.textInactive, fontWeight: '600', flexShrink: 0 },
  infoVal: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'right', flex: 1 },

  // Notes
  notasCard: { backgroundColor: '#FFFDF0', borderRadius: radius.md, padding: 16, borderLeftWidth: 3, borderLeftColor: colors.accent },
  notasTitle: { fontSize: 12, fontWeight: '600', color: colors.textMid, marginBottom: 10 },
  notasInput: { fontSize: 14, color: colors.text, minHeight: 100 },

  // Sections (for unused SectionCard)
  sectionWrap: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 10 },
  sectionCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },

  // Sheet / modal
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: '85%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.textInactive, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 16 },

  // Field
  fieldLabel: { fontSize: 11, fontWeight: '600', color: colors.textInactive, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  fieldInput: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 12, fontSize: 14, color: colors.text, marginBottom: 12 },

  // Buttons
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.full, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },

  // Add row
  addRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addRowLabel: { fontSize: 13, fontWeight: '700', color: colors.textMid },
  addBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },

  // Expandable card
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

  // Sinais vitais
  svTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  dataRow: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  dataVal: { fontSize: 16, fontWeight: '800', color: colors.text },
  dataUnit: { fontSize: 11, fontWeight: '500', color: colors.textMid },
  dataSub: { fontSize: 12, color: colors.textMid, marginTop: 2 },
  addRowBtn: { borderWidth: 1.5, borderColor: colors.accent, borderStyle: 'dashed', borderRadius: radius.md, padding: 12, alignItems: 'center', marginTop: 4 },
  addRowBtnText: { fontSize: 13, fontWeight: '700', color: colors.accent },

  // Badge
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Chips (modal)
  chip2: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.bg },
  chip2Active: { backgroundColor: colors.primary },
  chip2Text: { fontSize: 13, fontWeight: '600', color: colors.textMid },
  chip2TextActive: { color: colors.white },

  // Vacinas
  vacinasCard: { backgroundColor: colors.white, borderRadius: radius.md, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  vacinaRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  vacinaRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.bg },
  vacinaNome: { fontSize: 13, fontWeight: '700', color: colors.text },
  vacinaInfo: { fontSize: 11.5, color: colors.textMid, marginTop: 2 },
});
