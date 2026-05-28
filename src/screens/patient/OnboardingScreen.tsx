import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PatientStackParams } from '../../navigation/PatientNavigator';
import { storage, STORAGE_KEYS } from '../../services/storage';
import { colors, spacing, radius } from '../../theme';

const { width } = Dimensions.get('window');
const slides = [
  { icon: '🌱', title: 'Bem-vinda ao\nGerar Vida', desc: 'Seu parceiro digital para um pré-natal completo e tranquilo. Acompanhe cada semana da sua gestação.' },
  { icon: '🫁', title: 'Veja seu bebê\nem 3D', desc: 'Explore o desenvolvimento do seu bebê em um modelo 3D interativo e acompanhe cada detalhe.' },
  { icon: '🏥', title: 'Clínica Gerar Vida\nperto de você', desc: 'Médico Dedicado · Resultados Online · Canal 24h.\nTudo que você precisa em um só lugar.' },
];
type Nav = NativeStackNavigationProp<PatientStackParams>;

export function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width));
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
        <Text style={styles.btnText}>{activeIndex < slides.length - 1 ? 'Próximo' : 'Começar'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  slide: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: 80 },
  icon: { fontSize: 80, marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.5, marginBottom: 16 },
  desc: { fontSize: 15, color: colors.textMid, textAlign: 'center', lineHeight: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primaryLight },
  dotActive: { backgroundColor: colors.primary, width: 24 },
  btn: { marginHorizontal: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.full, padding: 18, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
