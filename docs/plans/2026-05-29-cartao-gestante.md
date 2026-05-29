# Cartão da Gestante Customizável — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o médico configure um template padrão de cartão da gestante (seções, ordem, visibilidade) nas configurações, e preencha o conteúdo por paciente ao abrir o prontuário — com seções built-in que puxam dados automaticamente e seções customizadas de texto livre ou campos label+valor.

**Architecture:** Dois níveis: (1) `doctor_card_sections` guarda o template do médico — estrutura, ordem, visibilidade; (2) `patient_card_entries` e `patient_card_field_values` guardam o conteúdo específico por paciente. O endpoint `GET /patients/{id}/card` mescla template + dados automáticos de seções built-in + conteúdo por paciente num único response. No app, uma tela de configurações para o médico montar o template e uma tela de cartão por paciente para preencher.

**Tech Stack:** FastAPI + SQLAlchemy async + Alembic · React Native + TypeScript · mesmo padrão de todos os outros módulos do projeto

---

## File Map

### API (`appclinica-api`)
| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `app/models/card.py` | Criar | 3 models: DoctorCardSection, PatientCardEntry, PatientCardFieldValue |
| `app/models/__init__.py` | Modificar | Exportar os 3 novos models |
| `app/schemas/card.py` | Criar | Schemas Create/Update/Response para template e cartão |
| `app/crud/card.py` | Criar | CRUD template + conteúdo + render completo do cartão |
| `app/api/v1/card.py` | Criar | Endpoints de template e cartão |
| `app/api/v1/router.py` | Modificar | Registrar card router |
| `alembic/versions/e5f6a7b8c9d0_add_card_tables.py` | Criar | Migration das 3 tabelas |

### App Mobile (`appclinica`)
| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/types/index.ts` | Modificar | Tipos CardSection, PatientCard, CardEntry, CardFieldValue |
| `src/services/card.ts` | Criar | getTemplate, addSection, updateSection, moveSection, deleteSection, getPatientCard, saveEntry |
| `src/navigation/DoctorNavigator.tsx` | Modificar | Rotas PatientCard e CardTemplate |
| `src/screens/doctor/DoctorCardTemplateScreen.tsx` | Criar | Tela de configuração do template (settings) |
| `src/screens/doctor/PatientCardScreen.tsx` | Criar | Tela de visualização/edição do cartão por paciente |
| `src/screens/doctor/DashboardMedicoScreen.tsx` | Modificar | Botão de settings (⚙) que navega para CardTemplate |
| `src/screens/doctor/PacienteDetalheScreen.tsx` | Modificar | Card preview no GeralTab + botão "Ver Cartão" |

---

## Task 1 — API: Models e Migration

**Files:**
- Create: `appclinica-api/app/models/card.py`
- Modify: `appclinica-api/app/models/__init__.py`
- Create: migration via alembic

- [ ] **Step 1: Criar `app/models/card.py`**

```python
from sqlalchemy import Column, ForeignKey, String, Text, Integer, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class DoctorCardSection(BaseModel):
    """Template do médico — define estrutura, ordem e visibilidade do cartão."""
    __tablename__ = 'doctor_card_sections'

    doctor_id = Column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(100), nullable=False)
    section_type = Column(String(20), nullable=False)   # 'builtin' | 'text' | 'fields'
    builtin_key = Column(String(50), nullable=True)     # 'dados_gestacionais' | 'evolucao' | 'exames' | 'vacinas' | 'medicamentos' | 'anamnese'
    position = Column(Integer, nullable=False, default=0)
    visible = Column(Boolean, nullable=False, default=True)

    doctor = relationship("User")
    entries = relationship("PatientCardEntry", back_populates="section", cascade="all, delete-orphan")
    field_values = relationship("PatientCardFieldValue", back_populates="section", cascade="all, delete-orphan")


class PatientCardEntry(BaseModel):
    """Conteúdo de texto de uma seção por paciente."""
    __tablename__ = 'patient_card_entries'
    __table_args__ = (UniqueConstraint('patient_id', 'section_id'),)

    patient_id = Column(ForeignKey('patients.id', ondelete='CASCADE'), nullable=False)
    section_id = Column(ForeignKey('doctor_card_sections.id', ondelete='CASCADE'), nullable=False)
    content = Column(Text, nullable=True)

    patient = relationship("Patient")
    section = relationship("DoctorCardSection", back_populates="entries")


class PatientCardFieldValue(BaseModel):
    """Pares label+valor de seções do tipo 'fields' por paciente."""
    __tablename__ = 'patient_card_field_values'

    patient_id = Column(ForeignKey('patients.id', ondelete='CASCADE'), nullable=False)
    section_id = Column(ForeignKey('doctor_card_sections.id', ondelete='CASCADE'), nullable=False)
    label = Column(String(100), nullable=False)
    value = Column(Text, nullable=True)
    position = Column(Integer, nullable=False, default=0)

    patient = relationship("Patient")
    section = relationship("DoctorCardSection", back_populates="field_values")
```

- [ ] **Step 2: Adicionar ao `app/models/__init__.py`**

```python
from app.models.card import DoctorCardSection, PatientCardEntry, PatientCardFieldValue  # noqa: F401
```

- [ ] **Step 3: Gerar migration**

```bash
docker exec lunna_api alembic revision --autogenerate -m "add_card_tables" 2>&1 | grep "Generating\|Detected"
```

Editar o arquivo gerado e remover qualquer linha que altere colunas existentes (ex: `clinic_id NOT NULL`). Deixar apenas `create_table` das 3 novas tabelas.

- [ ] **Step 4: Rodar migration**

```bash
docker exec lunna_api alembic upgrade heads 2>&1 | tail -3
```

Esperado: `Running upgrade d48705d4b300 -> ..., add_card_tables`

- [ ] **Step 5: Commit**

```bash
cd appclinica-api
git add app/models/card.py app/models/__init__.py alembic/versions/
git commit -m "feat: models e migration doctor_card_sections / patient_card_entries / patient_card_field_values"
```

---

## Task 2 — API: Schemas e CRUD

**Files:**
- Create: `appclinica-api/app/schemas/card.py`
- Create: `appclinica-api/app/crud/card.py`

- [ ] **Step 1: Criar `app/schemas/card.py`**

```python
from typing import Optional, List, Any, Dict
from uuid import UUID
from app.schemas.base import CoreModel, BaseEntitySchema


# ── Template do médico ────────────────────────────────────────────────────────

class CardSectionCreate(CoreModel):
    title: str
    section_type: str  # 'text' | 'fields' (builtin só via init)

class CardSectionUpdate(CoreModel):
    title: Optional[str] = None
    visible: Optional[bool] = None

class CardSectionResponse(BaseEntitySchema):
    doctor_id: UUID
    title: str
    section_type: str
    builtin_key: Optional[str] = None
    position: int
    visible: bool

class CardMoveRequest(CoreModel):
    direction: str  # 'up' | 'down'


# ── Conteúdo por paciente ─────────────────────────────────────────────────────

class CardFieldValue(CoreModel):
    label: str
    value: Optional[str] = None
    position: int = 0

class CardEntryUpsert(CoreModel):
    content: Optional[str] = None          # para seções 'text'
    fields: Optional[List[CardFieldValue]] = None  # para seções 'fields'


# ── Cartão renderizado (GET /patients/{id}/card) ──────────────────────────────

class RenderedCardSection(CoreModel):
    section_id: UUID
    title: str
    section_type: str
    builtin_key: Optional[str] = None
    position: int
    visible: bool
    content: Optional[str] = None
    fields: Optional[List[CardFieldValue]] = None
    builtin_data: Optional[Dict[str, Any]] = None  # dados automáticos para seções built-in

class PatientCardResponse(CoreModel):
    patient_id: UUID
    doctor_id: UUID
    sections: List[RenderedCardSection]
```

- [ ] **Step 2: Criar `app/crud/card.py`**

```python
from uuid import UUID
from typing import List, Optional
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import asc

from app.models.card import DoctorCardSection, PatientCardEntry, PatientCardFieldValue
from app.models.user import Patient, User
from app.models.appointments import Appointment
from app.models.appointment_evolution import AppointmentEvolution
from app.models.lab_tests import LabTest
from app.models.exams import Vaccine
from app.models.medications import Medication
from app.models.patient_anamnesis import PatientAnamnesis
from app.schemas.card import CardSectionCreate, CardSectionUpdate, CardEntryUpsert, CardFieldValue

DEFAULT_SECTIONS = [
    {"title": "Dados Gestacionais",     "section_type": "builtin", "builtin_key": "dados_gestacionais", "position": 0},
    {"title": "Evolução das Consultas", "section_type": "builtin", "builtin_key": "evolucao",           "position": 1},
    {"title": "Exames Laboratoriais",   "section_type": "builtin", "builtin_key": "exames",             "position": 2},
    {"title": "Vacinas",                "section_type": "builtin", "builtin_key": "vacinas",            "position": 3},
    {"title": "Medicamentos",           "section_type": "builtin", "builtin_key": "medicamentos",       "position": 4},
    {"title": "Observações Clínicas",   "section_type": "text",    "builtin_key": None,                 "position": 5},
]


async def get_template(db: AsyncSession, doctor_id: UUID) -> List[DoctorCardSection]:
    result = await db.execute(
        select(DoctorCardSection)
        .where(DoctorCardSection.doctor_id == doctor_id, DoctorCardSection.deleted_at.is_(None))
        .order_by(asc(DoctorCardSection.position))
    )
    return list(result.scalars().all())


async def init_template(db: AsyncSession, doctor_id: UUID) -> List[DoctorCardSection]:
    """Cria o template padrão se o médico ainda não tiver um."""
    existing = await get_template(db, doctor_id)
    if existing:
        return existing
    sections = []
    for d in DEFAULT_SECTIONS:
        s = DoctorCardSection(doctor_id=doctor_id, **d, visible=True)
        db.add(s)
        sections.append(s)
    await db.commit()
    for s in sections:
        await db.refresh(s)
    return sections


async def add_section(db: AsyncSession, doctor_id: UUID, obj_in: CardSectionCreate) -> DoctorCardSection:
    existing = await get_template(db, doctor_id)
    position = max((s.position for s in existing), default=-1) + 1
    section = DoctorCardSection(
        doctor_id=doctor_id,
        title=obj_in.title,
        section_type=obj_in.section_type,
        builtin_key=None,
        position=position,
        visible=True,
    )
    db.add(section)
    await db.commit()
    await db.refresh(section)
    return section


async def update_section(db: AsyncSession, section: DoctorCardSection, obj_in: CardSectionUpdate) -> DoctorCardSection:
    for field, value in obj_in.model_dump(exclude_unset=True).items():
        setattr(section, field, value)
    await db.commit()
    await db.refresh(section)
    return section


async def move_section(db: AsyncSession, doctor_id: UUID, section_id: UUID, direction: str) -> List[DoctorCardSection]:
    sections = await get_template(db, doctor_id)
    idx = next((i for i, s in enumerate(sections) if s.id == section_id), None)
    if idx is None:
        return sections
    if direction == "up" and idx > 0:
        sections[idx].position, sections[idx - 1].position = sections[idx - 1].position, sections[idx].position
    elif direction == "down" and idx < len(sections) - 1:
        sections[idx].position, sections[idx + 1].position = sections[idx + 1].position, sections[idx].position
    await db.commit()
    return await get_template(db, doctor_id)


async def delete_section(db: AsyncSession, section: DoctorCardSection) -> None:
    from datetime import datetime, timezone
    section.deleted_at = datetime.now(timezone.utc)
    await db.commit()


async def get_section(db: AsyncSession, section_id: UUID, doctor_id: UUID) -> Optional[DoctorCardSection]:
    result = await db.execute(
        select(DoctorCardSection).where(
            DoctorCardSection.id == section_id,
            DoctorCardSection.doctor_id == doctor_id,
            DoctorCardSection.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def upsert_entry(db: AsyncSession, patient_id: UUID, section_id: UUID, obj_in: CardEntryUpsert) -> None:
    # Para seções 'text'
    if obj_in.content is not None:
        result = await db.execute(
            select(PatientCardEntry).where(
                PatientCardEntry.patient_id == patient_id,
                PatientCardEntry.section_id == section_id,
                PatientCardEntry.deleted_at.is_(None),
            )
        )
        entry = result.scalar_one_or_none()
        if entry:
            entry.content = obj_in.content
        else:
            entry = PatientCardEntry(patient_id=patient_id, section_id=section_id, content=obj_in.content)
            db.add(entry)

    # Para seções 'fields'
    if obj_in.fields is not None:
        result = await db.execute(
            select(PatientCardFieldValue).where(
                PatientCardFieldValue.patient_id == patient_id,
                PatientCardFieldValue.section_id == section_id,
            )
        )
        existing_fields = list(result.scalars().all())
        for f in existing_fields:
            await db.delete(f)
        for i, fv in enumerate(obj_in.fields):
            fv_obj = PatientCardFieldValue(
                patient_id=patient_id, section_id=section_id,
                label=fv.label, value=fv.value, position=i,
            )
            db.add(fv_obj)

    await db.commit()


async def _builtin_data(db: AsyncSession, key: str, patient_id: UUID, patient: Patient) -> dict:
    """Busca dados automáticos para seções built-in."""
    if key == "dados_gestacionais":
        lmp = patient.lmp_date
        today = date.today()
        current_week = ((today - lmp).days // 7) if lmp else patient.current_week
        return {
            "lmp_date": str(lmp) if lmp else None,
            "edd": str(patient.edd) if patient.edd else None,
            "current_week": current_week,
            "blood_type": patient.blood_type,
            "height_cm": patient.height_cm,
            "weight_initial_kg": patient.weight_initial_kg,
            "risk_level": str(patient.risk_level.value) if patient.risk_level else None,
            "hospital": patient.hospital,
            "number_of_fetuses": patient.number_of_fetuses,
            "parity": patient.parity,
        }
    if key == "evolucao":
        evos = (await db.execute(
            select(AppointmentEvolution)
            .where(AppointmentEvolution.patient_id == patient_id, AppointmentEvolution.deleted_at.is_(None))
            .order_by(asc(AppointmentEvolution.created_at))
        )).scalars().all()
        return {"evolutions": [
            {"date": str(e.created_at.date()), "weight_kg": str(e.weight_kg) if e.weight_kg else None,
             "bp": f"{e.bp_systolic}/{e.bp_diastolic}" if e.bp_systolic else None,
             "fundal_height_cm": str(e.fundal_height_cm) if e.fundal_height_cm else None,
             "fetal_heart_rate": e.fetal_heart_rate, "edema": e.edema,
             "presentation": str(e.presentation.value) if e.presentation else None,
             "clinical_notes": e.clinical_notes}
            for e in evos
        ]}
    if key == "exames":
        items = (await db.execute(
            select(LabTest).where(LabTest.patient_id == patient_id, LabTest.deleted_at.is_(None))
            .order_by(LabTest.date)
        )).scalars().all()
        return {"exames": [{"name": i.name, "date": str(i.date), "status": str(i.status.value), "result": i.result} for i in items]}
    if key == "vacinas":
        items = (await db.execute(
            select(Vaccine).where(Vaccine.patient_id == patient_id, Vaccine.deleted_at.is_(None))
        )).scalars().all()
        return {"vacinas": [{"type": i.vaccine_type, "dose": i.dose_number, "date": str(i.date), "status": str(i.status.value)} for i in items]}
    if key == "medicamentos":
        items = (await db.execute(
            select(Medication).where(Medication.patient_id == patient_id, Medication.deleted_at.is_(None), Medication.active == True)
        )).scalars().all()
        return {"medicamentos": [{"name": i.name, "dosage": i.dosage, "frequency": i.frequency} for i in items]}
    if key == "anamnese":
        ana = (await db.execute(
            select(PatientAnamnesis).where(PatientAnamnesis.patient_id == patient_id, PatientAnamnesis.deleted_at.is_(None))
        )).scalar_one_or_none()
        if not ana:
            return {}
        return {
            "has_diabetes": ana.has_diabetes, "has_hipertensao": ana.has_hipertensao,
            "alergias_medicamentos": ana.alergias_medicamentos, "outras_alergias": ana.outras_alergias,
            "tabagismo": ana.tabagismo, "alcool": ana.alcool, "alcool_frequencia": ana.alcool_frequencia,
            "pre_eclampsia_anterior": ana.pre_eclampsia_anterior,
        }
    return {}


async def render_patient_card(db: AsyncSession, patient_id: UUID, doctor_id: UUID) -> dict:
    """Monta o cartão completo: template + conteúdo por paciente + dados built-in."""
    # Inicializa template se necessário
    sections = await init_template(db, doctor_id)

    # Carrega paciente
    patient = (await db.execute(select(Patient).where(Patient.id == patient_id))).scalar_one_or_none()
    if not patient:
        return {"patient_id": str(patient_id), "doctor_id": str(doctor_id), "sections": []}

    # Carrega entradas de texto por paciente
    entries = (await db.execute(
        select(PatientCardEntry).where(
            PatientCardEntry.patient_id == patient_id,
            PatientCardEntry.deleted_at.is_(None),
        )
    )).scalars().all()
    entry_map = {str(e.section_id): e.content for e in entries}

    # Carrega campos por paciente
    fields = (await db.execute(
        select(PatientCardFieldValue)
        .where(PatientCardFieldValue.patient_id == patient_id)
        .order_by(asc(PatientCardFieldValue.position))
    )).scalars().all()
    fields_map: dict = {}
    for f in fields:
        key = str(f.section_id)
        if key not in fields_map:
            fields_map[key] = []
        fields_map[key].append({"label": f.label, "value": f.value, "position": f.position})

    rendered = []
    for s in sections:
        sid = str(s.id)
        section_data = {
            "section_id": str(s.id),
            "title": s.title,
            "section_type": s.section_type,
            "builtin_key": s.builtin_key,
            "position": s.position,
            "visible": s.visible,
            "content": entry_map.get(sid),
            "fields": fields_map.get(sid),
            "builtin_data": await _builtin_data(db, s.builtin_key, patient_id, patient) if s.builtin_key else None,
        }
        rendered.append(section_data)

    return {"patient_id": str(patient_id), "doctor_id": str(doctor_id), "sections": rendered}
```

- [ ] **Step 3: Commit**

```bash
cd appclinica-api
git add app/schemas/card.py app/crud/card.py
git commit -m "feat: schemas e CRUD do cartão da gestante"
```

---

## Task 3 — API: Endpoints e Router

**Files:**
- Create: `appclinica-api/app/api/v1/card.py`
- Modify: `appclinica-api/app/api/v1/router.py`

- [ ] **Step 1: Criar `app/api/v1/card.py`**

```python
from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, get_current_user, require_role
from app.models.user import User
from app.crud import card as crud_card
from app.schemas.card import (
    CardSectionCreate, CardSectionUpdate, CardSectionResponse,
    CardMoveRequest, CardEntryUpsert, PatientCardResponse,
)

router = APIRouter()


# ── Template do médico ────────────────────────────────────────────────────────

@router.get("/doctors/{doctor_id}/card-template", response_model=List[CardSectionResponse], tags=["card"])
async def get_template(
    doctor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["doctor", "admin"])),
):
    """Retorna (e inicializa se necessário) o template de cartão do médico."""
    return await crud_card.init_template(db, doctor_id=doctor_id)


@router.post("/doctors/{doctor_id}/card-template/sections", response_model=CardSectionResponse, tags=["card"])
async def add_section(
    doctor_id: UUID,
    obj_in: CardSectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["doctor", "admin"])),
):
    """Adiciona nova seção customizada ao template."""
    if obj_in.section_type not in ("text", "fields"):
        raise HTTPException(status_code=400, detail="Só é permitido criar seções do tipo 'text' ou 'fields'")
    return await crud_card.add_section(db, doctor_id=doctor_id, obj_in=obj_in)


@router.patch("/doctors/{doctor_id}/card-template/sections/{section_id}", response_model=CardSectionResponse, tags=["card"])
async def update_section(
    doctor_id: UUID,
    section_id: UUID,
    obj_in: CardSectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["doctor", "admin"])),
):
    """Atualiza título ou visibilidade de uma seção."""
    section = await crud_card.get_section(db, section_id=section_id, doctor_id=doctor_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    return await crud_card.update_section(db, section=section, obj_in=obj_in)


@router.post("/doctors/{doctor_id}/card-template/sections/{section_id}/move", response_model=List[CardSectionResponse], tags=["card"])
async def move_section(
    doctor_id: UUID,
    section_id: UUID,
    obj_in: CardMoveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["doctor", "admin"])),
):
    """Move uma seção para cima ou para baixo na ordem."""
    if obj_in.direction not in ("up", "down"):
        raise HTTPException(status_code=400, detail="direction deve ser 'up' ou 'down'")
    return await crud_card.move_section(db, doctor_id=doctor_id, section_id=section_id, direction=obj_in.direction)


@router.delete("/doctors/{doctor_id}/card-template/sections/{section_id}", status_code=204, tags=["card"])
async def delete_section(
    doctor_id: UUID,
    section_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["doctor", "admin"])),
):
    """Remove uma seção customizada (built-in não pode ser removida)."""
    section = await crud_card.get_section(db, section_id=section_id, doctor_id=doctor_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    if section.section_type == "builtin":
        raise HTTPException(status_code=400, detail="Seções built-in não podem ser removidas, apenas ocultadas")
    await crud_card.delete_section(db, section=section)


# ── Cartão por paciente ───────────────────────────────────────────────────────

@router.get("/patients/{patient_id}/card", response_model=PatientCardResponse, tags=["card"])
async def get_patient_card(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna o cartão completo da gestante: template + dados built-in + conteúdo por paciente."""
    doctor_id = current_user.id
    rendered = await crud_card.render_patient_card(db, patient_id=patient_id, doctor_id=doctor_id)
    return rendered


@router.put("/patients/{patient_id}/card/sections/{section_id}", status_code=204, tags=["card"])
async def save_section_content(
    patient_id: UUID,
    section_id: UUID,
    obj_in: CardEntryUpsert,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["doctor", "admin"])),
):
    """Salva o conteúdo de uma seção para um paciente específico."""
    await crud_card.upsert_entry(db, patient_id=patient_id, section_id=section_id, obj_in=obj_in)
```

- [ ] **Step 2: Registrar no `app/api/v1/router.py`**

Adicionar ao final do arquivo:

```python
from app.api.v1 import card
api_router.include_router(card.router, tags=["card"])
```

- [ ] **Step 3: Testar endpoints**

```bash
sleep 2
BASE="http://localhost:8000/api/v1"
DT=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"doctor@gerarvida.com","password":"senha_segura123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
DID="c9d23c5a-6323-4baa-a5ca-29de73c7156f"
PID="651c6b0f-f23b-411d-b780-026c94455754"

echo "=== GET template ==="
curl -s "$BASE/doctors/$DID/card-template" -H "Authorization: Bearer $DT" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} seções | primeira: {d[0][\"title\"]} ({d[0][\"section_type\"]})')"

echo "=== GET patient card ==="
curl -s "$BASE/patients/$PID/card" -H "Authorization: Bearer $DT" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d[\"sections\"])} seções | evolucao data keys: {list(d[\"sections\"][1][\"builtin_data\"].keys()) if d[\"sections\"][1][\"builtin_data\"] else \"none\"}')"

echo "=== POST nova seção ==="
curl -s -X POST "$BASE/doctors/$DID/card-template/sections" \
  -H "Authorization: Bearer $DT" -H "Content-Type: application/json" \
  -d '{"title":"Plano de Parto","section_type":"text"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('nova seção:', d.get('title'), '| pos:', d.get('position'))"
```

Esperado:
```
=== GET template ===
6 seções | primeira: Dados Gestacionais (builtin)
=== GET patient card ===
7 seções | evolucao data keys: ['evolutions']
=== POST nova seção ===
nova seção: Plano de Parto | pos: 6
```

- [ ] **Step 4: Commit**

```bash
git add app/api/v1/card.py app/api/v1/router.py
git commit -m "feat: endpoints de template e cartão da gestante"
```

---

## Task 4 — App: Tipos e Service

**Files:**
- Modify: `appclinica/src/types/index.ts`
- Create: `appclinica/src/services/card.ts`

- [ ] **Step 1: Adicionar tipos em `src/types/index.ts`**

Adicionar ao final do arquivo:

```typescript
// ─── Cartão da Gestante ───────────────────────────────────────────────────────

export interface CardFieldValue {
  label: string;
  value?: string;
  position: number;
}

export interface CardSection {
  id: string;
  doctor_id: string;
  title: string;
  section_type: 'builtin' | 'text' | 'fields';
  builtin_key?: string;
  position: number;
  visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface RenderedCardSection {
  section_id: string;
  title: string;
  section_type: 'builtin' | 'text' | 'fields';
  builtin_key?: string;
  position: number;
  visible: boolean;
  content?: string;
  fields?: CardFieldValue[];
  builtin_data?: Record<string, any>;
}

export interface PatientCard {
  patient_id: string;
  doctor_id: string;
  sections: RenderedCardSection[];
}

export interface CardSectionCreate {
  title: string;
  section_type: 'text' | 'fields';
}

export interface CardSectionUpdate {
  title?: string;
  visible?: boolean;
}

export interface CardEntryUpsert {
  content?: string;
  fields?: CardFieldValue[];
}
```

- [ ] **Step 2: Criar `src/services/card.ts`**

```typescript
import { api } from './api';
import type {
  CardSection, PatientCard, CardSectionCreate,
  CardSectionUpdate, CardEntryUpsert,
} from '../types';

export const cardService = {
  // Template do médico
  getTemplate: (doctorId: string) =>
    api.get<CardSection[]>(`/doctors/${doctorId}/card-template`),

  addSection: (doctorId: string, data: CardSectionCreate) =>
    api.post<CardSection>(`/doctors/${doctorId}/card-template/sections`, data),

  updateSection: (doctorId: string, sectionId: string, data: CardSectionUpdate) =>
    api.patch<CardSection>(`/doctors/${doctorId}/card-template/sections/${sectionId}`, data),

  moveSection: (doctorId: string, sectionId: string, direction: 'up' | 'down') =>
    api.post<CardSection[]>(`/doctors/${doctorId}/card-template/sections/${sectionId}/move`, { direction }),

  deleteSection: (doctorId: string, sectionId: string) =>
    api.delete<void>(`/doctors/${doctorId}/card-template/sections/${sectionId}`),

  // Cartão por paciente
  getPatientCard: (patientId: string) =>
    api.get<PatientCard>(`/patients/${patientId}/card`),

  saveSectionContent: (patientId: string, sectionId: string, data: CardEntryUpsert) =>
    api.put<void>(`/patients/${patientId}/card/sections/${sectionId}`, data),
};
```

- [ ] **Step 3: Type check**

```bash
cd appclinica && npx tsc --noEmit 2>&1 | grep -v "GerarVida/"
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/services/card.ts
git commit -m "feat: tipos e service do cartão da gestante"
```

---

## Task 5 — App: DoctorCardTemplateScreen (configurações)

**Files:**
- Create: `appclinica/src/screens/doctor/DoctorCardTemplateScreen.tsx`
- Modify: `appclinica/src/navigation/DoctorNavigator.tsx`
- Modify: `appclinica/src/screens/doctor/DashboardMedicoScreen.tsx`

- [ ] **Step 1: Criar `src/screens/doctor/DoctorCardTemplateScreen.tsx`**

```typescript
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
import type { CardSection, CardSectionCreate } from '../../types';
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
  red: colors.accent,
});
```

- [ ] **Step 2: Atualizar `src/navigation/DoctorNavigator.tsx`**

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardMedicoScreen } from '../screens/doctor/DashboardMedicoScreen';
import { MedicoPacientesScreen } from '../screens/doctor/MedicoPacientesScreen';
import { PacienteDetalheScreen } from '../screens/doctor/PacienteDetalheScreen';
import { AgendaMedicoScreen } from '../screens/doctor/AgendaMedicoScreen';
import { DoctorCardTemplateScreen } from '../screens/doctor/DoctorCardTemplateScreen';
import { PatientCardScreen } from '../screens/doctor/PatientCardScreen';

export type DoctorStackParams = {
  DashboardMedico: undefined;
  MedicoPacientes: undefined;
  PacienteDetalhe: { patientId: string };
  AgendaMedico: undefined;
  CardTemplate: undefined;
  PatientCard: { patientId: string; patientName: string };
};

const Stack = createNativeStackNavigator<DoctorStackParams>();

export function DoctorNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="DashboardMedico">
      <Stack.Screen name="DashboardMedico" component={DashboardMedicoScreen} />
      <Stack.Screen name="MedicoPacientes" component={MedicoPacientesScreen} />
      <Stack.Screen name="PacienteDetalhe" component={PacienteDetalheScreen} />
      <Stack.Screen name="AgendaMedico" component={AgendaMedicoScreen} />
      <Stack.Screen name="CardTemplate" component={DoctorCardTemplateScreen} />
      <Stack.Screen name="PatientCard" component={PatientCardScreen} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 3: Adicionar botão ⚙ no DashboardMedicoScreen**

Localizar o header do dashboard (onde aparece o avatar do médico) e adicionar o botão de settings ao lado:

```typescript
// No início do componente, adicionar:
const navigation = useNavigation<Nav>(); // já existe

// No header, ao lado do avatar, adicionar:
<TouchableOpacity onPress={() => navigation.navigate('CardTemplate')} style={{ padding: 8 }}>
  <Text style={{ fontSize: 20 }}>⚙️</Text>
</TouchableOpacity>
```

Localizar o bloco:
```typescript
<View style={styles.avatar}>
  <Text style={styles.avatarText}>{getInitials(user?.name ?? '??')}</Text>
</View>
```

Substituir por:
```typescript
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  <TouchableOpacity onPress={() => navigation.navigate('CardTemplate')} style={{ padding: 6 }}>
    <Text style={{ fontSize: 20 }}>⚙️</Text>
  </TouchableOpacity>
  <View style={styles.avatar}>
    <Text style={styles.avatarText}>{getInitials(user?.name ?? '??')}</Text>
  </View>
</View>
```

- [ ] **Step 4: Criar arquivo placeholder para PatientCardScreen** (será implementado na Task 6)

```typescript
// src/screens/doctor/PatientCardScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { colors } from '../../theme';

export function PatientCardScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Cartão da Gestante" />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textMid }}>Em construção...</Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 5: Type check**

```bash
cd appclinica && npx tsc --noEmit 2>&1 | grep -v "GerarVida/"
```

Esperado: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/screens/doctor/DoctorCardTemplateScreen.tsx \
        src/screens/doctor/PatientCardScreen.tsx \
        src/navigation/DoctorNavigator.tsx \
        src/screens/doctor/DashboardMedicoScreen.tsx
git commit -m "feat: DoctorCardTemplateScreen + rotas CardTemplate e PatientCard"
```

---

## Task 6 — App: PatientCardScreen (visualizar e preencher)

**Files:**
- Modify: `appclinica/src/screens/doctor/PatientCardScreen.tsx`

- [ ] **Step 1: Implementar `PatientCardScreen`**

Substituir o conteúdo placeholder pelo componente completo:

```typescript
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
    const data = await cardService.getPatientCard(patientId);
    setCard(data);
    setLoading(false);
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
```

- [ ] **Step 2: Type check**

```bash
cd appclinica && npx tsc --noEmit 2>&1 | grep -v "GerarVida/"
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/screens/doctor/PatientCardScreen.tsx
git commit -m "feat: PatientCardScreen com seções built-in e edição por paciente"
```

---

## Task 7 — App: Card Preview no GeralTab

**Files:**
- Modify: `appclinica/src/screens/doctor/PacienteDetalheScreen.tsx`

- [ ] **Step 1: Adicionar import e tipo da navegação**

No topo do arquivo, o import de `NativeStackNavigationProp` já existe. Adicionar import do `useNavigation`:

Verificar que `useNavigation` já está importado. Se não, adicionar:
```typescript
import { useNavigation } from '@react-navigation/native';
```

- [ ] **Step 2: Adicionar card preview no GeralTab**

No `GeralTab`, adicionar um `useNavigation` e um card de acesso ao cartão após o bloco de contato (antes do bloco de notas):

Localizar no `GeralTab`:
```typescript
      <View style={s.notasCard}>
```

Adicionar antes desse bloco:

```typescript
      {/* Card da Gestante */}
      <TouchableOpacity
        style={[s.infoCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }]}
        onPress={() => {
          // @ts-ignore — navigation tipada no nível pai
          navigation.navigate('PatientCard', { patientId, patientName: patient?.name ?? 'Paciente' });
        }}
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
```

- [ ] **Step 3: Adicionar `useNavigation` ao GeralTab**

No `function GeralTab({ patientId })`, logo após os estados, adicionar:

```typescript
const navigation = useNavigation();
```

- [ ] **Step 4: Type check**

```bash
cd appclinica && npx tsc --noEmit 2>&1 | grep -v "GerarVida/"
```

Esperado: sem erros ou apenas warnings de `@ts-ignore`.

- [ ] **Step 5: Testar no simulador**

1. Login como doctor
2. Dashboard → ícone ⚙️ no canto → DoctorCardTemplateScreen abre
3. Reordenar seções com ↑↓, ocultar uma, adicionar seção "Plano de Parto" (texto livre)
4. Voltar → abrir uma paciente → aba Geral → card "Cartão da Gestante" → PatientCardScreen
5. Verificar seções na ordem configurada
6. Preencher a seção "Plano de Parto" → Salvar → reabrir → conteúdo persistido

- [ ] **Step 6: Commit**

```bash
git add src/screens/doctor/PacienteDetalheScreen.tsx
git commit -m "feat: card preview do cartão da gestante no GeralTab"
```

---

## Self-Review

**Spec coverage:**
- ✅ Template por médico (salvo uma vez, aplicado a todas as pacientes) — Tasks 1–3
- ✅ Seções built-in com dados automáticos (Dados Gestacionais, Evolução, Exames, Vacinas, Medicamentos, Anamnese) — Task 2 (`_builtin_data`)
- ✅ Seções customizadas: texto livre e campos label+valor — Tasks 1–3
- ✅ Reordenar com ↑↓ — Task 3 (endpoint move) + Task 5 (UI)
- ✅ Mostrar/ocultar seções — Tasks 3 + 5
- ✅ Renomear seções (tap no título) — Task 5
- ✅ Adicionar novas seções — Tasks 3 + 5
- ✅ Remover seções customizadas (built-in só pode ocultar) — Tasks 3 + 5
- ✅ Preencher conteúdo por paciente — Task 6
- ✅ Card preview no GeralTab com botão "Ver Cartão" — Task 7
- ✅ Botão ⚙️ no dashboard do médico → configurações — Task 5
- ✅ Semana gestacional calculada dinamicamente no `_builtin_data` — Task 2

**Dependências:**
- Task 2 depende de Task 1 (models devem existir)
- Task 3 depende de Task 2 (endpoints usam CRUD)
- Tasks 4–7 dependem de Task 3 (API deve estar rodando)
- Task 7 depende de Task 5 (rota PatientCard deve existir no navigator)
