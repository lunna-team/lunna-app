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

export const STORAGE_KEYS = {
  onboarded: 'gv_onboarded',
  accessToken: 'gv_access_token',
  refreshToken: 'gv_refresh_token',
  user: 'gv_user',
  // legado — ainda usados localmente por algumas telas
  contracoes: 'gv_contracoes',
  consultaStatus: 'gv_consulta_proxima_status',
  cartaoPaciente: 'gv_cartao_1498',
  consultasMedico: 'gv_consultas_1498',
  usgMedico: 'gv_usg_1498',
  examesMedico: 'gv_exames_1498',
  vacinasMedico: 'gv_vacinas_1498',
  notasMedica: 'gv_notas_medica_1498',
};
