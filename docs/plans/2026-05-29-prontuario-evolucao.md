# Prontuário Completo & Evolução por Consulta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o médico preencha a ficha de admissão completa da paciente (cartão de gestante) e registre a evolução clínica em cada consulta (peso, AU, BCF, edema, apresentação, PA).

**Architecture:** Duas fases independentes. Fase 1 — ficha de admissão: o endpoint `PUT /patients/{id}/prontuario` já existe; basta adicionar os campos faltantes no schema e construir o formulário no app. Fase 2 — evolução por consulta: nova tabela `appointment_evolutions` com relacionamento 1:1 com `appointments`, novos endpoints REST e novo formulário no app dentro da aba Consultas do PacienteDetalheScreen.

**Tech Stack:** FastAPI + SQLAlchemy async + Alembic (API) · React Native + TypeScript (app mobile)

---

## File Map

### API (`appclinica-api`)
| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `app/schemas/user.py` | Modificar | Adicionar `lmp_date`, `edd` ao `PatientUpdate` |
| `app/models/appointment_evolution.py` | Criar | Model SQLAlchemy `AppointmentEvolution` |
| `app/schemas/appointment_evolution.py` | Criar | Schemas Pydantic Create/Response |
| `app/crud/appointment_evolution.py` | Criar | Upsert e get de evolução |
| `app/api/v1/appointments.py` | Criar | Endpoints POST/GET/PUT `/appointments/{id}/evolution` |
| `app/api/v1/router.py` | Modificar | Registrar router de appointments |
| `alembic/versions/a2b3c4d5e6f7_add_appointment_evolutions.py` | Criar | Migration da nova tabela |
| `app/models/__init__.py` | Modificar | Exportar `AppointmentEvolution` |

### App Mobile (`appclinica`)
| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/types/index.ts` | Modificar | Adicionar `AppointmentEvolution`, `EvolutionCreate`, `EdemaGrade` |
| `src/services/patients.ts` | Modificar | Adicionar `lmp_date`, `edd` ao `PatientUpdate` interface |
| `src/services/appointments.ts` | Modificar | Adicionar `saveEvolution`, `getEvolution` |
| `src/screens/doctor/PacienteDetalheScreen.tsx` | Modificar | EditForm no GeralTab + EvolutionSheet no ConsultasTab |

---

## Task 1 — API: Adicionar `lmp_date` e `edd` ao PatientUpdate

**Files:**
- Modify: `appclinica-api/app/schemas/user.py`
- Modify: `appclinica-api/app/crud/patient.py`

- [ ] **Step 1: Abrir `app/schemas/user.py` e adicionar campos ao `PatientUpdate`**

Localizar a classe `PatientUpdate` (linha ~52) e substituir por:

```python
class PatientUpdate(CoreModel):
    height_cm: Optional[str] = Field(None, examples=["165"])
    weight_initial_kg: Optional[str] = Field(None, examples=["62.5"])
    imc: Optional[str] = Field(None, examples=["22.9"])
    blood_type: Optional[str] = Field(None, examples=["O+"])
    acompanhante: Optional[str] = Field(None, examples=["João da Silva"])
    hospital: Optional[str] = Field(None, examples=["Hospital Maternidade Santa Joana"])
    risk_level: Optional[str] = Field(None, examples=["low"])
    number_of_fetuses: Optional[int] = Field(None, examples=[1])
    parity: Optional[str] = Field(None, examples=["G1P0"])
    cesarean_predicted: Optional[bool] = Field(None, examples=[False])
    lmp_date: Optional[dt.date] = Field(None, description="Data da Última Menstruação (correção)", examples=["2023-11-01"])
    edd: Optional[dt.date] = Field(None, description="Data Provável do Parto (correção)", examples=["2024-08-07"])
```

- [ ] **Step 2: Verificar `app/crud/patient.py` — função `update_patient`**

Localizar `update_patient` e confirmar que usa `model_dump(exclude_unset=True)`. Se não existir, adicionar:

```python
async def update_patient(db: AsyncSession, patient: Patient, obj_in: PatientUpdate) -> Patient:
    data = obj_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(patient, field, value)
    await db.commit()
    await db.refresh(patient)
    return patient
```

- [ ] **Step 3: Testar via curl**

```bash
BASE="http://localhost:8000/api/v1"
TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@gerarvida.com","password":"senha_segura123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -s -X PUT "$BASE/patients/651c6b0f-f23b-411d-b780-026c94455754/prontuario" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"parity":"G1P0","number_of_fetuses":1,"cesarean_predicted":false,"lmp_date":"2023-11-01","edd":"2024-08-07"}' \
  | python3 -m json.tool | grep -E "parity|number_of_fetuses|cesarean|lmp|edd"
```

Esperado: campos atualizados no response.

- [ ] **Step 4: Commit**

```bash
cd appclinica-api
git add app/schemas/user.py app/crud/patient.py
git commit -m "feat: adiciona lmp_date e edd ao PatientUpdate"
```

---

## Task 2 — API: Model e Migration `appointment_evolutions`

**Files:**
- Create: `appclinica-api/app/models/appointment_evolution.py`
- Create: `appclinica-api/alembic/versions/a2b3c4d5e6f7_add_appointment_evolutions.py`
- Modify: `appclinica-api/app/models/__init__.py`

- [ ] **Step 1: Criar `app/models/appointment_evolution.py`**

```python
from sqlalchemy import Column, ForeignKey, SmallInteger, Numeric, Boolean, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.enums import FetalPresentation


class AppointmentEvolution(BaseModel):
    __tablename__ = 'appointment_evolutions'

    appointment_id = Column(
        ForeignKey('appointments.id', ondelete='CASCADE'),
        unique=True, nullable=False,
    )
    patient_id = Column(
        ForeignKey('patients.id', ondelete='CASCADE'),
        nullable=False,
    )

    weight_kg = Column(Numeric(5, 2), nullable=True)
    fundal_height_cm = Column(Numeric(4, 1), nullable=True)
    fetal_heart_rate = Column(SmallInteger, nullable=True)
    presentation = Column(SQLEnum(FetalPresentation, create_type=False), nullable=True)
    fetal_movements = Column(Boolean, nullable=True)
    edema = Column(String(5), nullable=True)   # 'none' | '+' | '++' | '+++'
    bp_systolic = Column(SmallInteger, nullable=True)
    bp_diastolic = Column(SmallInteger, nullable=True)
    clinical_notes = Column(Text, nullable=True)

    appointment = relationship("Appointment")
    patient = relationship("Patient")
```

- [ ] **Step 2: Adicionar ao `app/models/__init__.py`**

Abrir o arquivo e adicionar a linha:

```python
from app.models.appointment_evolution import AppointmentEvolution  # noqa: F401
```

- [ ] **Step 3: Criar a migration**

```bash
cd appclinica-api
docker exec lunna_api alembic revision --autogenerate -m "add_appointment_evolutions"
```

Abrir o arquivo gerado em `alembic/versions/` e verificar que o `upgrade()` tem:

```python
def upgrade() -> None:
    op.create_table(
        'appointment_evolutions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('appointment_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('weight_kg', sa.Numeric(5, 2), nullable=True),
        sa.Column('fundal_height_cm', sa.Numeric(4, 1), nullable=True),
        sa.Column('fetal_heart_rate', sa.SmallInteger(), nullable=True),
        sa.Column('presentation', postgresql.ENUM('cephalic','breech','transverse',
                  name='fetalpresentation', create_type=False), nullable=True),
        sa.Column('fetal_movements', sa.Boolean(), nullable=True),
        sa.Column('edema', sa.String(5), nullable=True),
        sa.Column('bp_systolic', sa.SmallInteger(), nullable=True),
        sa.Column('bp_diastolic', sa.SmallInteger(), nullable=True),
        sa.Column('clinical_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('appointment_id'),
    )
```

- [ ] **Step 4: Rodar a migration**

```bash
docker exec lunna_api alembic upgrade heads
```

Esperado: `Running upgrade ... -> ..., add_appointment_evolutions`

- [ ] **Step 5: Commit**

```bash
git add app/models/appointment_evolution.py app/models/__init__.py alembic/versions/
git commit -m "feat: model e migration appointment_evolutions"
```

---

## Task 3 — API: Schema, CRUD e Endpoints de Evolução

**Files:**
- Create: `appclinica-api/app/schemas/appointment_evolution.py`
- Create: `appclinica-api/app/crud/appointment_evolution.py`
- Create: `appclinica-api/app/api/v1/appointments.py`
- Modify: `appclinica-api/app/api/v1/router.py`

- [ ] **Step 1: Criar `app/schemas/appointment_evolution.py`**

```python
from typing import Optional
from uuid import UUID
from decimal import Decimal
from app.schemas.base import CoreModel, BaseEntitySchema
from app.models.enums import FetalPresentation


class EvolutionBase(CoreModel):
    weight_kg: Optional[Decimal] = None
    fundal_height_cm: Optional[Decimal] = None
    fetal_heart_rate: Optional[int] = None
    presentation: Optional[FetalPresentation] = None
    fetal_movements: Optional[bool] = None
    edema: Optional[str] = None
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    clinical_notes: Optional[str] = None


class EvolutionCreate(EvolutionBase):
    pass


class EvolutionResponse(EvolutionBase, BaseEntitySchema):
    appointment_id: UUID
    patient_id: UUID
```

- [ ] **Step 2: Criar `app/crud/appointment_evolution.py`**

```python
from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.appointment_evolution import AppointmentEvolution
from app.schemas.appointment_evolution import EvolutionCreate


async def get_evolution(
    db: AsyncSession, appointment_id: UUID
) -> Optional[AppointmentEvolution]:
    result = await db.execute(
        select(AppointmentEvolution).where(
            AppointmentEvolution.appointment_id == appointment_id,
            AppointmentEvolution.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def upsert_evolution(
    db: AsyncSession,
    appointment_id: UUID,
    patient_id: UUID,
    obj_in: EvolutionCreate,
) -> AppointmentEvolution:
    existing = await get_evolution(db, appointment_id)
    if existing:
        for field, value in obj_in.model_dump(exclude_unset=True).items():
            setattr(existing, field, value)
        await db.commit()
        await db.refresh(existing)
        return existing

    evo = AppointmentEvolution(
        appointment_id=appointment_id,
        patient_id=patient_id,
        **obj_in.model_dump(exclude_unset=True),
    )
    db.add(evo)
    await db.commit()
    await db.refresh(evo)
    return evo
```

- [ ] **Step 3: Criar `app/api/v1/appointments.py`**

```python
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, get_current_user
from app.crud import appointment_evolution as crud_evo
from app.crud import patient as crud_patient
from app.models.user import User
from app.models.appointments import Appointment
from app.schemas.appointment_evolution import EvolutionCreate, EvolutionResponse
from sqlalchemy.future import select

router = APIRouter()


async def _get_appointment_or_404(db: AsyncSession, appointment_id: UUID) -> Appointment:
    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.deleted_at.is_(None),
        )
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt


@router.get(
    "/appointments/{appointment_id}/evolution",
    response_model=EvolutionResponse,
    tags=["appointments"],
)
async def get_evolution(
    appointment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appt = await _get_appointment_or_404(db, appointment_id)
    evo = await crud_evo.get_evolution(db, appointment_id=appt.id)
    if not evo:
        raise HTTPException(status_code=404, detail="Evolution not found")
    return evo


@router.post(
    "/appointments/{appointment_id}/evolution",
    response_model=EvolutionResponse,
    tags=["appointments"],
)
async def upsert_evolution(
    appointment_id: UUID,
    obj_in: EvolutionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appt = await _get_appointment_or_404(db, appointment_id)
    return await crud_evo.upsert_evolution(
        db,
        appointment_id=appt.id,
        patient_id=appt.patient_id,
        obj_in=obj_in,
    )
```

- [ ] **Step 4: Registrar o router em `app/api/v1/router.py`**

Abrir `router.py` e adicionar:

```python
from app.api.v1 import appointments
api_router.include_router(appointments.router, tags=["appointments"])
```

- [ ] **Step 5: Testar endpoints**

```bash
BASE="http://localhost:8000/api/v1"
DT=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@gerarvida.com","password":"senha_segura123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

APPT_ID="f1277fb1-46b6-485c-88fd-acd78c94bb16"

# POST — criar evolução
curl -s -X POST "$BASE/appointments/$APPT_ID/evolution" \
  -H "Authorization: Bearer $DT" \
  -H "Content-Type: application/json" \
  -d '{"weight_kg":63.5,"fundal_height_cm":28.0,"fetal_heart_rate":148,"presentation":"cephalic","fetal_movements":true,"edema":"none","bp_systolic":110,"bp_diastolic":70,"clinical_notes":"Evolução sem intercorrências."}' \
  | python3 -m json.tool

# GET — buscar evolução
curl -s "$BASE/appointments/$APPT_ID/evolution" \
  -H "Authorization: Bearer $DT" \
  | python3 -m json.tool
```

Esperado: 200 com todos os campos preenchidos nos dois casos.

- [ ] **Step 6: Commit**

```bash
git add app/schemas/appointment_evolution.py app/crud/appointment_evolution.py \
        app/api/v1/appointments.py app/api/v1/router.py
git commit -m "feat: endpoints POST/GET /appointments/{id}/evolution"
```

---

## Task 4 — App: Tipos e Services

**Files:**
- Modify: `appclinica/src/types/index.ts`
- Modify: `appclinica/src/services/patients.ts`
- Modify: `appclinica/src/services/appointments.ts`

- [ ] **Step 1: Adicionar tipos em `src/types/index.ts`**

Localizar a seção de tipos e adicionar:

```typescript
export type EdemaGrade = 'none' | '+' | '++' | '+++';

export interface EvolutionCreate {
  weight_kg?: number;
  fundal_height_cm?: number;
  fetal_heart_rate?: number;
  presentation?: 'cephalic' | 'breech' | 'transverse';
  fetal_movements?: boolean;
  edema?: EdemaGrade;
  bp_systolic?: number;
  bp_diastolic?: number;
  clinical_notes?: string;
}

export interface AppointmentEvolution extends EvolutionCreate {
  id: string;
  appointment_id: string;
  patient_id: string;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Atualizar `PatientUpdate` em `src/services/patients.ts`**

Localizar a interface `PatientUpdate` (linha ~68) e adicionar:

```typescript
interface PatientUpdate {
  height_cm?: string;
  weight_initial_kg?: string;
  imc?: string;
  blood_type?: string;
  acompanhante?: string;
  hospital?: string;
  risk_level?: RiskLevel;
  number_of_fetuses?: number;
  parity?: string;
  cesarean_predicted?: boolean;
  lmp_date?: string;   // AAAA-MM-DD
  edd?: string;        // AAAA-MM-DD
}
```

- [ ] **Step 3: Adicionar métodos de evolução em `src/services/appointments.ts`**

```typescript
import type { AppointmentEvolution, EvolutionCreate } from '../types';

// Adicionar ao objeto appointmentsService:
  saveEvolution: (appointmentId: string, data: EvolutionCreate) =>
    api.post<AppointmentEvolution>(`/appointments/${appointmentId}/evolution`, data),

  getEvolution: (appointmentId: string) =>
    api.get<AppointmentEvolution>(`/appointments/${appointmentId}/evolution`),
```

- [ ] **Step 4: Commit**

```bash
cd appclinica
git add src/types/index.ts src/services/patients.ts src/services/appointments.ts
git commit -m "feat: tipos e services para prontuario e evolução"
```

---

## Task 5 — App: Formulário de Edição do Prontuário (GeralTab)

**Files:**
- Modify: `appclinica/src/screens/doctor/PacienteDetalheScreen.tsx`

- [ ] **Step 1: Adicionar estado de edição ao `GeralTab`**

Localizar `function GeralTab({ patientId })` e adicionar estados de form logo após os estados existentes:

```typescript
const [editModal, setEditModal] = useState(false);
const [form, setForm] = useState({
  height_cm: '', weight_initial_kg: '', blood_type: '',
  parity: '', acompanhante: '', hospital: '',
  number_of_fetuses: '1', cesarean_predicted: false,
  risk_level: 'low' as RiskLevel,
  lmp_date: '', edd: '',
});
const [saving, setSaving] = useState(false);
```

- [ ] **Step 2: Preencher form quando dados carregam**

Dentro do `.then([pt, pr, nota]) =>` existente, adicionar após `setProntuario(pr)`:

```typescript
setForm({
  height_cm: pt.height_cm ?? '',
  weight_initial_kg: pt.weight_initial_kg ?? '',
  blood_type: pt.blood_type ?? '',
  parity: pt.prontuario ?? '',   // parity vem de PatientDetail — adicionar ao tipo se não existir
  acompanhante: '',
  hospital: pt.hospital ?? '',
  number_of_fetuses: '1',
  cesarean_predicted: false,
  risk_level: (pt.risk_level as RiskLevel) ?? 'low',
  lmp_date: pr?.lmp_date ?? '',
  edd: pr?.edd ?? '',
});
```

- [ ] **Step 3: Função de salvar**

Adicionar antes do `return`:

```typescript
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
    // recarga dos dados
    const [pt, pr] = await Promise.all([
      patientsService.getPatient(patientId),
      patientsService.getProntuario(patientId),
    ]);
    setPatient(pt);
    setProntuario(pr);
    setEditModal(false);
  } catch {}
  finally { setSaving(false); }
};
```

- [ ] **Step 4: Botão "Editar" no card do prontuário**

Localizar `<View style={s.infoCardHeader}>` dentro do bloco do Prontuário e adicionar botão:

```typescript
<View style={s.infoCardHeader}>
  <Text style={s.infoCardTitle}>Prontuário</Text>
  <TouchableOpacity onPress={() => setEditModal(true)}>
    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Editar</Text>
  </TouchableOpacity>
</View>
```

- [ ] **Step 5: Sheet de edição**

Adicionar antes do `</ScrollView>` final do GeralTab:

```typescript
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
```

- [ ] **Step 6: Testar no simulador**

1. Login como doctor → MedicoPacientes → selecionar Maria da Silva
2. Aba "Geral" → tocar "Editar"
3. Preencher paridade "G2P1A0", risco "medium", hospital "Hospital Einstein"
4. Salvar → confirmar que os dados atualizaram no card

- [ ] **Step 7: Commit**

```bash
git add src/screens/doctor/PacienteDetalheScreen.tsx
git commit -m "feat: formulário de edição do prontuário no GeralTab"
```

---

## Task 6 — App: Formulário de Evolução por Consulta (ConsultasTab)

**Files:**
- Modify: `appclinica/src/screens/doctor/PacienteDetalheScreen.tsx`

- [ ] **Step 1: Adicionar tipos de estado ao `ConsultasTab`**

Localizar `function ConsultasTab({ patientId })` e adicionar após os estados existentes:

```typescript
const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
const [evoForm, setEvoForm] = useState({
  weight_kg: '', fundal_height_cm: '', fetal_heart_rate: '',
  presentation: '' as '' | 'cephalic' | 'breech' | 'transverse',
  fetal_movements: true,
  edema: 'none' as EdemaGrade,
  bp_systolic: '', bp_diastolic: '',
  clinical_notes: '',
});
const [evoLoading, setEvoLoading] = useState(false);
const [evoSaving, setEvoSaving] = useState(false);
```

- [ ] **Step 2: Função para abrir sheet com evolução existente**

```typescript
const openEvolution = async (appt: Appointment) => {
  setSelectedAppt(appt);
  setEvoLoading(true);
  try {
    const evo = await appointmentsService.getEvolution(appt.id);
    setEvoForm({
      weight_kg: evo.weight_kg ? String(evo.weight_kg) : '',
      fundal_height_cm: evo.fundal_height_cm ? String(evo.fundal_height_cm) : '',
      fetal_heart_rate: evo.fetal_heart_rate ? String(evo.fetal_heart_rate) : '',
      presentation: evo.presentation ?? '',
      fetal_movements: evo.fetal_movements ?? true,
      edema: (evo.edema as EdemaGrade) ?? 'none',
      bp_systolic: evo.bp_systolic ? String(evo.bp_systolic) : '',
      bp_diastolic: evo.bp_diastolic ? String(evo.bp_diastolic) : '',
      clinical_notes: evo.clinical_notes ?? '',
    });
  } catch {
    // evolução ainda não existe — form vazio OK
    setEvoForm({
      weight_kg: '', fundal_height_cm: '', fetal_heart_rate: '',
      presentation: '', fetal_movements: true, edema: 'none',
      bp_systolic: '', bp_diastolic: '', clinical_notes: '',
    });
  } finally {
    setEvoLoading(false);
  }
};
```

- [ ] **Step 3: Função de salvar evolução**

```typescript
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
    });
    setSelectedAppt(null);
  } catch {}
  finally { setEvoSaving(false); }
};
```

- [ ] **Step 4: Tornar os cards de consulta clicáveis**

Localizar o `{consultas.map((c) =>` e envolver o `ExpandCard` com `TouchableOpacity`:

```typescript
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
```

- [ ] **Step 5: Sheet de evolução**

Adicionar após o último `</ScrollView>` do ConsultasTab:

```typescript
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
          <Field label="PA (sistólica)" value={evoForm.bp_systolic}
            onChange={(v) => setEvoForm((f) => ({ ...f, bp_systolic: v }))} placeholder="110" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="PA (diastólica)" value={evoForm.bp_diastolic}
            onChange={(v) => setEvoForm((f) => ({ ...f, bp_diastolic: v }))} placeholder="70" />
        </View>
      </Row>
      <Text style={s.fieldLabel}>Apresentação fetal</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {([['', 'N/A'], ['cephalic', 'Cefálica'], ['breech', 'Pélvica'], ['transverse', 'Transversa']] as const).map(([val, label]) => (
          <TouchableOpacity
            key={val}
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
          <TouchableOpacity
            key={g}
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
          <TouchableOpacity
            key={String(v)}
            style={[s.chip2, evoForm.fetal_movements === v && s.chip2Active]}
            onPress={() => setEvoForm((f) => ({ ...f, fetal_movements: v }))}
          >
            <Text style={[s.chip2Text, evoForm.fetal_movements === v && s.chip2TextActive]}>
              {v ? 'Presentes' : 'Ausentes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Field label="Notas clínicas" value={evoForm.clinical_notes}
        onChange={(v) => setEvoForm((f) => ({ ...f, clinical_notes: v }))}
        multiline placeholder="Evolução sem intercorrências..." />
      <TouchableOpacity style={[s.saveBtn, evoSaving && { opacity: 0.6 }]} onPress={salvarEvo} disabled={evoSaving}>
        <Text style={s.saveBtnText}>{evoSaving ? 'Salvando...' : 'Salvar Evolução'}</Text>
      </TouchableOpacity>
    </>
  )}
</Sheet>
```

- [ ] **Step 6: Testar no simulador**

1. Login como doctor → selecionar paciente → aba "Consultas"
2. Tocar em uma consulta → sheet abre
3. Preencher: Peso 64.2, AU 28, BCF 152, PA 110/70, apresentação Cefálica, edema Sem, notas "Paciente refere bem-estar."
4. Salvar → fechar sheet
5. Tocar na mesma consulta novamente → confirmar que os dados foram carregados

- [ ] **Step 7: Commit**

```bash
git add src/screens/doctor/PacienteDetalheScreen.tsx
git commit -m "feat: formulário de evolução por consulta no ConsultasTab"
```

---

## Self-Review

**Spec coverage:**
- ✅ Ficha de admissão: `lmp_date`, `edd`, `parity`, `number_of_fetuses`, `cesarean_predicted`, `acompanhante`, `hospital`, `risk_level`, `height_cm`, `weight_initial_kg`, `blood_type` — cobertos nas Tasks 1 e 5
- ✅ Evolução por consulta: peso, AU, BCF, edema, apresentação, movimentos fetais, PA, notas — cobertos nas Tasks 2, 3 e 6
- ✅ API: schema, CRUD, endpoints, migration — Tasks 1–3
- ✅ App: tipos, services, UI — Tasks 4–6

**Dependências entre tasks:**
- Task 2 depende de Task 1 (migration referencia model)
- Task 3 depende de Task 2 (endpoints usam model)
- Task 4 depende de Task 1 e 3 (tipos e services seguem o schema da API)
- Task 5 depende de Task 4
- Task 6 depende de Task 4
