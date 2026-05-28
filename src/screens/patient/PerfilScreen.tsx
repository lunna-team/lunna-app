import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
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
