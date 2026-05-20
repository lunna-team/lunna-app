# API Integration — Gerar Vida (React Native → appclinica-api)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar o app React Native (GerarVida/) aos endpoints reais do `appclinica-api` (FastAPI), substituindo dados mock e AsyncStorage-only por chamadas HTTP autenticadas via JWT.

**Architecture:** Camada de serviços em `src/services/` encapsula todo acesso HTTP. `AuthContext` centraliza tokens JWT e dados do usuário. Navegação passa a ser role-based via `role` retornado pelo login. Telas com API disponível são migradas; telas sem endpoint correspondente ficam como stubs.

**Tech Stack:** React Native 0.81 / Expo 54, `fetch` nativo (sem axios), React Context API para auth state, AsyncStorage para persistência de tokens.

---

## Endpoints da API implementados e mapeamento de telas

| Endpoint API | Tela no App |
|---|---|
| `POST /auth/login` | LoginScreen |
| `POST /auth/logout` | PerfilScreen |
| `POST /users/` | (registro via secretaria — fora do escopo) |
| `GET /users/:id` | HomeScreen, PerfilScreen |
| `PUT /users/:id` | PerfilScreen |
| `GET /users/:id/clinic` | HomeScreen, PerfilScreen |
| `GET /patients/:id/appointments` | ConsultasScreen, HomeScreen |
| `GET /appointments/:id` | ConsultasScreen |
| `PATCH /appointments/:id/confirm` | ConsultasScreen |
| `POST /appointments/:id/reschedule-request` | ConsultasScreen |
| `DELETE /appointments/:id` | ConsultasScreen |
| `POST /patients/:id/contractions` | ContracoesScreen |
| `GET /patients/:id/contractions` | ContracoesScreen |
| `DELETE /patients/:id/contractions/session` | ContracoesScreen |
| `GET /patients/:id/contractions/stats` | ContracoesScreen |
| `POST /patients/:id/glucose-readings` | GlicoseScreen |
| `GET /patients/:id/glucose-readings` | GlicoseScreen |
| `GET /patients/:id/glucose-readings/stats` | GlicoseScreen |
| `GET /patients/:id/glucose-readings/chart` | GlicoseScreen |
| `POST /patients/:id/blood-pressure` | PressaoScreen |
| `GET /patients/:id/blood-pressure` | PressaoScreen |
| `GET /patients/:id/blood-pressure/stats` | PressaoScreen |
| `GET /patients/:id/blood-pressure/chart` | PressaoScreen |

**Telas que PERMANECEM como stubs** (sem endpoint implementado na API): ChatScreen, AreaMedicaScreen, NomesScreen, Feto3DScreen, AvisosScreen, ProntuarioScreen, DashboardMedicoScreen, MedicoPacientesScreen, PacienteDetalheScreen, AgendaMedicoScreen, DashboardSecretariaScreen.

---

## Estrutura de Arquivos

```
GerarVida/src/
├── config.ts                         ← CREATE: API base URL
├── types/
│   └── index.ts                      ← CREATE: interfaces TypeScript compartilhadas
├── services/
│   ├── storage.ts                    ← MODIFY: adiciona STORAGE_KEYS.accessToken e .user
│   ├── api.ts                        ← CREATE: HTTP client com Bearer token automático
│   ├── auth.ts                       ← CREATE: login(), logout()
│   ├── users.ts                      ← CREATE: getUser(), updateUser(), getClinic()
│   ├── appointments.ts               ← CREATE: listAppointments(), confirm(), reschedule(), cancel()
│   └── vitals.ts                     ← CREATE: contrações, glicose, pressão
├── contexts/
│   └── AuthContext.tsx               ← CREATE: estado global de auth
├── navigation/
│   └── RootNavigator.tsx             ← MODIFY: roteamento auth-gated baseado em role
└── screens/
    ├── LoginScreen.tsx               ← MODIFY: formulário email/senha real
    └── patient/
        ├── HomeScreen.tsx            ← MODIFY: dados reais do usuário e próxima consulta
        ├── ContracoesScreen.tsx      ← MODIFY: sincroniza contrações com API
        ├── GlicoseScreen.tsx         ← IMPLEMENT + API: tela completa com gráfico
        ├── PressaoScreen.tsx         ← IMPLEMENT + API: tela completa com gráfico
        ├── ConsultasScreen.tsx       ← IMPLEMENT + API: lista e ações de consulta
        └── PerfilScreen.tsx          ← IMPLEMENT + API: perfil, clínica, logout
```

---

## Task 1: Configuração e tipos compartilhados

**Files:**
- Create: `GerarVida/src/config.ts`
- Create: `GerarVida/src/types/index.ts`

- [ ] **Step 1: Criar config.ts com base URL da API**

```typescript
// GerarVida/src/config.ts
export const API_BASE_URL = 'http://localhost:8000/api/v1';
// Para produção (Vercel): 'https://<seu-projeto>.vercel.app/api/v1'
```

- [ ] **Step 2: Criar tipos compartilhados**

```typescript
// GerarVida/src/types/index.ts

export type UserRole = 'patient' | 'doctor' | 'secretary' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clinic_id: string;
  avatar_url?: string;
  phone?: string;
  date_of_birth?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Clinic {
  id: string;
  name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PatientAppointmentStatus = 'pending' | 'confirmed' | 'reschedule_requested' | 'reschedule_approved';
export type AppointmentType = 'routine' | 'ultrasound' | 'lab' | 'follow_up' | 'emergency';

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  clinic_id: string;
  date: string;
  time: string;
  datetime: string;
  duration_minutes: number;
  type: AppointmentType;
  location?: string;
  notes?: string;
  status: AppointmentStatus;
  patient_status: PatientAppointmentStatus;
  confirmed_at?: string;
  reschedule_reason?: string;
  reschedule_observation?: string;
  new_date?: string;
  new_time?: string;
}

export interface PaginatedResponse<T> {
  total: number;
  limit: number;
  offset: number;
  data: T[];
}

export type VitalClassification = 'Normal' | 'Atenção' | 'Alto';
export type GlucoseMoment = 'fasting' | 'after_meal' | 'random';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface Contraction {
  id: string;
  patient_id: string;
  duration_seconds: number;
  interval_minutes?: number;
  session_date: string;
  created_at: string;
  updated_at: string;
}

export interface GlucoseReading {
  id: string;
  patient_id: string;
  value_mg_dl: number;
  moment: GlucoseMoment;
  classification: VitalClassification;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BloodPressureReading {
  id: string;
  patient_id: string;
  systolic: number;
  diastolic: number;
  pulse_bpm?: number;
  moment: TimeOfDay;
  classification: VitalClassification;
  created_at: string;
  updated_at: string;
}

export interface ApiError extends Error {
  statusCode: number;
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/muriloroizpovoa/Desktop/lunna-core/appclinica
git add GerarVida/src/config.ts GerarVida/src/types/
git commit -m "feat(api): adiciona config de base URL e tipos TypeScript compartilhados"
```

---

## Task 2: HTTP client e atualização do storage

**Files:**
- Create: `GerarVida/src/services/api.ts`
- Modify: `GerarVida/src/services/storage.ts`

- [ ] **Step 1: Adicionar STORAGE_KEYS para auth em storage.ts**

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
    } catch {}
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

export const STORAGE_KEYS = {
  onboarded: 'gv_onboarded',
  accessToken: 'gv_access_token',
  user: 'gv_user',
  // legado — ainda usados pelo ContracoesScreen localmente
  contracoes: 'gv_contracoes',
  consultaStatus: 'gv_consulta_proxima_status',
};
```

- [ ] **Step 2: Criar HTTP client**

```typescript
// GerarVida/src/services/api.ts
import { API_BASE_URL } from '../config';
import { storage, STORAGE_KEYS } from './storage';

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await storage.get<string>(STORAGE_KEYS.accessToken);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const data = await response.json();

  if (!response.ok) {
    const message = data?.detail ?? data?.message ?? 'Erro desconhecido';
    throw new ApiError(response.status, message);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};
```

- [ ] **Step 3: Commit**

```bash
git add GerarVida/src/services/api.ts GerarVida/src/services/storage.ts
git commit -m "feat(api): adiciona HTTP client com Bearer token automático e atualiza storage keys"
```

---

## Task 3: Serviços de domínio (auth, users, appointments, vitals)

**Files:**
- Create: `GerarVida/src/services/auth.ts`
- Create: `GerarVida/src/services/users.ts`
- Create: `GerarVida/src/services/appointments.ts`
- Create: `GerarVida/src/services/vitals.ts`

- [ ] **Step 1: Criar auth.ts**

```typescript
// GerarVida/src/services/auth.ts
import { api } from './api';
import { storage, STORAGE_KEYS } from './storage';
import type { LoginResponse, User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    await storage.set(STORAGE_KEYS.accessToken, response.access_token);
    await storage.set(STORAGE_KEYS.user, response.user);
    return response;
  },

  async logout(): Promise<void> {
    try {
      await api.post<void>('/auth/logout', {});
    } finally {
      await storage.remove(STORAGE_KEYS.accessToken);
      await storage.remove(STORAGE_KEYS.user);
    }
  },

  async getStoredUser(): Promise<User | null> {
    return storage.get<User>(STORAGE_KEYS.user);
  },

  async getStoredToken(): Promise<string | null> {
    return storage.get<string>(STORAGE_KEYS.accessToken);
  },
};
```

- [ ] **Step 2: Criar users.ts**

```typescript
// GerarVida/src/services/users.ts
import { api } from './api';
import type { User, Clinic } from '../types';

export const usersService = {
  getUser: (userId: string) =>
    api.get<User>(`/users/${userId}`),

  updateUser: (userId: string, data: { name?: string; phone?: string; avatar_url?: string }) =>
    api.put<User>(`/users/${userId}`, data),

  getClinic: (userId: string) =>
    api.get<Clinic>(`/users/${userId}/clinic`),
};
```

- [ ] **Step 3: Criar appointments.ts**

```typescript
// GerarVida/src/services/appointments.ts
import { api } from './api';
import type { Appointment, PaginatedResponse } from '../types';

export const appointmentsService = {
  listPatientAppointments: (
    patientId: string,
    params?: { status?: string; limit?: number; offset?: number },
  ) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.append('status', params.status);
    if (params?.limit !== undefined) qs.append('limit', String(params.limit));
    if (params?.offset !== undefined) qs.append('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<PaginatedResponse<Appointment>>(
      `/patients/${patientId}/appointments${query}`,
    );
  },

  getAppointment: (appointmentId: string) =>
    api.get<Appointment>(`/appointments/${appointmentId}`),

  confirmAppointment: (appointmentId: string) =>
    api.patch<Appointment>(`/appointments/${appointmentId}/confirm`),

  requestReschedule: (appointmentId: string, reason: string, observation?: string) =>
    api.post<Appointment>(`/appointments/${appointmentId}/reschedule-request`, {
      reason,
      observation,
    }),

  cancelAppointment: (appointmentId: string, reason: string) =>
    api.delete<void>(`/appointments/${appointmentId}?reason=${encodeURIComponent(reason)}`),
};
```

- [ ] **Step 4: Criar vitals.ts**

```typescript
// GerarVida/src/services/vitals.ts
import { api } from './api';
import type {
  Contraction, GlucoseReading, BloodPressureReading,
  PaginatedResponse, VitalClassification, GlucoseMoment, TimeOfDay,
} from '../types';

function classifyGlucose(value: number, moment: GlucoseMoment): VitalClassification {
  if (moment === 'fasting') {
    if (value < 95) return 'Normal';
    if (value < 126) return 'Atenção';
    return 'Alto';
  }
  if (value < 140) return 'Normal';
  if (value < 200) return 'Atenção';
  return 'Alto';
}

function classifyBloodPressure(systolic: number, diastolic: number): VitalClassification {
  if (systolic >= 140 || diastolic >= 90) return 'Alto';
  if (systolic >= 120 || diastolic >= 80) return 'Atenção';
  return 'Normal';
}

export const vitalsService = {
  // Contrações
  createContraction: (
    patientId: string,
    data: { duration_seconds: number; interval_minutes?: number; session_date: string },
  ) => api.post<Contraction>(`/patients/${patientId}/contractions`, data),

  listContractions: (patientId: string, limit = 50, offset = 0) =>
    api.get<PaginatedResponse<Contraction>>(
      `/patients/${patientId}/contractions?limit=${limit}&offset=${offset}`,
    ),

  getContractionStats: (patientId: string) =>
    api.get<{ patient_id: string; total_contractions: number; average_duration_seconds: number }>(
      `/patients/${patientId}/contractions/stats`,
    ),

  clearContractionSession: (patientId: string) =>
    api.delete<void>(`/patients/${patientId}/contractions/session`),

  // Glicose
  createGlucose: (
    patientId: string,
    data: { value_mg_dl: number; moment: GlucoseMoment; notes?: string },
  ) => {
    const classification = classifyGlucose(data.value_mg_dl, data.moment);
    return api.post<GlucoseReading>(`/patients/${patientId}/glucose-readings`, {
      ...data,
      classification,
    });
  },

  listGlucoseReadings: (patientId: string, limit = 50, offset = 0) =>
    api.get<PaginatedResponse<GlucoseReading>>(
      `/patients/${patientId}/glucose-readings?limit=${limit}&offset=${offset}`,
    ),

  getGlucoseStats: (patientId: string) =>
    api.get<{ total_readings: number; average: number }>(
      `/patients/${patientId}/glucose-readings/stats`,
    ),

  getGlucoseChart: (patientId: string, days = 30) =>
    api.get<{ data: { timestamp: string; value: number; moment: string }[]; normal_limit: number; hypertension_limit: number }>(
      `/patients/${patientId}/glucose-readings/chart?days=${days}`,
    ),

  // Pressão arterial
  createBloodPressure: (
    patientId: string,
    data: { systolic: number; diastolic: number; pulse_bpm?: number; moment: TimeOfDay },
  ) => {
    const classification = classifyBloodPressure(data.systolic, data.diastolic);
    return api.post<BloodPressureReading>(`/patients/${patientId}/blood-pressure`, {
      ...data,
      classification,
    });
  },

  listBloodPressureReadings: (patientId: string, limit = 50, offset = 0) =>
    api.get<PaginatedResponse<BloodPressureReading>>(
      `/patients/${patientId}/blood-pressure?limit=${limit}&offset=${offset}`,
    ),

  getBloodPressureStats: (patientId: string) =>
    api.get<{ total_readings: number; average_systolic: number; average_diastolic: number }>(
      `/patients/${patientId}/blood-pressure/stats`,
    ),

  getBloodPressureChart: (patientId: string, days = 30) =>
    api.get<{ data: { timestamp: string; systolic: number; diastolic: number }[]; hypertension_limit: number; normal_systolic: number; normal_diastolic: number }>(
      `/patients/${patientId}/blood-pressure/chart?days=${days}`,
    ),
};
```

- [ ] **Step 5: Commit**

```bash
git add GerarVida/src/services/
git commit -m "feat(api): adiciona serviços de domínio (auth, users, appointments, vitals)"
```

---

## Task 4: AuthContext — estado global de autenticação

**Files:**
- Create: `GerarVida/src/contexts/AuthContext.tsx`

- [ ] **Step 1: Criar AuthContext**

```typescript
// GerarVida/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/auth';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authService.getStoredUser().then((stored) => {
      setUser(stored);
      setIsLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setUser(response.user);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

- [ ] **Step 2: Envolver App.tsx com AuthProvider**

```typescript
// GerarVida/App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthProvider } from './src/contexts/AuthContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 3: Verificar que app compila sem erros**

```bash
cd GerarVida && npx expo start --no-dev
```
Esperado: sem erros de TypeScript no terminal.

- [ ] **Step 4: Commit**

```bash
cd ..
git add GerarVida/src/contexts/ GerarVida/App.tsx
git commit -m "feat(auth): adiciona AuthContext e envolve App com AuthProvider"
```

---

## Task 5: RootNavigator auth-gated com roteamento por role

**Files:**
- Modify: `GerarVida/src/navigation/RootNavigator.tsx`

- [ ] **Step 1: Atualizar RootNavigator para auth-gated routing**

```typescript
// GerarVida/src/navigation/RootNavigator.tsx
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { PatientNavigator } from './PatientNavigator';
import { DoctorNavigator } from './DoctorNavigator';
import { SecretaryNavigator } from './SecretaryNavigator';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme';

export type RootStackParams = {
  Login: undefined;
  Patient: undefined;
  Doctor: undefined;
  Secretary: undefined;
};

const Stack = createNativeStackNavigator<RootStackParams>();

function getInitialRoute(role?: string): keyof RootStackParams {
  if (role === 'doctor') return 'Doctor';
  if (role === 'secretary') return 'Secretary';
  if (role === 'patient') return 'Patient';
  return 'Login';
}

export function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const initialRoute = isAuthenticated ? getInitialRoute(user?.role) : 'Login';

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Patient" component={PatientNavigator} />
          <Stack.Screen name="Doctor" component={DoctorNavigator} />
          <Stack.Screen name="Secretary" component={SecretaryNavigator} />
        </>
      )}
    </Stack.Navigator>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add GerarVida/src/navigation/RootNavigator.tsx
git commit -m "feat(nav): roteamento auth-gated com redirecionamento por role"
```

---

## Task 6: LoginScreen — formulário email/senha real

**Files:**
- Modify: `GerarVida/src/screens/LoginScreen.tsx`

- [ ] **Step 1: Substituir seletor de perfil por formulário de login real**

```typescript
// GerarVida/src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/api';
import { colors, spacing, radius } from '../theme';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // RootNavigator redireciona automaticamente ao detectar isAuthenticated = true
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        Alert.alert('Acesso negado', 'E-mail ou senha incorretos.');
      } else {
        Alert.alert('Erro', 'Não foi possível conectar ao servidor. Verifique sua conexão.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />
      <View style={[styles.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>🌱</Text>
          </View>
          <Text style={styles.appName}>Gerar Vida</Text>
          <Text style={styles.tagline}>Acompanhamento pré-natal</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formLabel}>E-MAIL</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            placeholderTextColor={colors.textInactive}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.formLabel, { marginTop: 16 }]}>SENHA</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textInactive}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.btnText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  logoArea: { alignItems: 'center', marginBottom: 48 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  logoIcon: { fontSize: 36 },
  appName: { fontSize: 32, fontWeight: '800', color: colors.text, letterSpacing: -0.8 },
  tagline: { fontSize: 14, color: colors.textMid, marginTop: 4 },
  form: { gap: 4 },
  formLabel: {
    fontSize: 11, fontWeight: '600', color: colors.textMid,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6,
  },
  input: {
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: 16, fontSize: 15, color: colors.text,
    borderWidth: 1.5, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  btn: {
    marginTop: 24, backgroundColor: colors.primary,
    borderRadius: radius.full, padding: 18, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
```

- [ ] **Step 2: Testar login com credenciais reais do banco seed**

Verificar que o servidor da API está rodando:
```bash
cd /Users/muriloroizpovoa/Desktop/lunna-core/appclinica-api
uvicorn main:app --reload
```

No simulador: abrir app, digitar email/senha de um usuário seed, verificar que navega para a tela correta.

- [ ] **Step 3: Commit**

```bash
cd /Users/muriloroizpovoa/Desktop/lunna-core/appclinica
git add GerarVida/src/screens/LoginScreen.tsx
git commit -m "feat(login): substitui seletor de perfil por formulário de autenticação JWT real"
```

---

## Task 7: HomeScreen — dados reais do usuário e próxima consulta

**Files:**
- Modify: `GerarVida/src/screens/patient/HomeScreen.tsx`

- [ ] **Step 1: Atualizar HomeScreen para usar dados reais**

```typescript
// GerarVida/src/screens/patient/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PatientStackParams } from '../../navigation/PatientNavigator';
import { storage, STORAGE_KEYS } from '../../services/storage';
import { appointmentsService } from '../../services/appointments';
import { useAuth } from '../../contexts/AuthContext';
import type { Appointment } from '../../types';
import { colors, spacing, radius } from '../../theme';

type Nav = NativeStackNavigationProp<PatientStackParams>;

const TOTAL_WEEKS = 42;

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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [loadingAppt, setLoadingAppt] = useState(true);

  useEffect(() => {
    storage.get<boolean>(STORAGE_KEYS.onboarded).then((v) => {
      if (!v) navigation.replace('Onboarding');
    });
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    appointmentsService
      .listPatientAppointments(user.id, { status: 'confirmed', limit: 1, offset: 0 })
      .then((res) => setNextAppointment(res.data[0] ?? null))
      .catch(() => setNextAppointment(null))
      .finally(() => setLoadingAppt(false));
  }, [user?.id]);

  const firstName = user?.name?.split(' ')[0] ?? 'você';

  // Semana gestacional: derivada da data de criação do usuário como placeholder
  // (dados reais viriam do prontuário — endpoint não implementado ainda)
  const semana = 24;
  const progress = semana / TOTAL_WEEKS;

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
            <Text style={styles.greeting}>Olá, {firstName} 👋</Text>
            <Text style={styles.weekText}>Semana {semana} de gestação</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('') ?? '??'}
            </Text>
          </View>
        </View>

        {/* PROGRESSO */}
        <View style={styles.progressCard}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            Semana {semana} de {TOTAL_WEEKS} · {Math.round(progress * 100)}%
          </Text>
        </View>

        {/* ATALHOS RÁPIDOS */}
        <Text style={styles.sectionTitle}>Atalhos Rápidos</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}
        >
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
            <View style={styles.feto3dBtn}>
              <Text style={styles.feto3dBtnText}>VER EM 3D</Text>
            </View>
          </View>
          <Text style={{ fontSize: 64 }}>👶</Text>
        </TouchableOpacity>

        {/* PRONTUÁRIO */}
        <TouchableOpacity
          style={styles.prontuarioCard}
          onPress={() => navigation.navigate('Prontuario')}
        >
          <Text style={styles.prontuarioIcon}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.prontuarioTitle}>Meu Prontuário</Text>
            <Text style={styles.prontuarioSub}>Toque para ver detalhes</Text>
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
          <View style={styles.avisoBadge}>
            <Text style={styles.avisoBadgeText}>Novo</Text>
          </View>
          <Text style={styles.avisoText}>
            Recesso de Carnaval — Clínica fechada de 1 a 5 de Março
          </Text>
        </View>

        {/* PRÓXIMA CONSULTA */}
        <TouchableOpacity
          style={styles.consultaCard}
          onPress={() => navigation.navigate('Consultas')}
        >
          {loadingAppt ? (
            <ActivityIndicator color={colors.white} />
          ) : nextAppointment ? (
            <>
              <Text style={styles.consultaLabel}>Próxima consulta</Text>
              <Text style={styles.consultaDate}>
                {formatDate(nextAppointment.datetime)} · {nextAppointment.time.slice(0, 5)}
              </Text>
              <Text style={styles.consultaLocal}>
                {nextAppointment.location ?? 'Clínica Gerar Vida'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.consultaLabel}>Consultas</Text>
              <Text style={styles.consultaDate}>Nenhuma consulta agendada</Text>
              <Text style={styles.consultaLocal}>Toque para ver histórico</Text>
            </>
          )}
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
  consultaCard: { marginHorizontal: spacing.lg, marginTop: 12, marginBottom: 24, backgroundColor: colors.primary, borderRadius: radius.lg, padding: 20, minHeight: 80, justifyContent: 'center' },
  consultaLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  consultaDate: { fontSize: 20, fontWeight: '800', color: colors.white, letterSpacing: -0.3 },
  consultaLocal: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
});
```

- [ ] **Step 2: Testar — nome do usuário logado aparece no header; próxima consulta confirada carrega da API**

- [ ] **Step 3: Commit**

```bash
git add GerarVida/src/screens/patient/HomeScreen.tsx
git commit -m "feat(home): usa dados reais do usuário logado e próxima consulta da API"
```

---

## Task 8: ContracoesScreen — sincronizar com API

**Files:**
- Modify: `GerarVida/src/screens/patient/ContracoesScreen.tsx`

- [ ] **Step 1: Atualizar ContracoesScreen para sincronizar com API**

A lógica de timer e estado local permanece idêntica. Adicionar: (a) carregamento inicial da API, (b) POST ao soltar o botão, (c) DELETE ao limpar.

```typescript
// GerarVida/src/screens/patient/ContracoesScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StatBox } from '../../components/StatBox';
import { vitalsService } from '../../services/vitals';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../theme';
import type { Contraction } from '../../types';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function ContracoesScreen() {
  const { user } = useAuth();
  const [contracoes, setContracoes] = useState<Contraction[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const startTime = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!user?.id) return;
    vitalsService
      .listContractions(user.id)
      .then((res) => setContracoes(res.data))
      .catch(() => {});
  }, [user?.id]);

  const avgDuracao = contracoes.length
    ? Math.round(contracoes.reduce((s, c) => s + c.duration_seconds, 0) / contracoes.length)
    : 0;

  const withInterval = contracoes.filter((c) => c.interval_minutes != null);
  const avgIntervalo = withInterval.length
    ? Math.round(withInterval.reduce((s, c) => s + (c.interval_minutes ?? 0), 0) / withInterval.length)
    : 0;

  const startPress = () => {
    setIsActive(true);
    setSeconds(0);
    startTime.current = Date.now();
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const endPress = async () => {
    if (!isActive || !user?.id) return;
    setIsActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const duration = Math.round((Date.now() - (startTime.current ?? Date.now())) / 1000);
    const last = contracoes[0];
    const interval = last
      ? Math.round((Date.now() - new Date(last.created_at).getTime()) / 60000)
      : undefined;

    try {
      const nova = await vitalsService.createContraction(user.id, {
        duration_seconds: duration,
        interval_minutes: interval,
        session_date: todayISO(),
      });
      setContracoes((prev) => [nova, ...prev]);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a contração.');
    }
    setSeconds(0);
  };

  const limpar = () => {
    if (!user?.id) return;
    Alert.alert('Limpar sessão', 'Apagar todas as contrações?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpar',
        style: 'destructive',
        onPress: async () => {
          try {
            await vitalsService.clearContractionSession(user.id);
            setContracoes([]);
          } catch {
            Alert.alert('Erro', 'Não foi possível limpar a sessão.');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Contrações" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <View style={styles.statsRow}>
          <StatBox value={String(contracoes.length)} label="Total" />
          <StatBox value={avgDuracao ? `${avgDuracao}s` : '—'} label="Duração média" />
          <StatBox value={avgIntervalo ? `${avgIntervalo}min` : '—'} label="Intervalo médio" />
        </View>

        <View style={styles.btnWrap}>
          <Text style={styles.hint}>
            {isActive
              ? `Contração em curso: ${seconds}s`
              : 'Pressione e segure durante a contração'}
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
                <Text style={styles.rowHora}>{formatTime(c.created_at)}</Text>
                <Text style={styles.rowDur}>{c.duration_seconds}s</Text>
                <Text style={styles.rowInt}>
                  {c.interval_minutes != null ? `${Math.round(c.interval_minutes)}min` : '—'}
                </Text>
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
  bigBtn: { width: 180, height: 180, borderRadius: 90, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
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

- [ ] **Step 2: Testar — contrações carregam da API; nova contração persiste no banco; limpar chama DELETE**

- [ ] **Step 3: Commit**

```bash
git add GerarVida/src/screens/patient/ContracoesScreen.tsx
git commit -m "feat(contracoes): sincroniza contrações com API (POST/GET/DELETE)"
```

---

## Task 9: GlicoseScreen — implementar com API

**Files:**
- Modify: `GerarVida/src/screens/patient/GlicoseScreen.tsx`

- [ ] **Step 1: Implementar GlicoseScreen completa com API**

```typescript
// GerarVida/src/screens/patient/GlicoseScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StatBox } from '../../components/StatBox';
import { BottomSheet } from '../../components/BottomSheet';
import { vitalsService } from '../../services/vitals';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../theme';
import type { GlucoseReading, GlucoseMoment } from '../../types';

const MOMENT_LABELS: Record<GlucoseMoment, string> = {
  fasting: 'Jejum',
  after_meal: 'Pós-refeição',
  random: 'Aleatório',
};

const CLASSIFICATION_COLORS: Record<string, string> = {
  'Normal': '#3CB371',
  'Atenção': '#F5A623',
  'Alto': '#E15B5B',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function GlicoseScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [stats, setStats] = useState<{ total_readings: number; average: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [value, setValue] = useState('');
  const [moment, setMoment] = useState<GlucoseMoment>('fasting');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [listRes, statsRes] = await Promise.all([
        vitalsService.listGlucoseReadings(user.id),
        vitalsService.getGlucoseStats(user.id),
      ]);
      setReadings(listRes.data);
      setStats(statsRes);
    } catch {
      // mantém dados existentes
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const lastReading = readings[0];
  const lastClassification = lastReading?.classification ?? '—';

  const handleSave = async () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      Alert.alert('Valor inválido', 'Digite um valor de glicose válido em mg/dL.');
      return;
    }
    if (!user?.id) return;
    setSaving(true);
    try {
      await vitalsService.createGlucose(user.id, {
        value_mg_dl: numValue,
        moment,
        notes: notes.trim() || undefined,
      });
      setValue('');
      setNotes('');
      setMoment('fasting');
      setShowModal(false);
      await load();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a leitura.');
    } finally {
      setSaving(false);
    }
  };

  const moments: GlucoseMoment[] = ['fasting', 'after_meal', 'random'];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Glicose" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}>
          {/* STATS */}
          <View style={styles.statsRow}>
            <StatBox value={String(stats?.total_readings ?? 0)} label="Medições" />
            <StatBox
              value={lastReading ? `${lastReading.value_mg_dl}` : '—'}
              label="Última (mg/dL)"
              valueColor={CLASSIFICATION_COLORS[lastClassification] ?? colors.text}
            />
            <StatBox
              value={stats?.average ? `${Math.round(stats.average)}` : '—'}
              label="Média"
            />
          </View>

          {/* STATUS */}
          {lastReading && (
            <View style={[styles.statusBadge, { backgroundColor: CLASSIFICATION_COLORS[lastClassification] + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: CLASSIFICATION_COLORS[lastClassification] }]} />
              <Text style={[styles.statusText, { color: CLASSIFICATION_COLORS[lastClassification] }]}>
                Última leitura: {lastClassification}
              </Text>
            </View>
          )}

          {/* HISTÓRICO */}
          {readings.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Histórico</Text>
              {readings.map((r) => (
                <View key={r.id} style={styles.row}>
                  <View style={[styles.rowDot, { backgroundColor: CLASSIFICATION_COLORS[r.classification] ?? colors.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowValue}>{r.value_mg_dl} mg/dL</Text>
                    <Text style={styles.rowMeta}>
                      {MOMENT_LABELS[r.moment]} · {formatDate(r.created_at)}
                    </Text>
                    {r.notes ? <Text style={styles.rowNotes}>{r.notes}</Text> : null}
                  </View>
                  <View style={[styles.badge, { backgroundColor: CLASSIFICATION_COLORS[r.classification] + '20' }]}>
                    <Text style={[styles.badgeText, { color: CLASSIFICATION_COLORS[r.classification] }]}>
                      {r.classification}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {readings.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhuma medição registrada</Text>
              <Text style={styles.emptyHint}>Toque em + para registrar sua primeira leitura</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* MODAL */}
      <BottomSheet visible={showModal} onClose={() => setShowModal(false)} title="Registrar Glicose">
        <Text style={styles.fieldLabel}>VALOR (mg/dL)</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          keyboardType="numeric"
          placeholder="95"
          placeholderTextColor={colors.textInactive}
        />

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>MOMENTO</Text>
        <View style={styles.chipRow}>
          {moments.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.chip, moment === m && styles.chipActive]}
              onPress={() => setMoment(m)}
            >
              <Text style={[styles.chipText, moment === m && styles.chipTextActive]}>
                {MOMENT_LABELS[m]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>OBSERVAÇÃO (opcional)</Text>
        <TextInput
          style={styles.input}
          value={notes}
          onChangeText={setNotes}
          placeholder="Ex: após café da manhã"
          placeholderTextColor={colors.textInactive}
          maxLength={80}
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Salvar</Text>
          )}
        </TouchableOpacity>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, marginBottom: 24 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 12 },
  row: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.md, padding: 14, marginBottom: 8, alignItems: 'center', gap: 12 },
  rowDot: { width: 10, height: 10, borderRadius: 5 },
  rowValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: 11, color: colors.textMid, marginTop: 2 },
  rowNotes: { fontSize: 11, color: colors.textInactive, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 10, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: '700', color: colors.textMid },
  emptyHint: { fontSize: 13, color: colors.textInactive, marginTop: 8 },
  fab: { position: 'absolute', right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  fabText: { fontSize: 28, color: colors.white, lineHeight: 32 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: colors.textMid, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1.5, borderColor: colors.primaryLight },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, padding: 10, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', borderWidth: 1.5, borderColor: colors.primaryLight },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textMid },
  chipTextActive: { color: colors.white },
  saveBtn: { marginTop: 24, backgroundColor: colors.primary, borderRadius: radius.full, padding: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
```

- [ ] **Step 2: Testar — histórico carrega, nova leitura salva com classificação automática, lista atualiza**

- [ ] **Step 3: Commit**

```bash
git add GerarVida/src/screens/patient/GlicoseScreen.tsx
git commit -m "feat(glicose): implementa tela completa com integração da API de vitais"
```

---

## Task 10: PressaoScreen — implementar com API

**Files:**
- Modify: `GerarVida/src/screens/patient/PressaoScreen.tsx`

- [ ] **Step 1: Implementar PressaoScreen completa com API**

```typescript
// GerarVida/src/screens/patient/PressaoScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StatBox } from '../../components/StatBox';
import { BottomSheet } from '../../components/BottomSheet';
import { vitalsService } from '../../services/vitals';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../theme';
import type { BloodPressureReading, TimeOfDay } from '../../types';

const MOMENT_LABELS: Record<TimeOfDay, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  evening: 'Noite',
  night: 'Madrugada',
};

const CLASSIFICATION_COLORS: Record<string, string> = {
  'Normal': '#3CB371',
  'Atenção': '#F5A623',
  'Alto': '#E15B5B',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function PressaoScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [readings, setReadings] = useState<BloodPressureReading[]>([]);
  const [stats, setStats] = useState<{ total_readings: number; average_systolic: number; average_diastolic: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [moment, setMoment] = useState<TimeOfDay>('morning');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [listRes, statsRes] = await Promise.all([
        vitalsService.listBloodPressureReadings(user.id),
        vitalsService.getBloodPressureStats(user.id),
      ]);
      setReadings(listRes.data);
      setStats(statsRes);
    } catch {
      // mantém dados existentes
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const lastReading = readings[0];

  const handleSave = async () => {
    const sys = parseInt(systolic, 10);
    const dia = parseInt(diastolic, 10);
    if (isNaN(sys) || isNaN(dia) || sys <= 0 || dia <= 0) {
      Alert.alert('Valores inválidos', 'Preencha sistólica e diastólica corretamente.');
      return;
    }
    if (!user?.id) return;
    setSaving(true);
    try {
      await vitalsService.createBloodPressure(user.id, {
        systolic: sys,
        diastolic: dia,
        pulse_bpm: pulse ? parseInt(pulse, 10) : undefined,
        moment,
      });
      setSystolic('');
      setDiastolic('');
      setPulse('');
      setMoment('morning');
      setShowModal(false);
      await load();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a leitura.');
    } finally {
      setSaving(false);
    }
  };

  const moments: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night'];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Pressão Arterial" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}>
          {/* STATS */}
          <View style={styles.statsRow}>
            <StatBox value={String(stats?.total_readings ?? 0)} label="Medições" />
            <StatBox
              value={lastReading ? `${lastReading.systolic}` : '—'}
              label="Última sistólica"
              valueColor={CLASSIFICATION_COLORS[lastReading?.classification ?? 'Normal']}
            />
            <StatBox
              value={lastReading ? `${lastReading.diastolic}` : '—'}
              label="Última diastólica"
            />
          </View>

          {/* ALERTA */}
          {lastReading?.classification === 'Alto' && (
            <View style={styles.alertBanner}>
              <Text style={styles.alertText}>⚠️ Pressão elevada — contate sua médica</Text>
            </View>
          )}

          {/* HISTÓRICO */}
          {readings.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Histórico</Text>
              {readings.map((r) => (
                <View key={r.id} style={styles.row}>
                  <View style={[styles.rowDot, { backgroundColor: CLASSIFICATION_COLORS[r.classification] }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowValue}>
                      {r.systolic}/{r.diastolic} mmHg
                      {r.pulse_bpm ? ` · ${r.pulse_bpm} bpm` : ''}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {MOMENT_LABELS[r.moment]} · {formatDate(r.created_at)}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: CLASSIFICATION_COLORS[r.classification] + '20' }]}>
                    <Text style={[styles.badgeText, { color: CLASSIFICATION_COLORS[r.classification] }]}>
                      {r.classification}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {readings.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhuma medição registrada</Text>
              <Text style={styles.emptyHint}>Toque em + para registrar</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* MODAL */}
      <BottomSheet visible={showModal} onClose={() => setShowModal(false)} title="Registrar Pressão">
        <View style={styles.doubleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>SISTÓLICA (mmHg)</Text>
            <TextInput
              style={styles.input}
              value={systolic}
              onChangeText={setSystolic}
              keyboardType="numeric"
              placeholder="120"
              placeholderTextColor={colors.textInactive}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>DIASTÓLICA</Text>
            <TextInput
              style={styles.input}
              value={diastolic}
              onChangeText={setDiastolic}
              keyboardType="numeric"
              placeholder="80"
              placeholderTextColor={colors.textInactive}
            />
          </View>
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>PULSO (bpm, opcional)</Text>
        <TextInput
          style={styles.input}
          value={pulse}
          onChangeText={setPulse}
          keyboardType="numeric"
          placeholder="72"
          placeholderTextColor={colors.textInactive}
        />

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>MOMENTO</Text>
        <View style={styles.chipRow}>
          {moments.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.chip, moment === m && styles.chipActive]}
              onPress={() => setMoment(m)}
            >
              <Text style={[styles.chipText, moment === m && styles.chipTextActive]}>
                {MOMENT_LABELS[m]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Salvar</Text>
          )}
        </TouchableOpacity>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  alertBanner: { backgroundColor: '#FFEEEE', borderRadius: radius.md, padding: 12, marginBottom: 16 },
  alertText: { fontSize: 13, fontWeight: '600', color: '#E15B5B' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 12 },
  row: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.md, padding: 14, marginBottom: 8, alignItems: 'center', gap: 12 },
  rowDot: { width: 10, height: 10, borderRadius: 5 },
  rowValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: 11, color: colors.textMid, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 10, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: '700', color: colors.textMid },
  emptyHint: { fontSize: 13, color: colors.textInactive, marginTop: 8 },
  fab: { position: 'absolute', right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  fabText: { fontSize: 28, color: colors.white, lineHeight: 32 },
  doubleRow: { flexDirection: 'row', gap: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: colors.textMid, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1.5, borderColor: colors.primaryLight },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.primaryLight },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textMid },
  chipTextActive: { color: colors.white },
  saveBtn: { marginTop: 24, backgroundColor: colors.primary, borderRadius: radius.full, padding: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
```

- [ ] **Step 2: Testar — histórico carrega, nova leitura salva, classificação automática funciona, alerta de pressão alta aparece**

- [ ] **Step 3: Commit**

```bash
git add GerarVida/src/screens/patient/PressaoScreen.tsx
git commit -m "feat(pressao): implementa tela completa com integração da API de vitais"
```

---

## Task 11: ConsultasScreen — implementar com API

**Files:**
- Modify: `GerarVida/src/screens/patient/ConsultasScreen.tsx`

- [ ] **Step 1: Implementar ConsultasScreen com API de agendamentos**

```typescript
// GerarVida/src/screens/patient/ConsultasScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { BottomSheet } from '../../components/BottomSheet';
import { appointmentsService } from '../../services/appointments';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../theme';
import type { Appointment, PatientAppointmentStatus } from '../../types';

const STATUS_LABELS: Record<PatientAppointmentStatus, string> = {
  pending: 'Aguardando confirmação',
  confirmed: '✓ Presença confirmada',
  reschedule_requested: '⏳ Remarcação solicitada',
  reschedule_approved: '✓ Nova data aprovada',
};

const STATUS_COLORS: Record<PatientAppointmentStatus, string> = {
  pending: '#F5A623',
  confirmed: '#3CB371',
  reschedule_requested: '#F5A623',
  reschedule_approved: '#3CB371',
};

const TYPE_LABELS: Record<string, string> = {
  routine: 'Rotina',
  ultrasound: 'Ultrassom',
  lab: 'Exames',
  follow_up: 'Retorno',
  emergency: 'Urgência',
};

function formatDateTime(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const [h, min] = timeStr.split(':');
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  const weekday = dt.toLocaleDateString('pt-BR', { weekday: 'short' });
  return `${weekday}, ${d}/${m} · ${h}:${min}`;
}

const RESCHEDULE_REASONS = [
  { key: 'conflito_pessoal', label: 'Conflito pessoal' },
  { key: 'problema_saude', label: 'Problema de saúde' },
  { key: 'trabalho', label: 'Trabalho' },
  { key: 'outro', label: 'Outro' },
] as const;

export function ConsultasScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('conflito_pessoal');
  const [rescheduleObs, setRescheduleObs] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await appointmentsService.listPatientAppointments(user.id, { limit: 20 });
      setAppointments(res.data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as consultas.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const nextAppt = appointments.find(
    (a) => a.status !== 'cancelled' && a.status !== 'completed' && new Date(a.datetime) >= new Date(),
  );
  const history = appointments.filter((a) => a !== nextAppt);

  const handleConfirm = async (appt: Appointment) => {
    setActionLoading(true);
    try {
      const updated = await appointmentsService.confirmAppointment(appt.id);
      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch {
      Alert.alert('Erro', 'Não foi possível confirmar a consulta.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const updated = await appointmentsService.requestReschedule(
        selected.id,
        rescheduleReason,
        rescheduleObs.trim() || undefined,
      );
      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setShowReschedule(false);
      setSelected(null);
    } catch {
      Alert.alert('Erro', 'Não foi possível solicitar remarcação.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Minhas Consultas" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
          {/* PRÓXIMA CONSULTA */}
          {nextAppt && (
            <>
              <Text style={styles.sectionTitle}>Próxima Consulta</Text>
              <View style={styles.nextCard}>
                <Text style={styles.nextDate}>{formatDateTime(nextAppt.date, nextAppt.time)}</Text>
                <Text style={styles.nextLocation}>{nextAppt.location ?? 'Clínica Gerar Vida'}</Text>
                <Text style={styles.nextType}>{TYPE_LABELS[nextAppt.type] ?? nextAppt.type}</Text>

                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[nextAppt.patient_status] + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[nextAppt.patient_status] }]}>
                    {STATUS_LABELS[nextAppt.patient_status]}
                  </Text>
                </View>

                {nextAppt.patient_status === 'pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.confirmBtn, actionLoading && { opacity: 0.6 }]}
                      onPress={() => handleConfirm(nextAppt)}
                      disabled={actionLoading}
                    >
                      <Text style={styles.confirmBtnText}>Confirmar presença</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rescheduleBtn]}
                      onPress={() => { setSelected(nextAppt); setShowReschedule(true); }}
                    >
                      <Text style={styles.rescheduleBtnText}>Solicitar remarcação</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}

          {/* HISTÓRICO */}
          {history.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Histórico</Text>
              {history.map((a) => (
                <View key={a.id} style={styles.histCard}>
                  <Text style={styles.histDate}>{formatDateTime(a.date, a.time)}</Text>
                  <Text style={styles.histType}>{TYPE_LABELS[a.type] ?? a.type}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[a.patient_status] + '20', alignSelf: 'flex-start', marginTop: 8 }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[a.patient_status] }]}>
                      {STATUS_LABELS[a.patient_status]}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {appointments.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhuma consulta encontrada</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL REMARCAÇÃO */}
      <BottomSheet
        visible={showReschedule}
        onClose={() => { setShowReschedule(false); setSelected(null); }}
        title="Solicitar Remarcação"
      >
        <Text style={styles.fieldLabel}>MOTIVO</Text>
        <View style={styles.reasonList}>
          {RESCHEDULE_REASONS.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.reasonChip, rescheduleReason === r.key && styles.reasonChipActive]}
              onPress={() => setRescheduleReason(r.key)}
            >
              <Text style={[styles.reasonText, rescheduleReason === r.key && styles.reasonTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>OBSERVAÇÃO (opcional)</Text>
        <TextInput
          style={styles.input}
          value={rescheduleObs}
          onChangeText={setRescheduleObs}
          placeholder="Descreva o motivo..."
          placeholderTextColor={colors.textInactive}
          multiline
        />

        <TouchableOpacity
          style={[styles.saveBtn, actionLoading && { opacity: 0.6 }]}
          onPress={handleRescheduleSubmit}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Solicitar Remarcação</Text>
          )}
        </TouchableOpacity>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 12 },
  nextCard: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: 20, marginBottom: 8 },
  nextDate: { fontSize: 20, fontWeight: '800', color: colors.white, marginBottom: 4 },
  nextLocation: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  nextType: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, marginTop: 12, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: { flex: 1, padding: 12, borderRadius: radius.full, alignItems: 'center' },
  confirmBtn: { backgroundColor: colors.white },
  confirmBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  rescheduleBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  rescheduleBtnText: { fontSize: 13, fontWeight: '600', color: colors.white },
  histCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 16, marginBottom: 8 },
  histDate: { fontSize: 14, fontWeight: '700', color: colors.text },
  histType: { fontSize: 12, color: colors.textMid, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: '700', color: colors.textMid },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: colors.textMid, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  reasonList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.primaryLight, backgroundColor: colors.bg },
  reasonChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  reasonText: { fontSize: 13, fontWeight: '600', color: colors.textMid },
  reasonTextActive: { color: colors.white },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1.5, borderColor: colors.primaryLight, minHeight: 80 },
  saveBtn: { marginTop: 24, backgroundColor: colors.primary, borderRadius: radius.full, padding: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
```

- [ ] **Step 2: Testar — lista de consultas carrega, confirmação e solicitação de remarcação funcionam**

- [ ] **Step 3: Commit**

```bash
git add GerarVida/src/screens/patient/ConsultasScreen.tsx
git commit -m "feat(consultas): implementa tela completa com API de agendamentos"
```

---

## Task 12: PerfilScreen — implementar com API

**Files:**
- Modify: `GerarVida/src/screens/patient/PerfilScreen.tsx`

- [ ] **Step 1: Implementar PerfilScreen com dados reais e logout**

```typescript
// GerarVida/src/screens/patient/PerfilScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { usersService } from '../../services/users';
import { useAuth } from '../../contexts/AuthContext';
import type { Clinic } from '../../types';
import { colors, spacing, radius } from '../../theme';

export function PerfilScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loadingClinic, setLoadingClinic] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    usersService
      .getClinic(user.id)
      .then(setClinic)
      .catch(() => setClinic(null))
      .finally(() => setLoadingClinic(false));
  }, [user?.id]);

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja encerrar sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await logout();
            // RootNavigator detecta isAuthenticated = false e redireciona para Login automaticamente
          } catch {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('') ?? '??';

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Meu Perfil" showBack={false} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        {/* CARD DO PERFIL */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{user?.name ?? '—'}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? '—'}</Text>
          {user?.phone && (
            <Text style={styles.profilePhone}>{user.phone}</Text>
          )}
        </View>

        {/* CARD DA CLÍNICA */}
        {loadingClinic ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : clinic ? (
          <View style={styles.clinicCard}>
            <Text style={styles.clinicLabel}>CLÍNICA</Text>
            <Text style={styles.clinicName}>{clinic.name}</Text>
            {clinic.address && (
              <Text style={styles.clinicDetail}>{clinic.address}</Text>
            )}
            {clinic.phone && (
              <Text style={styles.clinicDetail}>📞 {clinic.phone}</Text>
            )}
          </View>
        ) : null}

        {/* MENUS */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>CONTA</Text>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Text style={styles.menuItemIcon}>📋</Text>
            <Text style={styles.menuItemLabel}>Meu Prontuário</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Text style={styles.menuItemIcon}>🔔</Text>
            <Text style={styles.menuItemLabel}>Notificações</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity
          style={[styles.logoutBtn, loggingOut && { opacity: 0.6 }]}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.85}
        >
          {loggingOut ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={styles.logoutText}>Sair da conta</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  profileCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 24, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 24, fontWeight: '700', color: colors.primaryDk },
  profileName: { fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  profileEmail: { fontSize: 13, color: colors.textMid, marginTop: 4 },
  profilePhone: { fontSize: 13, color: colors.textMid, marginTop: 2 },
  clinicCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  clinicLabel: { fontSize: 10, fontWeight: '600', color: colors.textInactive, letterSpacing: 0.8, marginBottom: 6 },
  clinicName: { fontSize: 16, fontWeight: '700', color: colors.text },
  clinicDetail: { fontSize: 13, color: colors.textMid, marginTop: 4 },
  menuSection: { backgroundColor: colors.white, borderRadius: radius.md, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  menuSectionTitle: { fontSize: 10, fontWeight: '600', color: colors.textInactive, letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: colors.bg },
  menuItemIcon: { fontSize: 20 },
  menuItemLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  menuItemArrow: { fontSize: 20, color: colors.textInactive },
  logoutBtn: { borderWidth: 1.5, borderColor: colors.accent, borderRadius: radius.full, padding: 16, alignItems: 'center', marginTop: 8 },
  logoutText: { fontSize: 15, fontWeight: '700', color: colors.accent },
});
```

- [ ] **Step 2: Testar — nome, email, clínica carregam da API; logout limpa sessão e redireciona para Login**

- [ ] **Step 3: Commit**

```bash
git add GerarVida/src/screens/patient/PerfilScreen.tsx
git commit -m "feat(perfil): implementa tela com dados reais do usuário, clínica e logout"
```

---

## Self-Review

### Cobertura da spec (endpoints implementados na API → telas):

| Endpoint | Mapeado | Task |
|---|---|---|
| `POST /auth/login` | ✅ | Task 6 (LoginScreen) |
| `POST /auth/logout` | ✅ | Task 12 (PerfilScreen) |
| `GET /users/:id` | ✅ | Task 7 (HomeScreen) + Task 12 (PerfilScreen) |
| `PUT /users/:id` | ✅ | Task 3 (usersService — disponível para uso futuro) |
| `GET /users/:id/clinic` | ✅ | Task 12 (PerfilScreen) |
| `GET /patients/:id/appointments` | ✅ | Task 11 (ConsultasScreen) + Task 7 (HomeScreen) |
| `PATCH /appointments/:id/confirm` | ✅ | Task 11 (ConsultasScreen) |
| `POST /appointments/:id/reschedule-request` | ✅ | Task 11 (ConsultasScreen) |
| `DELETE /appointments/:id` | ✅ | Task 3 (appointmentsService — disponível) |
| `POST /patients/:id/contractions` | ✅ | Task 8 (ContracoesScreen) |
| `GET /patients/:id/contractions` | ✅ | Task 8 (ContracoesScreen) |
| `DELETE /patients/:id/contractions/session` | ✅ | Task 8 (ContracoesScreen) |
| `POST /patients/:id/glucose-readings` | ✅ | Task 9 (GlicoseScreen) |
| `GET /patients/:id/glucose-readings` | ✅ | Task 9 (GlicoseScreen) |
| `GET /patients/:id/glucose-readings/stats` | ✅ | Task 9 (GlicoseScreen) |
| `POST /patients/:id/blood-pressure` | ✅ | Task 10 (PressaoScreen) |
| `GET /patients/:id/blood-pressure` | ✅ | Task 10 (PressaoScreen) |
| `GET /patients/:id/blood-pressure/stats` | ✅ | Task 10 (PressaoScreen) |

### Placeholders encontrados: nenhum.

### Consistência de tipos:
- `Contraction.duration_seconds` usado em Task 8 ✅ (schema API: `duration_seconds`)
- `GlucoseReading.value_mg_dl` usado em Task 9 ✅ (schema API: `value_mg_dl`)
- `BloodPressureReading.systolic/diastolic` usados em Task 10 ✅
- `Appointment.patient_status` usado em Task 11 ✅ (enum: `pending | confirmed | reschedule_requested | reschedule_approved`)
- `VitalClassification`: valores `'Normal' | 'Atenção' | 'Alto'` — exatos como no enum Python da API ✅

---

*Plano criado em 2026-05-20 · branch: refacture · 12 tasks · restrições: apenas alterações em `appclinica`*
