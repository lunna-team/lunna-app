import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { colors, spacing, radius } from '../../theme';

interface Msg { id: number; text: string; fromMe: boolean; }

const INITIAL: Msg[] = [
  { id: 1, text: 'Oi, Dra. Ana! Tudo bem?', fromMe: true },
  { id: 2, text: 'Olá, Maria! Tudo ótimo. Como você está se sentindo?', fromMe: false },
  { id: 3, text: 'Estou sentindo algumas contrações leves, é normal?', fromMe: true },
  { id: 4, text: 'Com 24 semanas é comum sentir contrações de Braxton Hicks. Se forem regulares ou dolorosas, nos avise imediatamente. 🩺', fromMe: false },
];

const AUTO_REPLIES = [
  'Entendido! Vou verificar e te retorno em breve.',
  'Obrigada por me avisar. Acompanhe e me informe se piorar.',
  'Isso é normal nessa fase. Mas fique atenta a qualquer mudança.',
  'Registrei aqui. Vejo você na próxima consulta! 💚',
];

const QUICK_REPLIES = [
  'Estou com enjoo 🤢',
  'Tenho uma dúvida sobre meu exame',
  'Preciso remarcar consulta',
  'Sinto dor nas costas',
  'Bebê está se movendo bem?',
];

export function ChatScreen() {
  const [messages, setMessages] = useState<Msg[]>(INITIAL);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const send = (msg?: string) => {
    const t = (msg ?? text).trim();
    if (!t) return;
    const mine: Msg = { id: Date.now(), text: t, fromMe: true };
    setMessages((prev) => [...prev, mine]);
    setText('');
    setTyping(true);
    setTimeout(() => {
      const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      setMessages((prev) => [...prev, { id: Date.now() + 1, text: reply, fromMe: false }]);
      setTyping(false);
    }, 1800);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <ScreenHeader title="Chat com Equipe" />
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.bubbleWrap, item.fromMe && styles.bubbleWrapMe]}>
              {!item.fromMe && <View style={styles.avatar}><Text style={{ fontSize: 14 }}>👩‍⚕️</Text></View>}
              <View style={[styles.bubble, item.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={[styles.bubbleText, item.fromMe && styles.bubbleTextMe]}>{item.text}</Text>
              </View>
            </View>
          )}
          ListFooterComponent={typing ? (
            <View style={styles.bubbleWrap}>
              <View style={styles.avatar}><Text style={{ fontSize: 14 }}>👩‍⚕️</Text></View>
              <View style={[styles.bubble, styles.bubbleThem]}>
                <Text style={styles.bubbleText}>digitando...</Text>
              </View>
            </View>
          ) : null}
        />

        {/* QUICK REPLY CHIPS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {QUICK_REPLIES.map((q) => (
            <TouchableOpacity key={q} style={styles.chip} onPress={() => send(q)} activeOpacity={0.7}>
              <Text style={styles.chipText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Mensagem..."
            placeholderTextColor={colors.textInactive}
            multiline
            maxLength={500}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={() => send()} activeOpacity={0.8}>
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  bubbleWrap: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', gap: 8 },
  bubbleWrapMe: { justifyContent: 'flex-end' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  bubble: { maxWidth: '75%', borderRadius: 16, padding: 12 },
  bubbleMe: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: colors.white, borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  bubbleText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  bubbleTextMe: { color: colors.white },
  chipsScroll: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  chipsContent: { paddingHorizontal: spacing.md, paddingVertical: 10, gap: 8 },
  chip: { backgroundColor: colors.primaryLight, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.primaryDk },
  inputRow: { flexDirection: 'row', padding: spacing.md, backgroundColor: colors.white, alignItems: 'flex-end', gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  input: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.full, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: colors.text, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendIcon: { fontSize: 18, color: colors.white, fontWeight: '700' },
});
