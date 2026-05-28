import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  Animated, Easing,
} from 'react-native';
import Svg, { Polyline, Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { patientsService } from '../../services/patients';
import { fetalDevelopmentService } from '../../services/fetalDevelopment';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme';
import type { PatientProntuario, FetalDevelopment } from '../../types';

const HOTSPOT_DATA = {
  cerebro: {
    icon: '🧠',
    title: 'Foco: Desenvolvimento Cerebral',
    text: 'O córtex cerebral está em plena formação. Os neurônios estabelecem até 250 mil novas conexões por minuto. A mielinização está começando e os sentidos já estão ativos.',
    top: '17%',
    left: '55%',
    label: 'Cérebro',
  },
  coracao: {
    icon: '🫀',
    title: 'Foco: Coração em Ritmo',
    text: 'O coraçãozinho bate entre 120 e 160 vezes por minuto. As quatro câmaras já estão completamente formadas e bombeando sangue oxigenado pelo corpo do bebê.',
    top: '41%',
    left: '47%',
    label: 'Coração',
  },
  mao: {
    icon: '🤚',
    title: 'Foco: Mãozinhas',
    text: 'Os dedos têm impressões digitais únicas e definitivas! O bebê pratica reflexos de preensão, levando as mãozinhas ao rosto com frequência.',
    top: '55%',
    left: '30%',
    label: 'Mãozinha',
  },
};

type HotspotKey = keyof typeof HOTSPOT_DATA;

function HotspotDot({ id, style }: { id: HotspotKey; style: object }) {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse1Opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse1, { toValue: 1.8, duration: 1300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse1Opacity, { toValue: 0, duration: 1300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulse1, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(pulse1Opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={[styles.hotspot, style]}>
      <Animated.View style={[styles.hotspotRing, { transform: [{ scale: pulse1 }], opacity: pulse1Opacity }]} />
      <View style={styles.hotspotDot} />
    </View>
  );
}

function formatEdd(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function Feto3DScreen() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<HotspotKey | null>(null);
  const [prontuario, setProntuario] = useState<PatientProntuario | null>(null);
  const [fetalData, setFetalData] = useState<FetalDevelopment | null>(null);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const selected = selectedId ? HOTSPOT_DATA[selectedId] : null;

  useEffect(() => {
    if (!user?.id) return;
    patientsService.getProntuario(user.id).then(setProntuario).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    const week = prontuario?.current_week ?? 24;
    fetalDevelopmentService.getWeek(week).then(setFetalData).catch(() => {});
  }, [prontuario?.current_week]);

  const currentWeek = prontuario?.current_week ?? 24;
  const daysLeft = prontuario?.edd
    ? Math.max(0, Math.ceil((new Date(prontuario.edd).getTime() - Date.now()) / 86400000))
    : null;

  const closeInfo = () => setSelectedId(null);

  return (
    <View style={styles.container}>
      {/* Fetus image background */}
      <Image
        source={require('../../../assets/feto_realista.png')}
        style={styles.bgImage}
        resizeMode="cover"
      />
      {/* Uterine overlay */}
      <View style={styles.uterineOverlay} />

      {/* Floating header */}
      <View style={[styles.floatHeader, { paddingTop: Math.max(insets.top, 44) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="15 18 9 12 15 6" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>Semana {currentWeek} 🫀</Text>
        <View style={{ width: 46 }} />
      </View>

      {/* Hotspots */}
      {(Object.keys(HOTSPOT_DATA) as HotspotKey[]).map((key) => {
        const hs = HOTSPOT_DATA[key];
        return (
          <TouchableOpacity
            key={key}
            style={[styles.hotspotWrap, { top: hs.top as any, left: hs.left as any }]}
            onPress={() => setSelectedId(key)}
            activeOpacity={0.8}
          >
            <HotspotDot id={key} style={{}} />
            <Text style={styles.hotspotLabel}>{hs.label}</Text>
          </TouchableOpacity>
        );
      })}

      {/* Info card */}
      {selected && (
        <View style={styles.infoCard}>
          <TouchableOpacity style={styles.infoClose} onPress={closeInfo}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <Line x1="18" y1="6" x2="6" y2="18" />
              <Line x1="6" y1="6" x2="18" y2="18" />
            </Svg>
          </TouchableOpacity>
          <View style={styles.infoRow1}>
            <Text style={styles.infoEmoji}>{selected.icon}</Text>
            <Text style={styles.infoTitle}>{selected.title}</Text>
          </View>
          <Text style={styles.infoText}>{selected.text}</Text>
          <View style={styles.infoBadge}>
            <Text style={styles.infoBadgeText}>Semana {currentWeek} · Em desenvolvimento</Text>
          </View>
        </View>
      )}

      {/* Zoom controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomBtn}>
          <Text style={styles.zoomBtnText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomBtn}>
          <Text style={styles.zoomBtnText}>−</Text>
        </TouchableOpacity>
      </View>

      {/* Gestational card */}
      <View style={[styles.gestCard, { marginBottom: Math.max(insets.bottom, 26) }]}>
        <View>
          <Text style={styles.gestLabel}>⏳ Cálculo Gestacional</Text>
          <Text style={styles.gestMain}>
            {daysLeft !== null ? `Faltam ${daysLeft} dias!` : `Semana ${currentWeek}`}
          </Text>
          <Text style={styles.gestSub}>
            {prontuario?.edd
              ? `Previsão de parto: ${formatEdd(prontuario.edd)}`
              : fetalData
              ? `${fetalData.size_cm} cm · ${fetalData.weight_g} g`
              : 'Carregando...'}
          </Text>
        </View>
        <Text style={styles.gestEmoji}>🍼</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#301B28' },
  bgImage: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
  },
  uterineOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(48,27,40,0.3)',
  },
  floatHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 0,
  },
  backBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(141,170,145,0.25)', borderWidth: 1.5, borderColor: 'rgba(141,170,145,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  weekLabel: {
    fontSize: 17, fontWeight: '700', color: 'white',
    textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 14,
  },
  // hotspots
  hotspotWrap: {
    position: 'absolute', zIndex: 150, alignItems: 'center',
  },
  hotspot: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(141,170,145,0.2)', borderWidth: 2, borderColor: 'rgba(141,170,145,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },
  hotspotRing: {
    position: 'absolute', width: 38, height: 38, borderRadius: 19,
    borderWidth: 2, borderColor: 'rgba(141,170,145,0.6)',
  },
  hotspotDot: {
    width: 13, height: 13, borderRadius: 6.5, backgroundColor: colors.primary,
  },
  hotspotLabel: {
    fontSize: 9.5, fontWeight: '700', color: 'rgba(197,213,200,0.95)',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
    letterSpacing: 0.3,
  },
  // info card
  infoCard: {
    position: 'absolute', bottom: 130, left: 18, right: 18, zIndex: 220,
    backgroundColor: 'rgba(252,250,248,0.97)', borderRadius: 22, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.55, shadowRadius: 40, elevation: 20,
  },
  infoClose: {
    position: 'absolute', top: 12, right: 14, width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(141,170,145,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  infoRow1: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10, paddingRight: 30 },
  infoEmoji: { fontSize: 30 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: colors.accent, flex: 1, lineHeight: 20 },
  infoText: { fontSize: 12.5, lineHeight: 22, color: '#4a6b4e', fontWeight: '500' },
  infoBadge: {
    marginTop: 10, alignSelf: 'flex-start',
    backgroundColor: 'rgba(141,170,145,0.13)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99,
  },
  infoBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 0.3 },
  // zoom
  zoomControls: {
    position: 'absolute', right: 18, top: '50%', zIndex: 180, gap: 8, marginTop: -42,
  },
  zoomBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  zoomBtnText: { fontSize: 22, fontWeight: '300', color: 'white', lineHeight: 26 },
  // gestational card
  gestCard: {
    position: 'absolute', bottom: 0, left: 18, right: 18, zIndex: 200,
    backgroundColor: colors.accent, borderRadius: 20, padding: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 12,
  },
  gestLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.8)', marginBottom: 3 },
  gestMain: { fontSize: 18, fontWeight: '800', color: 'white', letterSpacing: -0.4 },
  gestSub: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.72)', marginTop: 3 },
  gestEmoji: { fontSize: 34 },
});
