import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Dimensions, FlatList, NativeSyntheticEvent, NativeScrollEvent,
  Modal, TouchableWithoutFeedback, Alert,
} from 'react-native';
import Svg, { Rect, Line, Path, Polyline, Circle, Ellipse } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PatientStackParams } from '../../navigation/PatientNavigator';
import { storage, STORAGE_KEYS } from '../../services/storage';
import { colors, spacing, radius } from '../../theme';

type Nav = NativeStackNavigationProp<PatientStackParams>;
const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 48;
const SEMANA = 24;
const PROGRESS = SEMANA / 42;

// ── QUICK ACTION ICONS ──────────────────────────────────────────────────────
function IconExames() {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="8" y="2" width="8" height="4" rx="1" />
    <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <Line x1="9" y1="12" x2="15" y2="12" />
    <Line x1="9" y1="16" x2="15" y2="16" />
  </Svg>;
}
function IconChat() {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Svg>;
}
function IconMeds() {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M10.5 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7" />
    <Path d="m8 12 5-5" />
    <Ellipse cx="16.5" cy="15.5" rx="5.5" ry="5.5" />
  </Svg>;
}
function IconConsultas() {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="4" width="18" height="18" rx="2" />
    <Line x1="16" y1="2" x2="16" y2="6" />
    <Line x1="8" y1="2" x2="8" y2="6" />
    <Line x1="3" y1="10" x2="21" y2="10" />
  </Svg>;
}
function IconNomes() {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
    <Line x1="12" y1="11" x2="12" y2="16" />
    <Line x1="9.5" y1="13.5" x2="14.5" y2="13.5" />
  </Svg>;
}
function IconContracoes() {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </Svg>;
}
function IconPressao() {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </Svg>;
}
function IconGlicose() {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" />
    <Circle cx="12" cy="9" r="2.5" />
  </Svg>;
}

const QUICK_ACTIONS: { label: string; icon: React.ReactNode; screen: keyof PatientStackParams }[] = [
  { label: 'Exames',      icon: <IconExames />,     screen: 'AreaMedica' },
  { label: 'Chat',        icon: <IconChat />,       screen: 'Chat' },
  { label: 'Meus Meds',  icon: <IconMeds />,       screen: 'AreaMedica' },
  { label: 'Consultas',  icon: <IconConsultas />,  screen: 'Consultas' },
  { label: 'Nomes',      icon: <IconNomes />,      screen: 'Nomes' },
  { label: 'Contrações', icon: <IconContracoes />, screen: 'Contracoes' },
  { label: 'Pressão',    icon: <IconPressao />,    screen: 'Pressao' },
  { label: 'Glicose',    icon: <IconGlicose />,    screen: 'Glicose' },
];

const TIPS = [
  { emoji: '🧘‍♀️', title: 'Exercícios leves', desc: 'Caminhadas de 20 min ajudam na circulação e humor.' },
  { emoji: '💧', title: 'Hidratação', desc: 'Beba pelo menos 2,5 L de água por dia nesta fase.' },
  { emoji: '😴', title: 'Sono de qualidade', desc: 'Durma de lado (esquerdo) para melhorar o fluxo sanguíneo.' },
  { emoji: '🎵', title: 'Estimulação sonora', desc: 'O bebê já ouve! Converse, cante ou coloque música.' },
];

interface Video {
  bg: string; cat: string; catColor: string; titulo: string; meta: string;
  desc: string; prof: string; profBg: string; duration: string;
}

const VIDEOS: Video[] = [
  {
    bg: '#8DAA91', cat: 'Nutrição', catColor: '#8DAA91',
    titulo: 'Alimentação na Semana 24', meta: '8 min · Nutricionista',
    desc: 'O que comer nesta fase da gestação para garantir os nutrientes essenciais para você e para o crescimento saudável do bebê.',
    prof: '🥗 Dra. Carla Nunes — Nutricionista', profBg: 'rgba(141,170,145,0.15)', duration: '8 min',
  },
  {
    bg: '#5E7E63', cat: 'Fisioterapia', catColor: '#5E7E63',
    titulo: 'Exercícios Seguros no 2º Trimestre', meta: '12 min · Fisioterapeuta',
    desc: 'Movimentos e alongamentos indicados para o segundo trimestre, com foco em alívio das dores lombares e fortalecimento do assoalho pélvico.',
    prof: '🧘‍♀️ Dra. Renata Alves — Fisioterapeuta Obstétrica', profBg: 'rgba(94,126,99,0.12)', duration: '12 min',
  },
  {
    bg: '#301B28', cat: 'Sono', catColor: '#9b6e8a',
    titulo: 'Como Preparar o Sono do Bebê', meta: '10 min · Especialista',
    desc: 'Técnicas para criar uma rotina saudável de sono desde os primeiros dias, e como o ambiente do quarto influencia a qualidade do descanso do bebê.',
    prof: '🌙 Dr. Felipe Torres — Especialista do Sono Infantil', profBg: 'rgba(48,27,40,0.08)', duration: '10 min',
  },
  {
    bg: '#E5987D', cat: 'Parto', catColor: '#E5987D',
    titulo: 'O Que Esperar do Parto Normal', meta: '15 min · Obstetra',
    desc: 'Um guia tranquilo sobre as etapas do parto normal: sinais de trabalho de parto, dilatação, expulsão e o pós-parto imediato.',
    prof: '💫 Dra. Ana Lima — Obstetra', profBg: 'rgba(229,152,125,0.12)', duration: '15 min',
  },
  {
    bg: '#D4A0B5', cat: 'Amamentação', catColor: '#b87a98',
    titulo: 'Primeiros Passos na Amamentação', meta: '9 min · Consultora',
    desc: 'Pega correta, posições mais confortáveis, como saber se o bebê está se alimentando bem e como lidar com os primeiros desafios da amamentação.',
    prof: '🤱 Ana Beatriz Costa — Consultora de Amamentação', profBg: 'rgba(212,160,181,0.15)', duration: '9 min',
  },
];

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [carouselIdx, setCarouselIdx] = useState(0);
  const carouselRef = useRef<FlatList>(null);
  const [videoModal, setVideoModal] = useState<Video | null>(null);

  useEffect(() => {
    storage.get<boolean>(STORAGE_KEYS.onboarded).then((v) => {
      if (!v) navigation.replace('Onboarding');
    });
  }, []);

  const onCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
    setCarouselIdx(idx);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="dark-content" />

      {/* ── HEADER FIXO ── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerGreet}>Bem-vinda, Maria! 🌿</Text>
            <Text style={styles.headerWeek}>Semana {SEMANA}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>MS</Text>
          </View>
        </View>
        {/* BARRA DE PROGRESSO */}
        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.round(PROGRESS * 100)}%` }]}>
              <View style={styles.progressDot} />
            </View>
          </View>
        </View>
      </View>

      {/* ── SCROLL CONTENT ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── CARROSSEL ── */}
        <View style={{ paddingTop: 18 }}>
          <FlatList
            ref={carouselRef}
            data={['dark', 'white']}
            horizontal
            pagingEnabled={false}
            snapToInterval={CARD_W + 16}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
            onScroll={onCarouselScroll}
            scrollEventThrottle={16}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              if (item === 'dark') {
                return (
                  <View style={[styles.card, styles.cardDark]}>
                    <View style={styles.cardLabel}>
                      <Text style={styles.cardLabelSub}>Sua Semana</Text>
                      <Text style={styles.cardLabelTitle}>Semana {SEMANA}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.ver3dBtn}
                      onPress={() => navigation.navigate('Feto3D')}
                    >
                      <Text style={styles.ver3dText}>VER EM 3D</Text>
                    </TouchableOpacity>
                    {/* Placeholder feto */}
                    <Text style={{ fontSize: 140, opacity: 0.85 }}>🫃</Text>
                  </View>
                );
              }
              return (
                <View style={[styles.card, styles.cardWhite]}>
                  <View style={styles.cardWhiteTop}>
                    <Text style={styles.sectionLabelSmall}>Comparação de Tamanho</Text>
                    <Text style={styles.sizeTitleText}>Bebê do tamanho de um abacate 🥑</Text>
                    <Text style={{ fontSize: 64, marginVertical: 8 }}>🥑</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={styles.sizeTag}><Text style={styles.sizeTagText}>📏 30 cm</Text></View>
                      <View style={styles.sizeTag}><Text style={styles.sizeTagText}>⚖️ 600 g</Text></View>
                    </View>
                  </View>
                  <View style={styles.cardWhiteBottom}>
                    <Text style={styles.nutriLabel}>Foco Nutricional da Semana</Text>
                    <Text style={styles.nutriTitle}>Ferro & Ômega-3 em foco ✨</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {['🥬 Folhas verdes', '🐟 Peixe', '🫘 Feijão'].map((f) => (
                        <View key={f} style={styles.foodChip}><Text style={styles.foodChipText}>{f}</Text></View>
                      ))}
                    </View>
                    <Text style={styles.nutriTip}>O ferro ajuda a prevenir anemia e o ômega-3 contribui para o desenvolvimento cerebral do bebê.</Text>
                  </View>
                </View>
              );
            }}
          />
          {/* DOTS */}
          <View style={styles.dots}>
            {[0, 1].map((i) => (
              <TouchableOpacity
                key={i}
                style={[styles.dot, carouselIdx === i && styles.dotActive]}
                onPress={() => carouselRef.current?.scrollToIndex({ index: i })}
              />
            ))}
          </View>
        </View>

        {/* ── ATALHOS RÁPIDOS ── */}
        <View style={{ paddingTop: 20 }}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 24 }]}>Atalhos Rápidos</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingVertical: 4 }}
          >
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity
                key={a.label}
                style={styles.quickBtn}
                onPress={() => navigation.navigate(a.screen)}
                activeOpacity={0.8}
              >
                <View style={styles.quickIcon}>{a.icon}</View>
                <Text style={styles.quickLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── PRÓXIMA CONSULTA ── */}
        <TouchableOpacity style={styles.upcomingCard} onPress={() => navigation.navigate('Consultas')} activeOpacity={0.9}>
          <View style={styles.upcomingIconWrap}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Rect x="3" y="4" width="18" height="18" rx="2" />
              <Line x1="16" y1="2" x2="16" y2="6" />
              <Line x1="8" y1="2" x2="8" y2="6" />
              <Line x1="3" y1="10" x2="21" y2="10" />
            </Svg>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.upcomingTop}>Próxima Consulta</Text>
            <Text style={styles.upcomingTitle}>Pré-natal — Dra. Ana Lima</Text>
            <Text style={styles.upcomingSub}>12 de março · Clínica Gerar Vida · 10h00</Text>
          </View>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.primaryLight} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="9 18 15 12 9 6" />
          </Svg>
        </TouchableOpacity>

        {/* ── PRONTUÁRIO ── */}
        <TouchableOpacity style={[styles.upcomingCard, { marginTop: 10 }]} onPress={() => navigation.navigate('Prontuario')} activeOpacity={0.9}>
          <View style={[styles.upcomingIconWrap, { backgroundColor: colors.accent }]}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <Polyline points="14 2 14 8 20 8" />
              <Line x1="16" y1="13" x2="8" y2="13" />
              <Line x1="16" y1="17" x2="8" y2="17" />
            </Svg>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.upcomingTop, { color: colors.primary }]}>Meu Prontuário</Text>
            <Text style={styles.upcomingTitle}>Maria da Silva · Semana 24</Text>
            <Text style={styles.upcomingSub}>DPP: 15/07/2026 · Tipo A+ · Dra. Ana Lima</Text>
          </View>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.primaryLight} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="9 18 15 12 9 6" />
          </Svg>
        </TouchableOpacity>

        {/* ── DICAS DA SEMANA ── */}
        <View style={{ paddingTop: 20, paddingHorizontal: 24 }}>
          <Text style={styles.sectionTitle}>Dicas da Semana 💡</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 12, paddingBottom: 4 }}>
          {TIPS.map((t) => (
            <View key={t.title} style={styles.tipCard}>
              <Text style={styles.tipEmoji}>{t.emoji}</Text>
              <Text style={styles.tipTitle}>{t.title}</Text>
              <Text style={styles.tipDesc}>{t.desc}</Text>
            </View>
          ))}
        </ScrollView>

        {/* ── AVISOS ── */}
        <View style={{ paddingTop: 20, paddingHorizontal: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Avisos da Clínica</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Avisos')}>
              <Text style={styles.sectionLink}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          {[
            { icon: '📅', titulo: 'Recesso de Carnaval', sub: 'Clínica fechada dias 3 e 4 de março · há 1 dia', bgIcon: 'rgba(229,152,125,0.15)' },
            { icon: '💉', titulo: 'Campanha de Vacinação', sub: 'Vacina da gripe disponível na recepção · há 3 dias', bgIcon: 'rgba(141,170,145,0.15)' },
          ].map((a) => (
            <TouchableOpacity key={a.titulo} style={styles.avisoCard} onPress={() => navigation.navigate('Avisos')} activeOpacity={0.85}>
              <View style={[styles.avisoIconWrap, { backgroundColor: a.bgIcon }]}>
                <Text style={{ fontSize: 18 }}>{a.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <Text style={styles.avisoTitulo}>{a.titulo}</Text>
                  <View style={styles.novoBadge}><Text style={styles.novoBadgeText}>Novo</Text></View>
                </View>
                <Text style={styles.avisoSub}>{a.sub}</Text>
              </View>
              <Text style={{ color: colors.textInactive, fontSize: 16 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── DICAS DE ESPECIALISTAS ── */}
        <View style={{ paddingTop: 24, paddingHorizontal: 24 }}>
          <Text style={styles.sectionTitle}>Dicas de Especialistas 🎬</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 12, paddingBottom: 4 }}>
          {VIDEOS.map((v) => (
            <TouchableOpacity key={v.titulo} style={styles.videoCard} onPress={() => setVideoModal(v)} activeOpacity={0.88}>
              <View style={[styles.videoThumb, { backgroundColor: v.bg }]}>
                <View style={styles.videoPlay}>
                  <Text style={{ color: 'white', fontSize: 14, marginLeft: 2 }}>▶</Text>
                </View>
                <View style={styles.videoCatBadge}>
                  <Text style={styles.videoCatText}>{v.cat}</Text>
                </View>
              </View>
              <View style={{ padding: 10 }}>
                <Text style={styles.videoTitle}>{v.titulo}</Text>
                <Text style={styles.videoMeta}>{v.meta}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>

      {/* ── VIDEO MODAL ── */}
      <Modal
        visible={!!videoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setVideoModal(null)}
      >
        <TouchableWithoutFeedback onPress={() => setVideoModal(null)}>
          <View style={styles.vmOverlay} />
        </TouchableWithoutFeedback>
        {videoModal && (
          <View style={[styles.vmSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.vmHandle} />
            {/* Thumb */}
            <View style={[styles.vmThumb, { backgroundColor: videoModal.bg }]}>
              <View style={styles.vmPlayBtn}>
                <Text style={{ color: 'white', fontSize: 22, marginLeft: 3 }}>▶</Text>
              </View>
            </View>
            {/* Category */}
            <Text style={[styles.vmCategory, { color: videoModal.catColor }]}>{videoModal.cat}</Text>
            {/* Title */}
            <Text style={styles.vmTitle}>{videoModal.titulo}</Text>
            {/* Description */}
            <Text style={styles.vmDesc}>{videoModal.desc}</Text>
            {/* Professional */}
            <View style={[styles.vmProf, { backgroundColor: videoModal.profBg }]}>
              <Text style={styles.vmProfText}>{videoModal.prof}</Text>
            </View>
            {/* Watch button */}
            <TouchableOpacity
              style={[styles.vmWatchBtn, { backgroundColor: videoModal.catColor }]}
              activeOpacity={0.85}
              onPress={() => Alert.alert('Em breve', 'Este vídeo ainda não está disponível.')}
            >
              <Text style={styles.vmWatchText}>▶  Assistir agora</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // HEADER
  header: {
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    paddingBottom: 14,
    zIndex: 100,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerGreet: { fontSize: 13, fontWeight: '500', color: colors.primary, letterSpacing: 0.2, marginBottom: 2 },
  headerWeek: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5, lineHeight: 30 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: colors.primary },
  avatarText: { fontSize: 14, fontWeight: '700', color: colors.primaryDk },
  progressWrap: {},
  progressBg: { height: 7, backgroundColor: colors.primaryLight, borderRadius: 99, overflow: 'visible' },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 99, position: 'relative', justifyContent: 'center', alignItems: 'flex-end' },
  progressDot: { width: 13, height: 13, borderRadius: 6.5, backgroundColor: colors.accent, borderWidth: 2.5, borderColor: colors.white, position: 'absolute', right: -6.5, shadowColor: colors.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 3 },

  // CARROSSEL
  card: { width: CARD_W, height: 320, borderRadius: 20, overflow: 'hidden' },
  cardDark: { backgroundColor: colors.darkCard, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { position: 'absolute', top: 20, left: 0, right: 0, alignItems: 'center', zIndex: 5 },
  cardLabelSub: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1.5 },
  cardLabelTitle: { fontSize: 22, fontWeight: '800', color: colors.white, letterSpacing: -0.3 },
  ver3dBtn: { position: 'absolute', top: 14, right: 14, zIndex: 20, backgroundColor: 'rgba(141,170,145,0.22)', borderWidth: 1.5, borderColor: 'rgba(141,170,145,0.5)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5 },
  ver3dText: { fontSize: 9, fontWeight: '700', color: colors.primaryLight, letterSpacing: 0.5 },
  cardWhite: { backgroundColor: colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  cardWhiteTop: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  cardWhiteBottom: { flex: 1.1, padding: 14 },
  sectionLabelSmall: { fontSize: 10, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 6 },
  sizeTitleText: { fontSize: 15, fontWeight: '700', color: colors.text },
  sizeTag: { backgroundColor: colors.bg, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4 },
  sizeTagText: { fontSize: 11, fontWeight: '600', color: colors.text },
  nutriLabel: { fontSize: 10, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 8 },
  nutriTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 },
  foodChip: { backgroundColor: 'rgba(141,170,145,0.12)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  foodChipText: { fontSize: 11, fontWeight: '600', color: colors.text },
  nutriTip: { fontSize: 11.5, color: '#6b7471', lineHeight: 17 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginTop: 14 },
  dot: { width: 7, height: 7, borderRadius: 99, backgroundColor: colors.primaryLight },
  dotActive: { backgroundColor: colors.accent, width: 20 },

  // QUICK ACTIONS
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 14, paddingHorizontal: 0 },
  sectionLink: { fontSize: 12, fontWeight: '700', color: colors.primary },
  quickBtn: { alignItems: 'center', gap: 8, width: 76 },
  quickIcon: { width: 60, height: 60, backgroundColor: colors.primary, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.38, shadowRadius: 10, elevation: 5 },
  quickLabel: { fontSize: 10.5, fontWeight: '600', color: colors.text, textAlign: 'center', lineHeight: 14 },

  // UPCOMING CARD
  upcomingCard: { marginHorizontal: 24, marginTop: 20, backgroundColor: colors.white, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  upcomingIconWrap: { width: 46, height: 46, backgroundColor: colors.accent, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  upcomingTop: { fontSize: 10, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  upcomingTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  upcomingSub: { fontSize: 11.5, color: '#9aa09d', marginTop: 1 },

  // TIPS
  tipCard: { width: 150, backgroundColor: colors.white, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  tipEmoji: { fontSize: 24, marginBottom: 8 },
  tipTitle: { fontSize: 12, fontWeight: '700', color: colors.text, lineHeight: 16, marginBottom: 5 },
  tipDesc: { fontSize: 10.5, color: '#9aa09d', lineHeight: 15 },

  // AVISOS
  avisoCard: { backgroundColor: colors.white, borderRadius: 16, padding: 14, paddingHorizontal: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avisoIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avisoTitulo: { fontSize: 14, fontWeight: '700', color: colors.text },
  avisoSub: { fontSize: 12, color: colors.textInactive },
  novoBadge: { backgroundColor: 'rgba(94,126,99,0.15)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  novoBadgeText: { fontSize: 9, fontWeight: '700', color: colors.primaryDk },

  // VIDEOS
  videoCard: { width: 148, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  videoThumb: { width: '100%', height: 86, justifyContent: 'center', alignItems: 'center' },
  videoPlay: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)', justifyContent: 'center', alignItems: 'center' },
  videoCatBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.22)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  videoCatText: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 0.3 },
  videoTitle: { fontSize: 12, fontWeight: '700', color: colors.text, lineHeight: 16, marginBottom: 5 },
  videoMeta: { fontSize: 10.5, color: colors.textInactive, fontWeight: '500' },

  // VIDEO MODAL
  vmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  vmSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12 },
  vmHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.12)', alignSelf: 'center', marginBottom: 16 },
  vmThumb: { width: '100%', height: 160, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden' },
  vmPlayBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center' },
  vmCategory: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  vmTitle: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3, lineHeight: 24, marginBottom: 10 },
  vmDesc: { fontSize: 13.5, color: colors.textMid, lineHeight: 21, marginBottom: 14 },
  vmProf: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  vmProfText: { fontSize: 13, fontWeight: '600', color: colors.text },
  vmWatchBtn: { borderRadius: 99, padding: 16, alignItems: 'center', marginBottom: 4 },
  vmWatchText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
