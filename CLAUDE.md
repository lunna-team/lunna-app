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
│   │   ├── auth.ts            # login, logout, refresh
│   │   ├── appointments.ts
│   │   ├── users.ts
│   │   ├── vitals.ts
│   │   └── storage.ts         # Wrapper AsyncStorage + STORAGE_KEYS
│   ├── theme/
│   │   └── index.ts           # colors, spacing, radius
│   └── types/
│       └── index.ts           # User, Appointment, Vitals, etc.
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
