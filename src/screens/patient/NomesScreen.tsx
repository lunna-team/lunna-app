import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Pressable, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { babyNamesService } from '../../services/babyNames';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme';
import type { BabyName } from '../../types';

interface ModalData {
  name: BabyName;
  genero: 'girl' | 'boy';
}

export function NomesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [nomes, setNomes] = useState<BabyName[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [favoriting, setFavoriting] = useState<string | null>(null);

  useEffect(() => {
    babyNamesService
      .list({ limit: 100 })
      .then((res) => setNomes(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const meninas = nomes.filter((n) => n.gender === 'female');
  const meninos = nomes.filter((n) => n.gender === 'male');

  const handleToggleFavorite = async (name: BabyName) => {
    if (!user?.id || favoriting) return;
    setFavoriting(name.id);
    try {
      if (name.is_favorite) {
        await babyNamesService.removeFavorite(user.id, name.id);
      } else {
        await babyNamesService.addFavorite(user.id, name.id);
      }
      setNomes((prev) =>
        prev.map((n) => (n.id === name.id ? { ...n, is_favorite: !n.is_favorite } : n)),
      );
      setModalData((prev) =>
        prev?.name.id === name.id
          ? { ...prev, name: { ...prev.name, is_favorite: !prev.name.is_favorite } }
          : prev,
      );
    } catch {
    } finally {
      setFavoriting(null);
    }
  };

  const openModal = (name: BabyName, genero: 'girl' | 'boy') =>
    setModalData({ name, genero });
  const closeModal = () => setModalData(null);

  const renderColumn = (nameList: BabyName[], genero: 'girl' | 'boy') => (
    <View style={genero === 'girl' ? styles.colGirl : styles.colBoy}>
      <View style={styles.colHeader}>
        <Text style={styles.colIcon}>{genero === 'girl' ? '🌸' : '⭐'}</Text>
        <Text
          style={[
            styles.colHeaderLabel,
            genero === 'girl' ? styles.colLabelGirl : styles.colLabelBoy,
          ]}
        >
          {genero === 'girl' ? 'Menina' : 'Menino'}
        </Text>
      </View>
      {nameList.length === 0 && (
        <Text style={styles.emptyCol}>Nenhum nome</Text>
      )}
      {nameList.map((n, i) => (
        <TouchableOpacity
          key={n.id}
          style={[
            styles.nameSlot,
            n.is_favorite && (genero === 'girl' ? styles.favGirl : styles.favBoy),
          ]}
          onPress={() => openModal(n, genero)}
          activeOpacity={0.8}
        >
          <Text style={styles.slotNum}>{i + 1}</Text>
          <Text style={styles.slotName} numberOfLines={1}>{n.name}</Text>
          {n.is_favorite && (
            <Text style={styles.favStar}>★</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Nomes de Bebê" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.hint}>Toque em um nome para ver detalhes e favoritar.</Text>
          <View style={styles.columnsWrap}>
            {renderColumn(meninas, 'girl')}
            {renderColumn(meninos, 'boy')}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={!!modalData}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            {modalData && (
              <>
                <Text style={styles.modalName}>{modalData.name.name}</Text>
                <View
                  style={[
                    styles.genderBadge,
                    modalData.genero === 'girl' ? styles.badgeGirl : styles.badgeBoy,
                  ]}
                >
                  <Text
                    style={[
                      styles.genderBadgeText,
                      modalData.genero === 'girl'
                        ? styles.badgeTextGirl
                        : styles.badgeTextBoy,
                    ]}
                  >
                    {modalData.genero === 'girl' ? '♀ Menina' : '♂ Menino'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>ORIGEM</Text>
                    <Text style={styles.infoValue}>{modalData.name.origin}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>SIGNIFICADO</Text>
                    <Text style={styles.infoValue}>{modalData.name.meaning}</Text>
                  </View>
                </View>

                <View style={styles.popularityWrap}>
                  <Text style={styles.infoLabel}>
                    POPULARIDADE — {modalData.name.popularity_score}/100
                  </Text>
                  <View style={styles.popularityBar}>
                    <View
                      style={[
                        styles.popularityFill,
                        {
                          width: `${modalData.name.popularity_score}%` as `${number}%`,
                          backgroundColor:
                            modalData.genero === 'girl' ? colors.accent : colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    modalData.name.is_favorite && styles.actionBtnFav,
                  ]}
                  onPress={() => handleToggleFavorite(modalData.name)}
                  disabled={favoriting === modalData.name.id}
                  activeOpacity={0.85}
                >
                  <Text style={styles.actionBtnText}>
                    {modalData.name.is_favorite
                      ? '★ Remover dos Favoritos'
                      : '⭐ Adicionar aos Favoritos'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 32 },
  hint: { fontSize: 12, color: colors.textMid, textAlign: 'center', marginBottom: 14 },
  columnsWrap: { flexDirection: 'row', gap: 12 },
  colGirl: { flex: 1 },
  colBoy: { flex: 1 },
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  colIcon: { fontSize: 16 },
  colHeaderLabel: { fontSize: 14, fontWeight: '700' },
  colLabelGirl: { color: colors.accent },
  colLabelBoy: { color: colors.primary },
  emptyCol: { fontSize: 12, color: colors.textInactive, textAlign: 'center', marginTop: 8 },
  nameSlot: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  favGirl: { borderLeftWidth: 3, borderLeftColor: colors.accent },
  favBoy: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  slotNum: { fontSize: 10, fontWeight: '700', color: colors.textInactive, minWidth: 14 },
  slotName: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  favStar: { fontSize: 11, color: colors.accent },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45,49,46,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingBottom: 28,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#e2e8e2',
    borderRadius: 99,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 18,
  },
  modalName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  genderBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    marginBottom: 18,
  },
  badgeGirl: { backgroundColor: 'rgba(229,152,125,0.15)' },
  badgeBoy: { backgroundColor: 'rgba(141,170,145,0.15)' },
  genderBadgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextGirl: { color: colors.accent },
  badgeTextBoy: { color: colors.primary },
  infoRow: { gap: 12, marginBottom: 20 },
  infoItem: { backgroundColor: colors.bg, borderRadius: 12, padding: 14 },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textInactive,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  infoValue: { fontSize: 13.5, fontWeight: '600', color: colors.text, lineHeight: 20 },
  popularityWrap: { marginBottom: 22 },
  popularityBar: {
    height: 8,
    backgroundColor: colors.bg,
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 8,
  },
  popularityFill: { height: '100%', borderRadius: 99 },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  actionBtnFav: { backgroundColor: colors.textMid },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
});
