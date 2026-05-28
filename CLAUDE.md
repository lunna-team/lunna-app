# CLAUDE.md — Gerar Vida (App Mobile)

Contexto do projeto para Claude Code. Atualizar sempre que houver mudanças significativas.

---

## Visão Geral

**Gerar Vida** é o app mobile pré-natal da plataforma **Lunna** — SaaS white-label para clínicas privadas de obstetrícia. Três perfis: paciente, médico(a) e secretária.

---

## Stack

- **React Native 0.81** + **Expo 54** (managed workflow)
- **TypeScript** (strict mode)
- **React Navigation 7** (native stack + bottom tabs)
- **AsyncStorage** para persistência local
- **Axios** via `src/services/api.ts` para comunicação com `lunna-api`
- **Idioma:** Português (pt-BR)

---

## Comandos

```bash
npm install               # instalar dependências
npx expo start            # servidor Metro (scan QR com Expo Go)
npx expo start --android  # abrir emulador Android
npx expo start --ios      # abrir simulador iOS (macOS)
npx tsc --noEmit          # verificação de tipos
```

### Docker

```bash
# Desenvolvimento (Android + iOS via LAN)
HOST_IP=<seu-ip-local> docker-compose up metro

# Build APK Android
docker-compose -f docker-compose.android.yml run android-build
# APK gerado em ./output/app-debug.apk
```

---

## Estrutura de Diretórios

```
lunna-app/
├── App.tsx                    # Entry point (providers: GestureHandler, SafeArea, Auth, Navigation)
├── app.json                   # Expo config
├── src/
│   ├── components/
│   │   ├── common/            # BottomSheet, Card, ScreenHeader, StatBox
│   │   └── domain/            # RiskBadge
│   ├── config/
│   │   └── index.ts           # API_BASE_URL
│   ├── constants/
│   │   └── index.ts           # GESTATIONAL_WEEKS_TOTAL, limites clínicos, USER_ROLES
│   ├── contexts/
│   │   └── AuthContext.tsx    # isAuthenticated, user, login(), logout()
│   ├── hooks/                 # Custom hooks (a popular)
│   ├── navigation/
│   │   ├── RootNavigator.tsx  # Roteamento por role
│   │   ├── PatientNavigator.tsx
│   │   ├── DoctorNavigator.tsx
│   │   └── SecretaryNavigator.tsx
│   ├── screens/
│   │   ├── auth/              # LoginScreen
│   │   ├── patient/           # 13 telas
│   │   ├── doctor/            # 4 telas
│   │   └── secretary/         # 1 tela
│   ├── services/
│   │   ├── api.ts             # Axios base client + interceptor de token
│   │   ├── auth.ts            # login, logout, refresh (inclui renovação de token)
│   │   ├── users.ts           # perfil, clínica, push token, onboarding
│   │   ├── patients.ts        # pacientes, prontuário, agenda, dashboards
│   │   ├── appointments.ts    # consultas (listar, criar, confirmar, remarcar)
│   │   ├── vitals.ts          # sinais vitais (contrações, glicose, pressão)
│   │   ├── exams.ts           # USG, vacinas, exames laboratoriais
│   │   ├── medications.ts     # medicamentos/prescrições
│   │   ├── messages.ts        # chat HTTP + WebSocket
│   │   ├── babyNames.ts       # nomes de bebê + favoritos
│   │   ├── fetalDevelopment.ts # dados semanais de desenvolvimento fetal
│   │   ├── announcements.ts   # avisos da clínica
│   │   ├── notifications.ts   # notificações in-app
│   │   └── storage.ts         # Wrapper AsyncStorage + STORAGE_KEYS
│   ├── theme/
│   │   └── index.ts           # colors, spacing, radius
│   └── types/
│       └── index.ts           # User, Appointment, Vitals, PatientDetail, AgendaResponse, etc.
└── docs/
    ├── plans/                 # Decisões de arquitetura
    └── archive/html-prototype/ # Protótipo HTML original (referência de design)
```

---

## Navegação por Role

`RootNavigator` lê `user.role` do `AuthContext`:

| Role | Navigator | Tela inicial |
|---|---|---|
| `patient` | PatientNavigator | HomeScreen |
| `doctor` | DoctorNavigator | DashboardMedicoScreen |
| `secretary` | SecretaryNavigator | DashboardSecretariaScreen |
| (não autenticado) | — | LoginScreen |

---

## Telas — Paciente

| Tela | Arquivo | Descrição |
|---|---|---|
| Login | `auth/LoginScreen` | Autenticação JWT |
| Onboarding | `patient/OnboardingScreen` | 3 slides; salva `gv_onboarded` |
| Home | `patient/HomeScreen` | Dashboard: semana, carrossel, atalhos, avisos |
| Chat | `patient/ChatScreen` | Chat com equipe de saúde |
| Área Médica | `patient/AreaMedicaScreen` | Exames e medicamentos |
| Consultas | `patient/ConsultasScreen` | Próxima consulta, confirmação, remarcação |
| Contrações | `patient/ContracoesScreen` | Timer press-and-hold, histórico |
| Glicose | `patient/GlicoseScreen` | Gráfico + histórico + modal de registro |
| Pressão | `patient/PressaoScreen` | Gráfico duplo + histórico + modal de registro |
| Nomes | `patient/NomesScreen` | Favoritos com popularidade Canvas |
| Feto 3D | `patient/Feto3DScreen` | Visualizador com zoom/pan |
| Avisos | `patient/AvisosScreen` | Feed da clínica com accordion |
| Prontuário | `patient/ProntuarioScreen` | Resumo gestacional completo |
| Perfil | `patient/PerfilScreen` | Dados pessoais + configurações |

## Telas — Médico

| Tela | Arquivo |
|---|---|
| Dashboard | `doctor/DashboardMedicoScreen` |
| Agenda | `doctor/AgendaMedicoScreen` |
| Lista de Pacientes | `doctor/MedicoPacientesScreen` |
| Detalhe do Paciente | `doctor/PacienteDetalheScreen` |

## Telas — Secretária

| Tela | Arquivo |
|---|---|
| Dashboard | `secretary/DashboardSecretariaScreen` |

---

## Design System

Definido em `src/theme/index.ts`. Variáveis de referência:

| Token | Valor | Uso |
|---|---|---|
| `colors.bg` | `#F4F6F4` | Fundo geral |
| `colors.primary` | `#8DAA91` | Verde-sálvia primário |
| `colors.primaryLight` | `#C5D5C8` | Sálvia claro |
| `colors.primaryDk` | `#5E7E63` | Sálvia escuro |
| `colors.accent` | `#E5987D` | Coral/pêssego de destaque |
| `colors.darkCard` | `#301B28` | Ameixa escura (cards dark) |
| `colors.text` | `#2D312E` | Quase-preto |

---

## Componentes Reutilizáveis

| Componente | Localização | Quando usar |
|---|---|---|
| `BottomSheet` | `components/common/` | Modais deslizantes de baixo |
| `Card` | `components/common/` | Cards brancos genéricos |
| `ScreenHeader` | `components/common/` | Header com botão voltar |
| `StatBox` | `components/common/` | Caixas de estatísticas (stats row) |
| `RiskBadge` | `components/domain/` | Badge colorido de risco gestacional |

---

## Serviços — Padrões e Gotchas

### Mapeamento de resposta da API

Vários endpoints retornam estruturas aninhadas que são achatadas pela camada de serviço antes de chegarem às telas:

- **`patients.ts`**: `PatientListItemRaw` (com `user: UserResponse` aninhado) → `PatientDetail` via `flattenPatient()`
- **`patients.ts`**: `ProntuarioRaw` (com `dados_clinicos` e `user` aninhados) → `PatientProntuario` via `flattenProntuario()`
- As telas sempre recebem tipos "achatados" — nunca acesse `.user.name` diretamente nas telas

### Tipos importantes

| Tipo | Observação |
|---|---|
| `AgendaResponse` | Retorno de `getDoctorAgenda()` — `{ view, appointments?, upcoming_births? }` (não é `PaginatedResponse`) |
| `AgendaAppointment` | Item de agenda com `time` (string `HH:MM:SS`), `type`, `status`, `duration_minutes`, `location?` |
| `BirthItem` | Item de parto previsto com `patient_id`, `name`, `edd`, `current_week?`, `hospital?` |
| `BabyNameGender` | `'male' \| 'female' \| 'neutral'` — não usar `'M'` / `'F'` |
| `GlucoseMoment` | `'fasting' \| 'after_meal' \| 'random'` — não usar `'post_breakfast'` etc. |
| `PatientProntuario` | Campos planos derivados da API: `lmp_date`, `edd`, `current_week`, `blood_type`, `height_cm`, `weight_initial_kg`, `imc`, `user_name`, `user_email`, `user_phone` |
| `DoctorDashboard` | Campo correto: `appointments_today` (não `today_appointments`) |
| `SecretaryDashboard` | Campo correto: `appointments_today`, `confirmed`, `pending`, `total_patients` |

### STORAGE_KEYS

| Chave | Constante | Uso |
|---|---|---|
| `gv_access_token` | `STORAGE_KEYS.accessToken` | JWT de acesso (24h) |
| `gv_refresh_token` | `STORAGE_KEYS.refreshToken` | JWT de refresh (7d) |
| `gv_user` | `STORAGE_KEYS.user` | Objeto `User` serializado |
| `gv_onboarded` | `STORAGE_KEYS.onboarded` | Flag de onboarding concluído |
| `gv_notas_medica` | `STORAGE_KEYS.notasMedica` | Notas privadas do médico (local only) |

### authService.refresh()

Renova o `access_token` usando o `refresh_token` salvo em storage. Chamado automaticamente pelo interceptor do Axios em respostas 401.

### WebSocket (ChatScreen)

URL: `API_BASE_URL.replace('http', 'ws') + /patients/{id}/ws/chat?token=<jwt>`
- Código de fechamento `4001` = token inválido → **não reconectar**
- Qualquer outro código → reconectar com delay de 3s
- Cleanup: `wsRef.current?.close()` no `useEffect` cleanup

### examsService.updateVaccine

```
PATCH /patients/vaccines/{vaccineId}   ← sem patientId na rota
```

---

## Convenções

- **Commits:** Conventional Commits em português (`feat:`, `fix:`, `refactor:`)
- **Componentes:** sem lógica de domínio em `common/`; `domain/` pode referenciar tipos do projeto
- **Imports:** caminho relativo sempre; sem path aliases no momento
- **Novos hooks:** criar em `src/hooks/` com prefixo `use`
- **Nova tela:** criar em `screens/<role>/`, registrar no navigator, atualizar este CLAUDE.md

---

## Protótipo HTML

O protótipo HTML original (referência visual de design) foi preservado em:
`docs/archive/html-prototype/`

Não é código de produção. Serve exclusivamente como referência para
reprodução fiel de layouts nas telas React Native.
