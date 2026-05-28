# React Native Migration — Gerar Vida

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar o protótipo HTML/CSS/JS do app Gerar Vida para React Native (Expo), mantendo todo design, navegação e funcionalidades existentes.

**Architecture:** Expo managed workflow para compatibilidade iOS/Android sem configuração nativa manual. React Navigation v6 com três stacks separadas (paciente, médico, secretaria). AsyncStorage substitui localStorage. react-native-svg para os gráficos que usavam Canvas API.

**Tech Stack:** Expo SDK 52, React Navigation 6, @react-native-async-storage/async-storage, react-native-svg, react-native-chart-kit, react-native-gesture-handler, react-native-reanimated

---

## Estrutura de Arquivos

```
GerarVida/                          ← pasta raiz do projeto Expo
├── App.tsx                         ← entry point, RootNavigator
├── app.json                        ← config Expo (nome, ícone, splash)
├── package.json
├── tsconfig.json
├── src/
│   ├── theme/
│   │   └── index.ts                ← design system: cores, tipografia, espaçamentos
│   ├── navigation/
│   │   ├── RootNavigator.tsx       ← choose stack por perfil (paciente/médico/secretaria)
│   │   ├── PatientNavigator.tsx    ← stack das telas da paciente
│   │   ├── DoctorNavigator.tsx     ← stack das telas do médico
│   │   └── SecretaryNavigator.tsx  ← stack da secretaria
│   ├── services/
│   │   └── storage.ts              ← wrapper AsyncStorage (substitui localStorage)
│   ├── components/
│   │   ├── BottomNav.tsx           ← barra de navegação inferior
│   │   ├── ScreenHeader.tsx        ← header padrão com botão voltar
│   │   ├── Card.tsx                ← card branco com sombra
│   │   ├── BottomSheet.tsx         ← modal bottom sheet reutilizável
│   │   ├── StatBox.tsx             ← caixa de estatística (stats-row)
│   │   └── RiskBadge.tsx           ← badge de risco (baixo/atenção/alto)
│   └── screens/
│       ├── LoginScreen.tsx
│       ├── patient/
│       │   ├── OnboardingScreen.tsx
│       │   ├── HomeScreen.tsx
│       │   ├── ChatScreen.tsx
│       │   ├── AreaMedicaScreen.tsx
│       │   ├── PerfilScreen.tsx
│       │   ├── NomesScreen.tsx
│       │   ├── Feto3DScreen.tsx
│       │   ├── ConsultasScreen.tsx
│       │   ├── ContracoesScreen.tsx
│       │   ├── GlicoseScreen.tsx
│       │   ├── PressaoScreen.tsx
│       │   ├── AvisosScreen.tsx
│       │   └── ProntuarioScreen.tsx
│       ├── doctor/
│       │   ├── DashboardMedicoScreen.tsx
│       │   ├── MedicoPacientesScreen.tsx
│       │   ├── PacienteDetalheScreen.tsx
│       │   └── AgendaMedicoScreen.tsx
│       └── secretary/
│           └── DashboardSecretariaScreen.tsx
```

---

## FASE 1 — Fundação

### Task 1: Criar projeto Expo dentro da branch `refacture`

**Files:**
- Create: `GerarVida/` (pasta raiz do projeto Expo)
- Create: `GerarVida/App.tsx`
- Create: `GerarVida/app.json`

- [ ] **Step 1: Instalar Expo CLI globalmente (se não tiver)**

```bash
npm install -g expo-cli
```

- [ ] **Step 2: Criar projeto Expo com TypeScript**

Dentro da pasta `/Desktop/Codigo gestante Clinica` (raiz do repo):

```bash
npx create-expo-app GerarVida --template blank-typescript
```

- [ ] **Step 3: Instalar todas as dependências necessárias**

```bash
cd GerarVida
npx expo install react-native-gesture-handler react-native-reanimated react-native-screens react-native-safe-area-context @react-native-community/masked-view
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install @react-native-async-storage/async-storage
npx expo install react-native-svg
npm install react-native-chart-kit
```

- [ ] **Step 4: Configurar app.json com nome e slug corretos**

```json
{
  "expo": {
    "name": "Gerar Vida",
    "slug": "gerar-vida",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "splash": {
      "backgroundColor": "#F4F6F4"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.gerarvida.app"
    },
    "android": {
      "package": "com.gerarvida.app",
      "adaptiveIcon": {
        "backgroundColor": "#8DAA91"
      }
    }
  }
}
```

- [ ] **Step 5: Verificar que o app sobe sem erros**

```bash
npx expo start
```
Esperado: QR code aparece no terminal, sem erros de build.

- [ ] **Step 6: Commit**

```bash
cd ..
git add GerarVida/
git commit -m "feat(rn): inicializa projeto Expo com dependências base"
git push origin refacture
```

---

### Task 2: Design System — tema de cores e tipografia

**Files:**
- Create: `GerarVida/src/theme/index.ts`

- [ ] **Step 1: Criar pasta src/theme e o arquivo index.ts**

```typescript
// GerarVida/src/theme/index.ts

export const colors = {
  bg: '#F4F6F4',
  primary: '#8DAA91',
  primaryLight: '#C5D5C8',
  primaryDk: '#5E7E63',
  accent: '#E5987D',
  darkCard: '#301B28',
  text: '#2D312E',
  textMid: '#6B7471',
  textSecondary: '#8DAA91',
  textInactive: '#A0AAB2',
  white: '#FFFFFF',
  red: '#E15B5B',
  yellow: '#F5A623',
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  full: 999,
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  h1: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.4 },
  h3: { fontSize: 17, fontWeight: '800' as const, letterSpacing: -0.3 },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.8 },
  body: { fontSize: 14, fontWeight: '400' as const },
  bodyMd: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 11.5, fontWeight: '400' as const },
  tiny: { fontSize: 10, fontWeight: '600' as const },
};
```

- [ ] **Step 2: Commit**

```bash
git add GerarVida/src/theme/
git commit -m "feat(rn): adiciona design system (cores, tipografia, espaçamentos)"
git push origin refacture
```

---

### Task 3: Serviço de Storage — substitui localStorage

**Files:**
- Create: `GerarVida/src/services/storage.ts`

- [ ] **Step 1: Criar o serviço de storage**

```typescript
// GerarVida/src/services/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      // silently fail
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // silently fail
    }
  },
};

// Chaves usadas no app
export const STORAGE_KEYS = {
  onboarded: 'gv_onboarded',
  glicose: 'gv_glicose',
  pressao: 'gv_pressao',
  contracoes: 'gv_contracoes',
  consultaStatus: 'gv_consulta_proxima_status',
  cartaoPaciente: 'gv_cartao_1498',
  consultasMedico: 'gv_consultas_1498',
  usgMedico: 'gv_usg_1498',
  examesMedico: 'gv_exames_1498',
  vacinasMedico: 'gv_vacinas_1498',
  notasMedica: 'gv_notas_medica_1498',
};
```

- [ ] **Step 2: Commit**

```bash
git add GerarVida/src/services/
git commit -m "feat(rn): adiciona serviço de storage (AsyncStorage wrapper)"
git push origin refacture
```

---

### Task 4: Componentes compartilhados

**Files:**
- Create: `GerarVida/src/components/ScreenHeader.tsx`
- Create: `GerarVida/src/components/Card.tsx`
- Create: `GerarVida/src/components/StatBox.tsx`
- Create: `GerarVida/src/components/RiskBadge.tsx`
- Create: `GerarVida/src/components/BottomSheet.tsx`

- [ ] **Step 1: ScreenHeader — header com botão voltar**

```typescript
// GerarVida/src/components/ScreenHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography } from '../theme';

interface Props {
  title: string;
  showBack?: boolean;
}

export function ScreenHeader({ title, showBack = true }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      {showBack && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.title}>{title}</Text>
      {showBack && <View style={styles.placeholder} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  backBtn: { width: 32 },
  backArrow: { fontSize: 22, color: colors.primaryDk },
  title: { flex: 1, textAlign: 'center', ...typography.h3, color: colors.text },
  placeholder: { width: 32 },
});
```

- [ ] **Step 2: Card — card branco com sombra**

```typescript
// GerarVida/src/components/Card.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
});
```

- [ ] **Step 3: StatBox — caixa de estatística**

```typescript
// GerarVida/src/components/StatBox.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

interface Props {
  value: string;
  label: string;
  valueColor?: string;
}

export function StatBox({ value, label, valueColor }: Props) {
  return (
    <View style={styles.box}>
      <Text style={[styles.value, valueColor ? { color: valueColor } : {}]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  value: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  label: { fontSize: 10, fontWeight: '600', color: colors.textInactive, textAlign: 'center' },
});
```

- [ ] **Step 4: RiskBadge — badge de risco**

```typescript
// GerarVida/src/components/RiskBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

type Risk = 'low' | 'med' | 'high';

const config: Record<Risk, { label: string; color: string }> = {
  low:  { label: 'Baixo risco', color: '#3CB371' },
  med:  { label: 'Atenção',     color: colors.yellow },
  high: { label: 'Alto risco',  color: colors.red },
};

interface Props { risk: Risk; }

export function RiskBadge({ risk }: Props) {
  const { label, color } = config[risk];
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 10, fontWeight: '600' },
});
```

- [ ] **Step 5: BottomSheet — modal bottom sheet reutilizável**

```typescript
// GerarVida/src/components/BottomSheet.tsx
import React from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, TouchableWithoutFeedback, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ visible, onClose, title, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />
        {title && <Text style={styles.title}>{title}</Text>}
        <ScrollView showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.textInactive,
    alignSelf: 'center', marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 16 },
});
```

- [ ] **Step 6: Commit**

```bash
git add GerarVida/src/components/
git commit -m "feat(rn): adiciona componentes compartilhados (Header, Card, StatBox, RiskBadge, BottomSheet)"
git push origin refacture
```

---

### Task 5: Navegação — estrutura de rotas

**Files:**
- Create: `GerarVida/src/navigation/RootNavigator.tsx`
- Create: `GerarVida/src/navigation/PatientNavigator.tsx`
- Create: `GerarVida/src/navigation/DoctorNavigator.tsx`
- Create: `GerarVida/src/navigation/SecretaryNavigator.tsx`
- Modify: `GerarVida/App.tsx`

- [ ] **Step 1: Criar stubs de todas as telas (placeholders)**

Criar um arquivo por tela com apenas um componente placeholder. Exemplo para cada tela:

```typescript
// GerarVida/src/screens/LoginScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export function LoginScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.text}>LoginScreen — em construção</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  text: { color: colors.textMid, fontSize: 14 },
});
```

Criar o mesmo stub para TODAS as telas listadas na estrutura de arquivos acima, substituindo apenas o nome. Crie todos os arquivos com o conteúdo acima (mudando só o texto).

- [ ] **Step 2: PatientNavigator**

```typescript
// GerarVida/src/navigation/PatientNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingScreen } from '../screens/patient/OnboardingScreen';
import { HomeScreen } from '../screens/patient/HomeScreen';
import { ChatScreen } from '../screens/patient/ChatScreen';
import { AreaMedicaScreen } from '../screens/patient/AreaMedicaScreen';
import { PerfilScreen } from '../screens/patient/PerfilScreen';
import { NomesScreen } from '../screens/patient/NomesScreen';
import { Feto3DScreen } from '../screens/patient/Feto3DScreen';
import { ConsultasScreen } from '../screens/patient/ConsultasScreen';
import { ContracoesScreen } from '../screens/patient/ContracoesScreen';
import { GlicoseScreen } from '../screens/patient/GlicoseScreen';
import { PressaoScreen } from '../screens/patient/PressaoScreen';
import { AvisosScreen } from '../screens/patient/AvisosScreen';
import { ProntuarioScreen } from '../screens/patient/ProntuarioScreen';

export type PatientStackParams = {
  Onboarding: undefined;
  Home: undefined;
  Chat: undefined;
  AreaMedica: undefined;
  Perfil: undefined;
  Nomes: undefined;
  Feto3D: undefined;
  Consultas: undefined;
  Contracoes: undefined;
  Glicose: undefined;
  Pressao: undefined;
  Avisos: undefined;
  Prontuario: undefined;
};

const Stack = createNativeStackNavigator<PatientStackParams>();

export function PatientNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Home">
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="AreaMedica" component={AreaMedicaScreen} />
      <Stack.Screen name="Perfil" component={PerfilScreen} />
      <Stack.Screen name="Nomes" component={NomesScreen} />
      <Stack.Screen name="Feto3D" component={Feto3DScreen} />
      <Stack.Screen name="Consultas" component={ConsultasScreen} />
      <Stack.Screen name="Contracoes" component={ContracoesScreen} />
      <Stack.Screen name="Glicose" component={GlicoseScreen} />
      <Stack.Screen name="Pressao" component={PressaoScreen} />
      <Stack.Screen name="Avisos" component={AvisosScreen} />
      <Stack.Screen name="Prontuario" component={ProntuarioScreen} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 3: DoctorNavigator**

```typescript
// GerarVida/src/navigation/DoctorNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardMedicoScreen } from '../screens/doctor/DashboardMedicoScreen';
import { MedicoPacientesScreen } from '../screens/doctor/MedicoPacientesScreen';
import { PacienteDetalheScreen } from '../screens/doctor/PacienteDetalheScreen';
import { AgendaMedicoScreen } from '../screens/doctor/AgendaMedicoScreen';

export type DoctorStackParams = {
  DashboardMedico: undefined;
  MedicoPacientes: undefined;
  PacienteDetalhe: undefined;
  AgendaMedico: undefined;
};

const Stack = createNativeStackNavigator<DoctorStackParams>();

export function DoctorNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="DashboardMedico">
      <Stack.Screen name="DashboardMedico" component={DashboardMedicoScreen} />
      <Stack.Screen name="MedicoPacientes" component={MedicoPacientesScreen} />
      <Stack.Screen name="PacienteDetalhe" component={PacienteDetalheScreen} />
      <Stack.Screen name="AgendaMedico" component={AgendaMedicoScreen} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 4: SecretaryNavigator**

```typescript
// GerarVida/src/navigation/SecretaryNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardSecretariaScreen } from '../screens/secretary/DashboardSecretariaScreen';

export type SecretaryStackParams = {
  DashboardSecretaria: undefined;
};

const Stack = createNativeStackNavigator<SecretaryStackParams>();

export function SecretaryNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardSecretaria" component={DashboardSecretariaScreen} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 5: RootNavigator — seletor de perfil**

```typescript
// GerarVida/src/navigation/RootNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { PatientNavigator } from './PatientNavigator';
import { DoctorNavigator } from './DoctorNavigator';
import { SecretaryNavigator } from './SecretaryNavigator';

export type RootStackParams = {
  Login: undefined;
  Patient: undefined;
  Doctor: undefined;
  Secretary: undefined;
};

const Stack = createNativeStackNavigator<RootStackParams>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Patient" component={PatientNavigator} />
      <Stack.Screen name="Doctor" component={DoctorNavigator} />
      <Stack.Screen name="Secretary" component={SecretaryNavigator} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 6: App.tsx — entry point com NavigationContainer**

```typescript
// GerarVida/App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 7: Testar que o app sobe com todas as rotas (stubs)**

```bash
cd GerarVida && npx expo start
```
Esperado: app abre na tela "LoginScreen — em construção". Sem erros de import.

- [ ] **Step 8: Commit**

```bash
cd ..
git add GerarVida/
git commit -m "feat(rn): adiciona estrutura de navegação completa (Patient/Doctor/Secretary stacks)"
git push origin refacture
```

---

## FASE 2 — Telas da Paciente

### Task 6: LoginScreen — seleção de perfil

**Files:**
- Modify: `GerarVida/src/screens/LoginScreen.tsx`

- [ ] **Step 1: Implementar LoginScreen**

```typescript
// GerarVida/src/screens/LoginScreen.tsx
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParams } from '../navigation/RootNavigator';
import { colors, spacing, radius } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParams>;

const profiles = [
  { key: 'Patient',    label: 'Paciente',   icon: '🤰', desc: 'Acompanhe sua gestação' },
  { key: 'Doctor',     label: 'Médica',      icon: '👩‍⚕️', desc: 'Gerencie suas pacientes' },
  { key: 'Secretary',  label: 'Secretaria',  icon: '📋', desc: 'Controle a agenda' },
] as const;

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.logoArea}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>🌱</Text>
        </View>
        <Text style={styles.appName}>Gerar Vida</Text>
        <Text style={styles.tagline}>Acompanhamento pré-natal</Text>
      </View>

      <Text style={styles.selectLabel}>Como deseja entrar?</Text>

      <View style={styles.profileList}>
        {profiles.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={styles.profileCard}
            onPress={() => navigation.replace(p.key)}
            activeOpacity={0.85}
          >
            <Text style={styles.profileIcon}>{p.icon}</Text>
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>{p.label}</Text>
              <Text style={styles.profileDesc}>{p.desc}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  logoArea: { alignItems: 'center', marginBottom: 48 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: { fontSize: 36 },
  appName: { fontSize: 32, fontWeight: '800', color: colors.text, letterSpacing: -0.8 },
  tagline: { fontSize: 14, color: colors.textMid, marginTop: 4 },
  selectLabel: { fontSize: 13, fontWeight: '600', color: colors.textMid, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.8 },
  profileList: { gap: 12 },
  profileCard: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  profileIcon: { fontSize: 32 },
  profileInfo: { flex: 1 },
  profileLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  profileDesc: { fontSize: 12, color: colors.textMid, marginTop: 2 },
  arrow: { fontSize: 24, color: colors.textInactive },
});
```

- [ ] **Step 2: Testar no simulador — 3 cards de perfil aparecem e navegam corretamente**

- [ ] **Step 3: Commit**

```bash
git add GerarVida/src/screens/LoginScreen.tsx
git commit -m "feat(rn): implementa LoginScreen com seleção de perfil"
git push origin refacture
```

---

### Task 7: OnboardingScreen

**Files:**
- Modify: `GerarVida/src/screens/patient/OnboardingScreen.tsx`

- [ ] **Step 1: Implementar OnboardingScreen com 3 slides e swipe**

```typescript
// GerarVida/src/screens/patient/OnboardingScreen.tsx
import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PatientStackParams } from '../../navigation/PatientNavigator';
import { storage, STORAGE_KEYS } from '../../services/storage';
import { colors, spacing, radius } from '../../theme';

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: '🌱',
    title: 'Bem-vinda ao\nGerar Vida',
    desc: 'Seu parceiro digital para um pré-natal completo e tranquilo. Acompanhe cada semana da sua gestação.',
  },
  {
    icon: '🫁',
    title: 'Veja seu bebê\nem 3D',
    desc: 'Explore o desenvolvimento do seu bebê em um modelo 3D interativo e acompanhe cada detalhe.',
  },
  {
    icon: '🏥',
    title: 'Clínica Gerar Vida\nperto de você',
    desc: 'Médico Dedicado · Resultados Online · Canal 24h.\nTudo que você precisa em um só lugar.',
  },
];

type Nav = NativeStackNavigationProp<PatientStackParams>;

export function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const next = async () => {
    if (activeIndex < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      await storage.set(STORAGE_KEYS.onboarded, true);
      navigation.replace('Home');
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 24 }]}>
      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        )}
      />
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
      <TouchableOpacity style={styles.btn} onPress={next} activeOpacity={0.85}>
        <Text style={styles.btnText}>
          {activeIndex < slides.length - 1 ? 'Próximo' : 'Começar'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  slide: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: 80,
  },
  icon: { fontSize: 80, marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.5, marginBottom: 16 },
  desc: { fontSize: 15, color: colors.textMid, textAlign: 'center', lineHeight: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primaryLight },
  dotActive: { backgroundColor: colors.primary, width: 24 },
  btn: {
    marginHorizontal: spacing.lg, backgroundColor: colors.primary,
    borderRadius: radius.full, padding: 18, alignItems: 'center',
  },
  btnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
```

- [ ] **Step 2: Testar — slides funcionam, botão Começar salva onboarded e navega para Home**

- [ ] **Step 3: Commit**

```bash
git add GerarVida/src/screens/patient/OnboardingScreen.tsx
git commit -m "feat(rn): implementa OnboardingScreen com 3 slides e swipe"
git push origin refacture
```

---

### Task 8: HomeScreen — Dashboard da Paciente

**Files:**
- Modify: `GerarVida/src/screens/patient/HomeScreen.tsx`

- [ ] **Step 1: Implementar HomeScreen**

```typescript
// GerarVida/src/screens/patient/HomeScreen.tsx
import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PatientStackParams } from '../../navigation/PatientNavigator';
import { storage, STORAGE_KEYS } from '../../services/storage';
import { colors, spacing, radius } from '../../theme';

type Nav = NativeStackNavigationProp<PatientStackParams>;

const SEMANA = 24;
const PROGRESS = SEMANA / 42;

const quickActions = [
  { label: 'Exames',      icon: '🔬', screen: 'AreaMedica' },
  { label: 'Chat',        icon: '💬', screen: 'Chat' },
  { label: 'Meus Meds',  icon: '💊', screen: 'AreaMedica' },
  { label: 'Consultas',  icon: '📅', screen: 'Consultas' },
  { label: 'Nomes',      icon: '✨', screen: 'Nomes' },
  { label: 'Contrações', icon: '⏱️', screen: 'Contracoes' },
  { label: 'Pressão',    icon: '💓', screen: 'Pressao' },
  { label: 'Glicose',    icon: '🩸', screen: 'Glicose' },
] as const;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    storage.get<boolean>(STORAGE_KEYS.onboarded).then((v) => {
      if (!v) navigation.replace('Onboarding');
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View>
            <Text style={styles.greeting}>Bom dia, Maria 👋</Text>
            <Text style={styles.weekText}>Semana {SEMANA} de gestação</Text>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>MS</Text></View>
        </View>

        {/* PROGRESSO */}
        <View style={styles.progressCard}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${PROGRESS * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>Semana {SEMANA} de 42 · {Math.round(PROGRESS * 100)}%</Text>
        </View>

        {/* ATALHOS RÁPIDOS */}
        <Text style={styles.sectionTitle}>Atalhos Rápidos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          {quickActions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.quickBtn}
              onPress={() => navigation.navigate(a.screen as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.quickIcon}>{a.icon}</Text>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* CARD FETO 3D */}
        <TouchableOpacity
          style={styles.feto3dCard}
          onPress={() => navigation.navigate('Feto3D')}
          activeOpacity={0.9}
        >
          <View>
            <Text style={styles.feto3dTitle}>Seu bebê esta semana</Text>
            <Text style={styles.feto3dSub}>Tamanho de um milho 🌽</Text>
            <View style={styles.feto3dBtn}><Text style={styles.feto3dBtnText}>VER EM 3D</Text></View>
          </View>
          <Text style={{ fontSize: 64 }}>👶</Text>
        </TouchableOpacity>

        {/* PRONTUÁRIO */}
        <TouchableOpacity style={styles.prontuarioCard} onPress={() => navigation.navigate('Prontuario')}>
          <Text style={styles.prontuarioIcon}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.prontuarioTitle}>Meu Prontuário</Text>
            <Text style={styles.prontuarioSub}>Prontuário 2024-00847</Text>
          </View>
          <Text style={{ fontSize: 18, color: colors.primary }}>›</Text>
        </TouchableOpacity>

        {/* AVISOS */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Avisos da Clínica</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Avisos')}>
            <Text style={styles.sectionLink}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.avisoCard}>
          <View style={styles.avisoBadge}><Text style={styles.avisoBadgeText}>Novo</Text></View>
          <Text style={styles.avisoText}>Recesso de Carnaval — Clínica fechada de 1 a 5 de Março</Text>
        </View>

        {/* PRÓXIMA CONSULTA */}
        <TouchableOpacity style={styles.consultaCard} onPress={() => navigation.navigate('Consultas')}>
          <Text style={styles.consultaLabel}>Próxima consulta</Text>
          <Text style={styles.consultaDate}>Sex, 7 Mar · 09:30</Text>
          <Text style={styles.consultaLocal}>Clínica Gerar Vida · Dra. Ana Lima</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white },
  greeting: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  weekText: { fontSize: 12, color: colors.textMid, marginTop: 2 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primaryDk },
  progressCard: { backgroundColor: colors.white, marginHorizontal: spacing.lg, marginTop: 16, borderRadius: radius.md, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  progressBar: { height: 8, backgroundColor: colors.bg, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  progressLabel: { fontSize: 11, color: colors.textMid, marginTop: 8, textAlign: 'right' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginHorizontal: spacing.lg, marginTop: 24, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: spacing.lg, marginTop: 24, marginBottom: 12 },
  sectionLink: { fontSize: 12, fontWeight: '600', color: colors.primary },
  quickRow: { paddingHorizontal: spacing.lg, gap: 12 },
  quickBtn: { alignItems: 'center', gap: 6, width: 64 },
  quickIcon: { fontSize: 28, backgroundColor: colors.white, width: 56, height: 56, textAlign: 'center', lineHeight: 56, borderRadius: radius.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  quickLabel: { fontSize: 10, fontWeight: '600', color: colors.textMid, textAlign: 'center' },
  feto3dCard: { marginHorizontal: spacing.lg, marginTop: 16, backgroundColor: colors.darkCard, borderRadius: radius.lg, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feto3dTitle: { fontSize: 16, fontWeight: '700', color: colors.white, marginBottom: 4 },
  feto3dSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  feto3dBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, alignSelf: 'flex-start' },
  feto3dBtnText: { fontSize: 11, fontWeight: '700', color: colors.white, letterSpacing: 0.5 },
  prontuarioCard: { marginHorizontal: spacing.lg, marginTop: 12, backgroundColor: colors.white, borderRadius: radius.md, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  prontuarioIcon: { fontSize: 24 },
  prontuarioTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  prontuarioSub: { fontSize: 12, color: colors.textMid, marginTop: 2 },
  avisoCard: { marginHorizontal: spacing.lg, backgroundColor: colors.white, borderRadius: radius.md, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avisoBadge: { backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, alignSelf: 'flex-start', marginBottom: 8 },
  avisoBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  avisoText: { fontSize: 13, color: colors.text },
  consultaCard: { marginHorizontal: spacing.lg, marginTop: 12, backgroundColor: colors.primary, borderRadius: radius.lg, padding: 20 },
  consultaLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  consultaDate: { fontSize: 20, fontWeight: '800', color: colors.white, letterSpacing: -0.3 },
  consultaLocal: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
});
```

- [ ] **Step 2: Testar — todos os cards e botões navegam corretamente**

- [ ] **Step 3: Commit**

```bash
git add GerarVida/src/screens/patient/HomeScreen.tsx
git commit -m "feat(rn): implementa HomeScreen (dashboard da paciente)"
git push origin refacture
```

---

### Task 9: ContracoesScreen

**Files:**
- Modify: `GerarVida/src/screens/patient/ContracoesScreen.tsx`

- [ ] **Step 1: Implementar ContracoesScreen com press-and-hold**

```typescript
// GerarVida/src/screens/patient/ContracoesScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Alert, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StatBox } from '../../components/StatBox';
import { storage, STORAGE_KEYS } from '../../services/storage';
import { colors, spacing, radius } from '../../theme';

interface Contracao {
  id: number;
  hora: string;
  duracao: number;
  intervalo: number | null;
}

export function ContracoesScreen() {
  const [contracoes, setContracoes] = useState<Contracao[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const startTime = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    storage.get<Contracao[]>(STORAGE_KEYS.contracoes).then((v) => {
      if (v) setContracoes(v);
    });
  }, []);

  const avgDuracao = contracoes.length
    ? Math.round(contracoes.reduce((s, c) => s + c.duracao, 0) / contracoes.length)
    : 0;

  const avgIntervalo = contracoes.filter((c) => c.intervalo !== null).length
    ? Math.round(
        contracoes.filter((c) => c.intervalo !== null).reduce((s, c) => s + (c.intervalo ?? 0), 0) /
          contracoes.filter((c) => c.intervalo !== null).length
      )
    : 0;

  const startPress = () => {
    setIsActive(true);
    setSeconds(0);
    startTime.current = Date.now();
    intervalRef.current = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
  };

  const endPress = async () => {
    if (!isActive) return;
    setIsActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const duracao = Math.round((Date.now() - (startTime.current ?? Date.now())) / 1000);
    const last = contracoes[0];
    const agora = new Date();
    const intervalo = last
      ? Math.round((agora.getTime() - new Date(`${agora.toDateString()} ${last.hora}`).getTime()) / 60000)
      : null;

    const nova: Contracao = {
      id: Date.now(),
      hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      duracao,
      intervalo,
    };

    const updated = [nova, ...contracoes];
    setContracoes(updated);
    await storage.set(STORAGE_KEYS.contracoes, updated);
    setSeconds(0);
  };

  const limpar = async () => {
    Alert.alert('Limpar sessão', 'Deseja apagar todas as contrações?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpar', style: 'destructive',
        onPress: async () => {
          setContracoes([]);
          await storage.remove(STORAGE_KEYS.contracoes);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Contrações" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        {/* STATS */}
        <View style={styles.statsRow}>
          <StatBox value={String(contracoes.length)} label="Total" />
          <StatBox value={avgDuracao ? `${avgDuracao}s` : '—'} label="Duração média" />
          <StatBox value={avgIntervalo ? `${avgIntervalo}min` : '—'} label="Intervalo médio" />
        </View>

        {/* BOTÃO */}
        <View style={styles.btnWrap}>
          <Text style={styles.hint}>
            {isActive ? `Contração em curso: ${seconds}s` : 'Pressione e segure durante a contração'}
          </Text>
          <TouchableOpacity
            style={[styles.bigBtn, isActive && styles.bigBtnActive]}
            onPressIn={startPress}
            onPressOut={endPress}
            activeOpacity={0.9}
          >
            <Text style={styles.bigBtnText}>{isActive ? `${seconds}s` : 'SEGURAR'}</Text>
          </TouchableOpacity>
        </View>

        {/* LISTA */}
        {contracoes.length > 0 && (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Registro</Text>
              <TouchableOpacity onPress={limpar}>
                <Text style={styles.clearBtn}>Limpar</Text>
              </TouchableOpacity>
            </View>
            {contracoes.map((c, i) => (
              <View key={c.id} style={styles.row}>
                <Text style={styles.rowIndex}>#{contracoes.length - i}</Text>
                <Text style={styles.rowHora}>{c.hora}</Text>
                <Text style={styles.rowDur}>{c.duracao}s</Text>
                <Text style={styles.rowInt}>{c.intervalo != null ? `${c.intervalo}min` : '—'}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  btnWrap: { alignItems: 'center', marginBottom: 32 },
  hint: { fontSize: 13, color: colors.textMid, marginBottom: 24, textAlign: 'center' },
  bigBtn: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  bigBtnActive: { backgroundColor: colors.accent, shadowColor: colors.accent },
  bigBtnText: { fontSize: 22, fontWeight: '800', color: colors.white },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  clearBtn: { fontSize: 13, fontWeight: '600', color: colors.accent },
  row: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.md, padding: 14, marginBottom: 8, alignItems: 'center', gap: 12 },
  rowIndex: { fontSize: 12, color: colors.textInactive, width: 28 },
  rowHora: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  rowDur: { fontSize: 13, color: colors.primaryDk, fontWeight: '600', width: 48, textAlign: 'right' },
  rowInt: { fontSize: 13, color: colors.textMid, width: 52, textAlign: 'right' },
});
```

- [ ] **Step 2: Testar — press-and-hold registra contração, lista atualiza, dados persistem**

- [ ] **Step 3: Commit**

```bash
git add GerarVida/src/screens/patient/ContracoesScreen.tsx
git commit -m "feat(rn): implementa ContracoesScreen com press-and-hold e persistência"
git push origin refacture
```

---

### Tasks 10–13: GlicoseScreen, PressaoScreen, ConsultasScreen, ChatScreen

> **Nota:** Seguir o mesmo padrão das tasks anteriores. Cada uma com:
> 1. Implementar a tela com dados mock + integração AsyncStorage
> 2. Testar no simulador
> 3. Commit individual por tela

**GlicoseScreen:** Lista de medições, modal de registro, gráfico com `react-native-chart-kit`, classificação Normal/Atenção/Alto.

**PressaoScreen:** Lista de medições sistólica/diastólica, modal de registro, gráfico duplo.

**ConsultasScreen:** Próxima consulta com botões Confirmar/Remarcar (bottom sheet), histórico colapsável.

**ChatScreen:** Balões de mensagem, textarea, auto-resposta com delay de 1.8s.

---

### Tasks 14–18: Telas restantes da paciente

> Seguir o mesmo padrão.

**AreaMedicaScreen:** Tabs Exames / Medicamentos com lista de itens mock.

**NomesScreen:** Grade de nomes com filtro de gênero, bottom sheet com gráfico de popularidade.

**PerfilScreen:** Card de perfil, card da clínica, menus com toggles.

**AvisosScreen:** Lista com accordion, filtros por categoria, badge "Novo".

**ProntuarioScreen:** Card escuro no topo, tabelas de evolução, seções de intercorrências.

**Feto3DScreen:** Imagem do feto com hotspots, zoom com pinch gesture, pan com drag.

---

## FASE 3 — Telas do Médico

### Tasks 19–22: DashboardMedico, MedicoPacientes, PacienteDetalhe, AgendaMedico

> Seguir o mesmo padrão de implementação. Cada tela em um commit separado.

**DashboardMedicoScreen:** Header, clinic badge, stats, timeline de consultas, lista de pacientes com badges de risco.

**MedicoPacientesScreen:** Barra de busca, filtros de risco, lista de pacientes clicáveis.

**PacienteDetalheScreen:** 2 abas (Cartão / Sinais Vitais), todas as seções do cartão gestacional com campos editáveis, formulários colapsáveis para consultas, USGs, exames, vacinas, notas.

**AgendaMedicoScreen:** 3 abas (Dia / Semana / Partos Previstos), timeline do dia, strip semanal.

---

## FASE 4 — Secretaria

### Task 23: DashboardSecretariaScreen

> Seguir o mesmo padrão. Stats, agenda do dia com status, lista de pacientes, FAB.

---

## FASE 5 — Build nativo para Xcode e Android Studio

### Task 24: Configurar builds nativos

**Files:**
- Create: `GerarVida/ios/` (gerado pelo Expo)
- Create: `GerarVida/android/` (gerado pelo Expo)

- [ ] **Step 1: Gerar pastas nativas**

```bash
cd GerarVida
npx expo run:ios --configuration Release
# ou para Android:
npx expo run:android --variant release
```

- [ ] **Step 2: Testar no simulador iOS (Xcode)**

```bash
npx expo run:ios
```

- [ ] **Step 3: Testar no emulador Android (Android Studio)**

```bash
npx expo run:android
```

- [ ] **Step 4: Commit final**

```bash
git add .
git commit -m "feat(rn): adiciona builds nativos iOS e Android"
git push origin refacture
```

---

## Como testar no Xcode e Android Studio após cada push

### Opção 1 — Expo Go (mais rápido, sem build)

```bash
# No seu Mac, terminal:
git pull origin refacture
cd GerarVida
npm install          # apenas se houver novos pacotes
npx expo start
```
Abra o app **Expo Go** no iPhone/Android e escaneie o QR code. Qualquer save recarrega automaticamente.

### Opção 2 — Simulador iOS nativo (Xcode necessário)

```bash
git pull origin refacture
cd GerarVida
npm install
npx expo run:ios
```
Abre o simulador iOS automaticamente.

### Opção 3 — Emulador Android nativo (Android Studio necessário)

```bash
git pull origin refacture
cd GerarVida
npm install
npx expo run:android
```
Precisa de um emulador Android criado no Android Studio (AVD Manager).

### Fluxo de atualização após cada task

```bash
# Sempre que eu fizer push de uma task nova:
git pull origin refacture   # baixa as mudanças
cd GerarVida
npm install                  # se houver novos pacotes
# O Expo recarrega automaticamente se npx expo start já estiver rodando
```

---

*Plano criado em 2026-04-15 · branch: refacture · 24 tasks · 5 fases*
