# Primeira Consulta UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar as ferramentas do médico na primeira consulta: lista pré-definida de exames do 1º trimestre para solicitação em um toque, aba de prescrição de medicamentos no prontuário do médico, e cartão da gestante digital no app da paciente com tabela de evolução por consulta.

**Architecture:** Três features paralelas no app mobile + 1 endpoint novo na API. (1) Exames: UI sobre endpoints existentes — lista estática de exames no app, todos criados como `status: pending`. (2) Medicamentos: nova aba no `PacienteDetalheScreen` usando `POST /patients/{id}/medications` (já existe, só precisa de UI). (3) Cartão da gestante: novo endpoint `GET /patients/{id}/evolutions` + update no `ProntuarioScreen` da paciente.

**Tech Stack:** FastAPI + SQLAlchemy async (API) · React Native + TypeScript (app mobile)

---

## File Map

### API (`appclinica-api`)
| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `app/api/v1/appointments.py` | Modificar | Adicionar `GET /patients/{id}/evolutions` |
| `app/crud/appointment_evolution.py` | Modificar | Adicionar `get_patient_evolutions` |

### App Mobile (`appclinica`)
| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/services/medications.ts` | Modificar | Adicionar `create`, `update` |
| `src/services/appointments.ts` | Modificar | Adicionar `getPatientEvolutions` |
| `src/constants/index.ts` | Modificar | Adicionar lista `EXAMES_PRIMEIRO_TRIMESTRE` |
| `src/screens/doctor/PacienteDetalheScreen.tsx` | Modificar | ExamesTab com solicitação pré-definida + nova MedicamentosTab |
| `src/screens/patient/ProntuarioScreen.tsx` | Modificar | Tabela de evolução (cartão da gestante) |

---

## Task 1 — API: GET /patients/{id}/evolutions

**Files:**
- Modify: `appclinica-api/app/crud/appointment_evolution.py`
- Modify: `appclinica-api/app/api/v1/appointments.py`

- [ ] **Step 1: Adicionar `get_patient_evolutions` ao CRUD**

Adicionar ao final de `app/crud/appointment_evolution.py`:

```python
from typing import List
from sqlalchemy import asc

async def get_patient_evolutions(
    db: AsyncSession, patient_id: UUID
) -> List[AppointmentEvolution]:
    result = await db.execute(
        select(AppointmentEvolution)
        .where(
            AppointmentEvolution.patient_id == patient_id,
            AppointmentEvolution.deleted_at.is_(None),
        )
        .order_by(asc(AppointmentEvolution.created_at))
    )
    return list(result.scalars().all())
```

- [ ] **Step 2: Adicionar endpoint em `app/api/v1/appointments.py`**

Adicionar após os endpoints de evolution existentes:

```python
from typing import List as TypingList

@router.get(
    "/patients/{patient_id}/evolutions",
    response_model=TypingList[EvolutionResponse],
    tags=["appointments"],
)
async def list_patient_evolutions(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna todas as evoluções por consulta de uma gestante, em ordem cronológica."""
    from sqlalchemy.future import select as sa_select
    from app.models.user import Patient
    result = await db.execute(
        sa_select(Patient).where(Patient.id == patient_id, Patient.deleted_at.is_(None))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Patient not found")
    return await crud_evo.get_patient_evolutions(db, patient_id=patient_id)
```

- [ ] **Step 3: Testar**

```bash
BASE="http://localhost:8000/api/v1"
DT=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@gerarvida.com","password":"senha_segura123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
PID="651c6b0f-f23b-411d-b780-026c94455754"

curl -s "$BASE/patients/$PID/evolutions" -H "Authorization: Bearer $DT" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} evoluções | primeira: weight={d[0].get(\"weight_kg\")} au={d[0].get(\"fundal_height_cm\")}')"
```

Esperado: `1 evoluções | primeira: weight=63.50 au=28.0`

- [ ] **Step 4: Commit**

```bash
cd appclinica-api
git add app/crud/appointment_evolution.py app/api/v1/appointments.py
git commit -m "feat: endpoint GET /patients/{id}/evolutions"
```

---

## Task 2 — App: Services (Medications + Evolutions)

**Files:**
- Modify: `appclinica/src/services/medications.ts`
- Modify: `appclinica/src/services/appointments.ts`

- [ ] **Step 1: Adicionar `create` e `update` ao `medicationsService`**

Substituir o conteúdo de `src/services/medications.ts`:

```typescript
import { api } from './api';
import type { Medication, PaginatedResponse } from '../types';

export interface MedicationCreate {
  name: string;
  dosage: string;
  frequency: string;
  start_date: string;      // AAAA-MM-DD
  end_date?: string;       // AAAA-MM-DD, null = contínuo
  instructions?: string;
}

export interface MedicationUpdate {
  name?: string;
  dosage?: string;
  frequency?: string;
  end_date?: string;
  instructions?: string;
  active?: boolean;
}

export const medicationsService = {
  list: (
    patientId: string,
    params?: { active?: boolean; limit?: number; offset?: number },
  ) => {
    const qs = new URLSearchParams();
    if (params?.active !== undefined) qs.append('active', String(params.active));
    if (params?.limit !== undefined) qs.append('limit', String(params.limit));
    if (params?.offset !== undefined) qs.append('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<PaginatedResponse<Medication>>(
      `/patients/${patientId}/medications${query}`,
    );
  },

  create: (patientId: string, data: MedicationCreate) =>
    api.post<Medication>(`/patients/${patientId}/medications`, data),

  update: (medicationId: string, data: MedicationUpdate) =>
    api.patch<Medication>(`/patients/medications/${medicationId}`, data),
};
```

- [ ] **Step 2: Adicionar `getPatientEvolutions` ao `appointmentsService`**

Adicionar import de `AppointmentEvolution` se não existir, e adicionar ao objeto:

```typescript
  getPatientEvolutions: (patientId: string) =>
    api.get<AppointmentEvolution[]>(`/patients/${patientId}/evolutions`),
```

- [ ] **Step 3: Type check**

```bash
cd appclinica && npx tsc --noEmit 2>&1 | grep -v "GerarVida/"
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/services/medications.ts src/services/appointments.ts
git commit -m "feat: métodos create/update em medications e getPatientEvolutions"
```

---

## Task 3 — App: Exames pré-definidos + Aba Medicamentos no médico

**Files:**
- Modify: `appclinica/src/constants/index.ts`
- Modify: `appclinica/src/screens/doctor/PacienteDetalheScreen.tsx`

- [ ] **Step 1: Adicionar lista de exames em `src/constants/index.ts`**

Adicionar ao final do arquivo:

```typescript
export interface ExamPreset {
  name: string;
  type: string;
}

export const EXAMES_PRIMEIRO_TRIMESTRE: ExamPreset[] = [
  { name: 'Hemograma completo', type: 'blood' },
  { name: 'Tipagem sanguínea e Rh', type: 'blood' },
  { name: 'Glicemia de jejum', type: 'blood' },
  { name: 'VDRL (Sífilis)', type: 'serology' },
  { name: 'Anti-HIV 1 e 2', type: 'serology' },
  { name: 'Toxoplasmose IgG e IgM', type: 'serology' },
  { name: 'Rubéola IgG', type: 'serology' },
  { name: 'Hepatite B (HBsAg)', type: 'serology' },
  { name: 'Hepatite C (Anti-HCV)', type: 'serology' },
  { name: 'TSH (Tireoide)', type: 'blood' },
  { name: 'Urina tipo I', type: 'urine' },
  { name: 'Urocultura', type: 'urine' },
  { name: 'Parasitológico de fezes', type: 'other' },
];

export const EXAMES_SEGUNDO_TRIMESTRE: ExamPreset[] = [
  { name: 'Glicemia de jejum (2º tri)', type: 'blood' },
  { name: 'TOTG 75g (diabetes gestacional)', type: 'blood' },
  { name: 'Hemograma (2º tri)', type: 'blood' },
  { name: 'VDRL (2º tri)', type: 'serology' },
  { name: 'Urocultura (2º tri)', type: 'urine' },
];

export const EXAMES_TERCEIRO_TRIMESTRE: ExamPreset[] = [
  { name: 'Hemograma (3º tri)', type: 'blood' },
  { name: 'Coagulograma', type: 'blood' },
  { name: 'Estreptococo B (35-37 sem)', type: 'culture' },
  { name: 'VDRL (3º tri)', type: 'serology' },
  { name: 'Anti-HIV (3º tri)', type: 'serology' },
  { name: 'Urina tipo I (3º tri)', type: 'urine' },
];
```

- [ ] **Step 2: Atualizar o import do ExamesTab**

No topo de `PacienteDetalheScreen.tsx`, adicionar import:

```typescript
import { EXAMES_PRIMEIRO_TRIMESTRE, EXAMES_SEGUNDO_TRIMESTRE, EXAMES_TERCEIRO_TRIMESTRE } from '../../constants';
import { medicationsService, MedicationCreate } from '../../services/medications';
```

- [ ] **Step 3: Atualizar a lista de tabs**

Localizar `const TABS` e adicionar a aba de medicamentos:

```typescript
type Tab = 'geral' | 'anamnese' | 'sinais' | 'consultas' | 'usg' | 'exames' | 'vacinas' | 'meds';

const TABS: { key: Tab; label: string }[] = [
  { key: 'geral',      label: 'Geral' },
  { key: 'anamnese',   label: 'Anamnese' },
  { key: 'sinais',     label: 'Sinais Vitais' },
  { key: 'consultas',  label: 'Consultas' },
  { key: 'usg',        label: 'USG' },
  { key: 'exames',     label: 'Exames' },
  { key: 'vacinas',    label: 'Vacinas' },
  { key: 'meds',       label: 'Medicamentos' },
];
```

- [ ] **Step 4: Adicionar botão "Solicitar exames" ao ExamesTab**

Localizar `function ExamesTab` e adicionar estados:

```typescript
const [solicitarModal, setSolicitarModal] = useState(false);
const [selectedPresets, setSelectedPresets] = useState<Record<string, boolean>>({});
const [presetTrimestre, setPresetTrimestre] = useState<1 | 2 | 3>(1);
const [solicitando, setSolicitando] = useState(false);
```

Adicionar função de solicitar lote:

```typescript
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
        examsService.createLabTest(patientId, {
          name: p.name, type: p.type, date: today, status: 'pending',
        })
      )
    );
    // Recarrega lista
    const r = await examsService.listLabTests(patientId, { limit: 20 });
    setList(r.data);
    setSolicitarModal(false);
    setSelectedPresets({});
  } catch {}
  finally { setSolicitando(false); }
};
```

Adicionar botão "Solicitar" ao header do ExamesTab (na View `s.addRow`):

```typescript
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
```

Adicionar Sheet de solicitação antes do `</ScrollView>` final do ExamesTab:

```typescript
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
    <TouchableOpacity
      key={p.name}
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
    onPress={solicitarLote} disabled={solicitando}>
    <Text style={s.saveBtnText}>
      {solicitando ? 'Solicitando...' : `Solicitar ${Object.values(selectedPresets).filter(Boolean).length} exame(s)`}
    </Text>
  </TouchableOpacity>
</Sheet>
```

- [ ] **Step 5: Criar MedicamentosTab**

Adicionar antes de `// ── MAIN SCREEN`:

```typescript
// ── MEDICAMENTOS TAB ──────────────────────────────────────────────────────────

function MedicamentosTab({ patientId }: { patientId: string }) {
  const [list, setList] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MedicationCreate>({
    name: '', dosage: '', frequency: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: undefined, instructions: '',
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
      const novo = await medicationsService.create(patientId, {
        ...form,
        end_date: form.end_date || undefined,
        instructions: form.instructions || undefined,
      });
      setList((prev) => [novo, ...prev]);
      setModal(false);
      setForm({ name: '', dosage: '', frequency: '', start_date: new Date().toISOString().split('T')[0], end_date: undefined, instructions: '' });
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
            <Text style={s.dataSub}>Início: {formatDate(m.start_date)}{m.end_date ? ` · Fim: ${formatDate(m.end_date)}` : ' · Uso contínuo'}</Text>
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
          onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="ex: Ácido fólico 5mg" />
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="Dosagem" value={form.dosage}
              onChange={(v) => setForm((f) => ({ ...f, dosage: v }))} placeholder="ex: 5mg" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Frequência" value={form.frequency}
              onChange={(v) => setForm((f) => ({ ...f, frequency: v }))} placeholder="ex: 1x ao dia" />
          </View>
        </Row>
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="Início (AAAA-MM-DD)" value={form.start_date}
              onChange={(v) => setForm((f) => ({ ...f, start_date: v }))} placeholder="2026-05-29" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Fim (vazio = contínuo)" value={form.end_date ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, end_date: v || undefined }))} placeholder="opcional" />
          </View>
        </Row>
        <Field label="Instruções" value={form.instructions ?? ''}
          onChange={(v) => setForm((f) => ({ ...f, instructions: v }))}
          multiline placeholder="ex: Tomar em jejum, longe do ferro" />
        <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={salvar} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? 'Salvando...' : 'Prescrever'}</Text>
        </TouchableOpacity>
      </Sheet>
    </ScrollView>
  );
}
```

- [ ] **Step 6: Renderizar a nova aba no switch de tabs**

Adicionar no bloco de renderização das tabs:

```typescript
{activeTab === 'meds' && <MedicamentosTab patientId={patientId} />}
```

- [ ] **Step 7: Type check e commit**

```bash
cd appclinica && npx tsc --noEmit 2>&1 | grep -v "GerarVida/"
git add src/constants/index.ts src/services/medications.ts src/services/appointments.ts \
        src/screens/doctor/PacienteDetalheScreen.tsx
git commit -m "feat: exames pré-definidos por trimestre + aba Medicamentos no médico"
```

---

## Task 4 — App: Cartão da Gestante no ProntuarioScreen

**Files:**
- Modify: `appclinica/src/screens/patient/ProntuarioScreen.tsx`

- [ ] **Step 1: Ler o ProntuarioScreen atual**

```bash
cat appclinica/src/screens/patient/ProntuarioScreen.tsx
```

Identificar onde os dados são carregados e o que já é exibido.

- [ ] **Step 2: Adicionar busca de evoluções ao useEffect**

Localizar o `useEffect` que carrega os dados e adicionar:

```typescript
import { appointmentsService } from '../services/appointments';
import type { AppointmentEvolution } from '../types';

// Dentro do componente:
const [evolutions, setEvolutions] = useState<AppointmentEvolution[]>([]);
```

No `useEffect`, adicionar `appointmentsService.getPatientEvolutions(patientId)` ao `Promise.all` existente.

- [ ] **Step 3: Adicionar tabela de evolução ao render**

Após a seção de dados clínicos existente, adicionar:

```typescript
{evolutions.length > 0 && (
  <View style={{ marginTop: 20 }}>
    <Text style={styles.sectionTitle}>Evolução das Consultas</Text>
    {/* Header */}
    <View style={{ flexDirection: 'row', backgroundColor: colors.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 4 }}>
      {['Data', 'IG', 'Peso', 'PA', 'AU', 'BCF'].map((h) => (
        <Text key={h} style={{ flex: h === 'Data' ? 1.5 : 1, fontSize: 10, fontWeight: '700', color: colors.primaryDk, textAlign: 'center' }}>{h}</Text>
      ))}
    </View>
    {evolutions.map((evo) => (
      <View key={evo.id} style={{ flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
        <Text style={{ flex: 1.5, fontSize: 11, color: colors.text, textAlign: 'center' }}>
          {new Date(evo.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
        </Text>
        <Text style={{ flex: 1, fontSize: 11, color: colors.text, textAlign: 'center' }}>—</Text>
        <Text style={{ flex: 1, fontSize: 11, color: colors.text, textAlign: 'center' }}>
          {evo.weight_kg ? `${evo.weight_kg}kg` : '—'}
        </Text>
        <Text style={{ flex: 1, fontSize: 11, color: colors.text, textAlign: 'center' }}>
          {evo.bp_systolic && evo.bp_diastolic ? `${evo.bp_systolic}/${evo.bp_diastolic}` : '—'}
        </Text>
        <Text style={{ flex: 1, fontSize: 11, color: colors.text, textAlign: 'center' }}>
          {evo.fundal_height_cm ? `${evo.fundal_height_cm}cm` : '—'}
        </Text>
        <Text style={{ flex: 1, fontSize: 11, color: colors.text, textAlign: 'center' }}>
          {evo.fetal_heart_rate ? `${evo.fetal_heart_rate}` : '—'}
        </Text>
      </View>
    ))}
  </View>
)}
```

- [ ] **Step 4: Precisamos do patientId na ProntuarioScreen**

A `ProntuarioScreen` da paciente precisa saber o `patient_id` para buscar as evoluções. Verificar se ela já tem acesso ao `patient_id` via `AuthContext` ou `storage`. Se não tiver:

```typescript
// No AuthContext o user tem id (user_id)
// Buscar patient_id via getPatient(user.id) não existe — 
// mas o prontuário retorna patient_id no campo patient_id
// Usar prontuario.patient_id após o load
```

Após carregar o prontuário (`setProntuario(pr)`), buscar evoluções:

```typescript
.then(([pr, ...resto]) => {
  setProntuario(pr);
  if (pr.patient_id) {
    appointmentsService.getPatientEvolutions(pr.patient_id)
      .then(setEvolutions)
      .catch(() => {});
  }
})
```

- [ ] **Step 5: Testar no simulador**

1. Login como paciente → navegar para "Prontuário"
2. Verificar que a tabela de evolução aparece com os dados da consulta registrada pelo médico
3. Confirmar colunas: Data, IG (—), Peso, PA, AU, BCF

- [ ] **Step 6: Commit**

```bash
cd appclinica
git add src/screens/patient/ProntuarioScreen.tsx
git commit -m "feat: tabela de evolução por consulta no cartão da gestante"
```

---

## Self-Review

**Spec coverage:**
- ✅ Lista pré-definida do 1º, 2º e 3º trimestre com checkboxes — Task 3
- ✅ Criação em lote como `status: pending` — Task 3
- ✅ Aba Medicamentos no médico com prescrição e toggle ativo/inativo — Task 3
- ✅ Cartão da gestante com tabela de evolução cronológica — Tasks 1 + 4
- ✅ Endpoint `GET /patients/{id}/evolutions` ordenado por data — Task 1

**Dependências:**
- Task 2 depende de Task 1 (service `getPatientEvolutions` usa o novo endpoint)
- Task 3 é independente (usa APIs existentes)
- Task 4 depende de Task 2 (ProntuarioScreen usa `getPatientEvolutions`)
