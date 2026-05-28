# Gerar Vida — Mobile App

App pré-natal white-label para clínicas privadas de obstetrícia.

**Stack:** React Native 0.81 · Expo 54 · TypeScript · React Navigation 7

---

## Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Início rápido](#início-rápido)
3. [Desenvolvimento com Docker](#desenvolvimento-com-docker)
4. [Build Android](#build-android)
5. [Build iOS](#build-ios)
6. [Variáveis de ambiente](#variáveis-de-ambiente)
7. [Arquitetura](#arquitetura)
8. [Guia de contribuição](#guia-de-contribuição)

---

## Pré-requisitos

| Ferramenta | Versão mínima | Observação |
|---|---|---|
| Node.js | 20.x | [nodejs.org](https://nodejs.org) |
| npm | 10.x | Incluído com Node |
| Expo Go | atual | iOS App Store ou Google Play |
| Docker | 24.x | Apenas para desenvolvimento containerizado |
| Xcode | 15+ | Apenas para build iOS (macOS obrigatório) |
| Android Studio | Hedgehog+ | Apenas para emulador Android local |

---

## Início rápido

```bash
npm install
npx expo start
```

Escaneie o QR code com o **Expo Go** no dispositivo, ou pressione:
- `a` — abrir no emulador Android
- `i` — abrir no simulador iOS (macOS)

---

## Desenvolvimento com Docker

O container expõe o servidor Metro na porta `8081` e aceita conexões de
dispositivos físicos e emuladores via rede LAN.

### Android (emulador ou dispositivo físico)

```bash
# macOS / Linux
HOST_IP=$(ipconfig getifaddr en0) docker-compose up metro

# Windows (PowerShell)
$env:HOST_IP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi").IPAddress
docker-compose up metro
```

No dispositivo Android, abra o Expo Go e conecte-se a `exp://<HOST_IP>:8081`.

### iOS (simulador)

O simulador iOS roda em macOS e pode se conectar ao Metro no container:

```bash
HOST_IP=127.0.0.1 docker-compose up metro
npx expo start --ios   # na máquina host, aponta para localhost:8081
```

> **Nota:** Para builds iOS, veja a seção [Build iOS](#build-ios).

### Parar o servidor

```bash
docker-compose down
```

---

## Build Android

O build de APK roda completamente dentro do container (sem necessidade de
Android Studio local):

```bash
# Gera app-debug.apk em ./output/
docker-compose -f docker-compose.android.yml run android-build
```

Para build de release, edite `Dockerfile.android` e substitua
`assembleDebug` por `bundleRelease`.

---

## Build iOS

Build iOS **não é suportado via Docker** — o Xcode exige macOS.

**Opção 1 — Local (requer macOS + Xcode 15+):**
```bash
npx expo prebuild --platform ios
cd ios && xcodebuild -workspace GerarVida.xcworkspace -scheme GerarVida
```

**Opção 2 — EAS Build (cloud, qualquer OS):**
```bash
npm install -g eas-cli
eas build --platform ios
```

---

## Variáveis de ambiente

O app não usa arquivo `.env` diretamente. A URL da API é definida em:

```
src/config/index.ts
```

```typescript
export const API_BASE_URL = 'http://localhost:8000/api/v1';
```

Para apontar para a API em produção ou em uma VM, edite `API_BASE_URL`.
Ao usar Docker com dispositivo físico, use o IP LAN da máquina host
(o mesmo valor de `HOST_IP`).

---

## Arquitetura

### Estrutura de diretórios

```
lunna-app/
├── App.tsx                    # Entry point
├── app.json                   # Expo config (bundle ID, ícones, splash)
├── src/
│   ├── components/
│   │   ├── common/            # Sem lógica de domínio (BottomSheet, Card, etc.)
│   │   └── domain/            # Conhecimento do domínio (RiskBadge)
│   ├── config/                # URL da API e flags de ambiente
│   ├── constants/             # Valores globais do domínio clínico
│   ├── contexts/              # AuthContext (token + user)
│   ├── hooks/                 # Custom hooks (a popular)
│   ├── navigation/            # RootNavigator + navegadores por role
│   ├── screens/
│   │   ├── auth/              # LoginScreen
│   │   ├── patient/           # 13 telas da paciente
│   │   ├── doctor/            # 4 telas do médico
│   │   └── secretary/         # 1 tela da secretária
│   ├── services/              # api.ts, auth.ts, vitals.ts, storage.ts…
│   ├── theme/                 # Paleta de cores e espaçamentos
│   └── types/                 # TypeScript interfaces globais
└── docs/
    ├── plans/                 # Decisões de arquitetura
    └── archive/html-prototype/ # Protótipo HTML original (referência de design)
```

### Autenticação e roteamento

1. `POST /api/v1/auth/login` → `access_token` (24h) + `refresh_token` (7d)
2. Token armazenado em AsyncStorage com chave `gv_access_token`
3. `RootNavigator` lê `user.role` do `AuthContext` e renderiza:
   - `PatientNavigator` — role `patient`
   - `DoctorNavigator` — role `doctor`
   - `SecretaryNavigator` — role `secretary`

### White-label

Após o login, o app chama `GET /api/v1/users/{id}/clinic` e aplica as cores
retornadas via `src/theme/index.ts`. Cores primária, secundária e de destaque
são injetadas globalmente.

---

## Guia de contribuição

### Convenções de commit

```
feat(screen): adiciona tela de exames laboratoriais
fix(glicose): corrige classificação de leitura em jejum
refactor(navigation): extrai tipo de params para arquivo dedicado
```

### Adicionar uma nova tela

1. Criar o arquivo em `src/screens/<role>/NomeDaTela.tsx`
2. Declarar o tipo de params no navigator correspondente (`PatientStackParams`, etc.)
3. Registrar a `Stack.Screen` no navigator
4. Atualizar `CLAUDE.md` com a descrição funcional da tela

### Executar verificação de tipos

```bash
npx tsc --noEmit
```
