import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { messagesService } from '../../services/messages';
import { useAuth } from '../../contexts/AuthContext';
import { storage, STORAGE_KEYS } from '../../services/storage';
import { colors, spacing, radius } from '../../theme';
import type { Message } from '../../types';

const QUICK_REPLIES = [
  'Estou com enjoo 🤢',
  'Tenho uma dúvida sobre meu exame',
  'Preciso remarcar consulta',
  'Sinto dor nas costas',
  'Bebê está se movendo bem?',
];

export function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const insets = useSafeAreaInsets();

  const patientId = user?.id ?? '';

  const connectWS = useCallback(async () => {
    if (!patientId) return;
    const token = await storage.get<string>(STORAGE_KEYS.accessToken);
    if (!token) return;

    wsRef.current = messagesService.connectWS(
      patientId,
      token,
      (msg) => {
        setMessages((prev) => {
          // deduplicate by id
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTyping(false);
      },
      (code) => {
        if (code !== 4001) {
          setTimeout(connectWS, 3000);
        }
      },
    );
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return;

    messagesService
      .list(patientId, { limit: 50 })
      .then((res) => setMessages([...res.data].reverse()))
      .catch(() => {});

    messagesService.markRead(patientId).catch(() => {});

    connectWS();

    return () => {
      wsRef.current?.close();
    };
  }, [patientId]);

  const send = async (content?: string) => {
    const t = (content ?? text).trim();
    if (!t || !patientId) return;
    setText('');

    // optimistic local message
    const tempId = `temp_${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      patient_id: patientId,
      sender_id: user?.id ?? '',
      sender_role: 'patient',
      content: t,
      read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ content: t }));
    } else {
      try {
        const sent = await messagesService.send(patientId, t);
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? sent : m)),
        );
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    }
  };

  const isFromMe = (msg: Message) => msg.sender_role === 'patient';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <ScreenHeader title="Chat com Equipe" />
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const mine = isFromMe(item);
            return (
              <View style={[styles.bubbleWrap, mine && styles.bubbleWrapMe]}>
                {!mine && (
                  <View style={styles.avatar}>
                    <Text style={{ fontSize: 14 }}>👩‍⚕️</Text>
                  </View>
                )}
                <View style={[styles.bubble, mine ? styles.bubbleMe : styles.bubbleThem]}>
                  <Text style={[styles.bubbleText, mine && styles.bubbleTextMe]}>
                    {item.content}
                  </Text>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            typing ? (
              <View style={styles.bubbleWrap}>
                <View style={styles.avatar}>
                  <Text style={{ fontSize: 14 }}>👩‍⚕️</Text>
                </View>
                <View style={[styles.bubble, styles.bubbleThem]}>
                  <Text style={styles.bubbleText}>digitando...</Text>
                </View>
              </View>
            ) : null
          }
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {QUICK_REPLIES.map((q) => (
            <TouchableOpacity
              key={q}
              style={styles.chip}
              onPress={() => send(q)}
              activeOpacity={0.7}
            >
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
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={() => send()}
            activeOpacity={0.8}
          >
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
