import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, spacing, radius } from '../../theme';

export function PerfilScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [notifLembrete, setNotifLembrete] = useState(true);
  const [notifNovidades, setNotifNovidades] = useState(true);
  const [notifAvisos, setNotifAvisos] = useState(true);
  const insets = useSafeAreaInsets();

  const MENUS: Array<{ section: string; items: Array<{ label: string; onPress?: () => void }> }> = [
    {
      section: 'Documentos & Dados',
      items: [
        { label: 'Meus Exames' },
        { label: 'Receitas Médicas' },
        { label: 'Dados Pessoais' },
      ],
    },
    {
      section: 'Preferências',
      items: [
        { label: 'Notificações', onPress: () => setModalVisible(true) },
        { label: 'Privacidade' },
        { label: 'Sobre o App' },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Perfil" showBack={false} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>MS</Text></View>
          <Text style={styles.name}>Maria da Silva</Text>
          <Text style={styles.sub}>Semana 24 · Prontuário 2024-00847</Text>
        </View>

        <View style={styles.clinicCard}>
          <Text style={{ fontSize: 22 }}>🏥</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.clinicName}>Clínica Gerar Vida</Text>
            <Text style={styles.clinicDoc}>Dra. Ana Lima — Obstetra</Text>
          </View>
        </View>

        {MENUS.map((s) => (
          <View key={s.section} style={{ marginBottom: 24 }}>
            <Text style={styles.sectionLabel}>{s.section}</Text>
            <View style={styles.menuCard}>
              {s.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuItem, i < s.items.length - 1 && styles.menuItemBorder]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuText}>{item.label}</Text>
                  <Text style={{ color: colors.textInactive, fontSize: 18 }}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Notificações</Text>
          <Text style={styles.sheetSub}>Escolha quais avisos deseja receber</Text>

          {[
            { label: 'Lembretes de consulta', desc: 'Alertas 24h antes das suas consultas', value: notifLembrete, setter: setNotifLembrete },
            { label: 'Novidades da Clínica', desc: 'Informações e novidades do app', value: notifNovidades, setter: setNotifNovidades },
            { label: 'Avisos importantes', desc: 'Avisos urgentes e comunicados', value: notifAvisos, setter: setNotifAvisos },
          ].map((item) => (
            <View key={item.label} style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>{item.label}</Text>
                <Text style={styles.toggleDesc}>{item.desc}</Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={item.setter}
                trackColor={{ false: colors.bg, true: colors.primaryLight }}
                thumbColor={item.value ? colors.primary : colors.textInactive}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.saveBtn} onPress={() => setModalVisible(false)}>
            <Text style={styles.saveBtnText}>Salvar preferências</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  profileCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 24, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 24, fontWeight: '700', color: colors.primaryDk },
  name: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  sub: { fontSize: 13, color: colors.textMid },
  clinicCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  clinicName: { fontSize: 14, fontWeight: '700', color: colors.text },
  clinicDoc: { fontSize: 12, color: colors.textMid, marginTop: 2 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: colors.textMid, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  menuCard: { backgroundColor: colors.white, borderRadius: radius.md, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.bg },
  menuText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.textInactive, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
  sheetSub: { fontSize: 13, color: colors.textMid, marginBottom: 20 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.bg, gap: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  toggleDesc: { fontSize: 12, color: colors.textMid, marginTop: 2 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.full, padding: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
