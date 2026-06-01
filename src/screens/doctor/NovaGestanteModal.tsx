import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Modal,
  TouchableWithoutFeedback, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { patientsService } from '../../services/patients';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../theme';

type IGMethod = 'ig' | 'dum' | 'dpp' | 'fiv';

const FIV_TYPES = [
  { value: 'coleta', label: 'Dia da coleta dos óvulos' },
  { value: 'd3', label: 'Transferência D3' },
  { value: 'd5', label: 'Transferência D5' },
  { value: 'd6', label: 'Transferência D6' },
  { value: 'd7', label: 'Transferência D7' },
];

const FIV_OFFSETS: Record<string, number> = {
  coleta: 14, d3: 17, d5: 19, d6: 20, d7: 21,
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function parseDate(s: string): Date | null {
  const parts = s.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y || y < 1900) return null;
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function calcFromIG(weeks: number, days: number): { lmp: Date; edd: Date } {
  const totalDays = weeks * 7 + days;
  const lmp = addDays(new Date(), -totalDays);
  const edd = addDays(lmp, 280);
  return { lmp, edd };
}

function calcFromDUM(dum: Date): { lmp: Date; edd: Date } {
  return { lmp: dum, edd: addDays(dum, 280) };
}

function calcFromDPP(dpp: Date): { lmp: Date; edd: Date } {
  const lmp = addDays(dpp, -280);
  return { lmp, edd: dpp };
}

function calcFromFIV(transferDate: Date, fivType: string): { lmp: Date; edd: Date } {
  const offset = FIV_OFFSETS[fivType] ?? 19;
  const lmp = addDays(transferDate, -offset);
  return { lmp, edd: addDays(lmp, 280) };
}

function calcIG(lmp: Date): string {
  const ms = Date.now() - lmp.getTime();
  const totalDays = Math.floor(ms / (1000 * 60 * 60 * 24));
  const w = Math.floor(totalDays / 7);
  const d = totalDays % 7;
  return `${w}s ${d}d`;
}

function maskDate(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function maskPhone(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (patientId: string) => void;
}

export function NovaGestanteModal({ visible, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [nome, setNome] = useState('');
  const [method, setMethod] = useState<IGMethod>('dum');

  // IG manual
  const [igWeeks, setIgWeeks] = useState('');
  const [igDays, setIgDays] = useState('');

  // DUM / DPP
  const [dateField, setDateField] = useState('');

  // FIV
  const [fivType, setFivType] = useState('d5');
  const [fivDate, setFivDate] = useState('');

  // Contatos
  const [showContatos, setShowContatos] = useState(false);
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function getPreview(): string {
    try {
      const result = resolveIG();
      if (!result) return '';
      return `IG: ${calcIG(result.lmp)} · DPP: ${result.edd.toLocaleDateString('pt-BR')}`;
    } catch {
      return '';
    }
  }

  function resolveIG(): { lmp: Date; edd: Date } | null {
    if (method === 'ig') {
      const w = parseInt(igWeeks) || 0;
      const d = parseInt(igDays) || 0;
      if (!igWeeks) return null;
      return calcFromIG(w, d);
    }
    if (method === 'dum') {
      const dt = parseDate(dateField);
      if (!dt) return null;
      return calcFromDUM(dt);
    }
    if (method === 'dpp') {
      const dt = parseDate(dateField);
      if (!dt) return null;
      return calcFromDPP(dt);
    }
    if (method === 'fiv') {
      const dt = parseDate(fivDate);
      if (!dt) return null;
      return calcFromFIV(dt, fivType);
    }
    return null;
  }

  function reset() {
    setNome(''); setMethod('dum'); setIgWeeks(''); setIgDays('');
    setDateField(''); setFivType('d5'); setFivDate('');
    setEmail(''); setTelefone(''); setShowContatos(false); setError('');
  }

  async function handleCriar() {
    if (!nome.trim()) { setError('Nome é obrigatório.'); return; }
    const ig = resolveIG();
    if (!ig) { setError('Preencha a Idade Gestacional.'); return; }
    if (!user?.clinic_id) { setError('Clínica não identificada.'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await patientsService.createPatient({
        name: nome.trim(),
        clinic_id: user.clinic_id,
        doctor_id: user.id,
        email: email.trim() || undefined,
        phone: telefone || undefined,
        lmp_date: toISODate(ig.lmp),
        edd: toISODate(ig.edd),
      });
      reset();
      onCreated(res.patient_id);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao criar gestante.');
    } finally {
      setLoading(false);
    }
  }

  const preview = getPreview();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.kvWrapper}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.handle} />
          <Text style={s.title}>Nova Gestação</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* NOME */}
            <Text style={s.label}>Nome da gestante *</Text>
            <TextInput
              style={s.input}
              placeholder="Nome completo"
              placeholderTextColor={colors.textInactive}
              value={nome}
              onChangeText={setNome}
            />

            {/* MÉTODO IG */}
            <Text style={s.label}>Idade Gestacional *</Text>
            <View style={s.methodRow}>
              {(['ig', 'dum', 'dpp', 'fiv'] as IGMethod[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[s.methodChip, method === m && s.methodChipActive]}
                  onPress={() => { setMethod(m); setDateField(''); }}
                >
                  <Text style={[s.methodChipText, method === m && s.methodChipTextActive]}>
                    {m.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {method === 'ig' && (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.sublabel}>Semanas</Text>
                  <TextInput style={s.input} keyboardType="number-pad" placeholder="Ex: 20"
                    placeholderTextColor={colors.textInactive} value={igWeeks} onChangeText={setIgWeeks} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sublabel}>Dias</Text>
                  <TextInput style={s.input} keyboardType="number-pad" placeholder="Ex: 3"
                    placeholderTextColor={colors.textInactive} value={igDays} onChangeText={setIgDays} />
                </View>
              </View>
            )}

            {(method === 'dum' || method === 'dpp') && (
              <>
                <Text style={s.sublabel}>{method === 'dum' ? 'Data da DUM' : 'Data da DPP'}</Text>
                <TextInput style={s.input} placeholder="DD/MM/AAAA" keyboardType="number-pad"
                  placeholderTextColor={colors.textInactive}
                  value={dateField} onChangeText={(v) => setDateField(maskDate(v))} />
              </>
            )}

            {method === 'fiv' && (
              <>
                <Text style={s.sublabel}>Tipo de FIV</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                  {FIV_TYPES.map((t) => (
                    <TouchableOpacity key={t.value} style={[s.methodChip, fivType === t.value && s.methodChipActive]}
                      onPress={() => setFivType(t.value)}>
                      <Text style={[s.methodChipText, fivType === t.value && s.methodChipTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={s.sublabel}>Data da transferência</Text>
                <TextInput style={s.input} placeholder="DD/MM/AAAA" keyboardType="number-pad"
                  placeholderTextColor={colors.textInactive}
                  value={fivDate} onChangeText={(v) => setFivDate(maskDate(v))} />
              </>
            )}

            {preview ? (
              <View style={s.previewBox}>
                <Text style={s.previewText}>{preview}</Text>
              </View>
            ) : null}

            {/* CONTATOS */}
            <TouchableOpacity style={s.collapseHeader} onPress={() => setShowContatos(!showContatos)}>
              <Text style={s.collapseLabel}>Contatos (opcional)</Text>
              <Text style={s.collapseChevron}>{showContatos ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showContatos && (
              <>
                <Text style={s.sublabel}>E-mail</Text>
                <TextInput style={s.input} placeholder="email@exemplo.com" keyboardType="email-address"
                  autoCapitalize="none" placeholderTextColor={colors.textInactive}
                  value={email} onChangeText={setEmail} />
                <Text style={s.sublabel}>Celular</Text>
                <TextInput style={s.input} placeholder="(11) 99999-9999" keyboardType="phone-pad"
                  placeholderTextColor={colors.textInactive}
                  value={telefone} onChangeText={(v) => setTelefone(maskPhone(v))} />
              </>
            )}

            {error ? <Text style={s.error}>{error}</Text> : null}

            {/* AÇÕES */}
            <View style={s.actions}>
              <TouchableOpacity style={s.btnCancel} onPress={onClose}>
                <Text style={s.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnCreate} onPress={handleCriar} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnCreateText}>Criar Gestação</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  kvWrapper: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg, paddingTop: 12, maxHeight: '92%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMid, marginBottom: 8 },
  sublabel: { fontSize: 12, fontWeight: '600', color: colors.textInactive, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: colors.bg, borderRadius: radius.md, padding: 14,
    fontSize: 14, color: colors.text, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)',
  },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  methodChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: colors.bg, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
  },
  methodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  methodChipText: { fontSize: 12, fontWeight: '700', color: colors.textMid },
  methodChipTextActive: { color: '#fff' },
  previewBox: {
    backgroundColor: 'rgba(141,170,145,0.12)', borderRadius: radius.md,
    padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  previewText: { fontSize: 13, fontWeight: '600', color: colors.primaryDk },
  collapseHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.07)', marginBottom: 4,
  },
  collapseLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  collapseChevron: { fontSize: 11, color: colors.textInactive },
  error: { fontSize: 13, color: colors.red, marginBottom: 12, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 8 },
  btnCancel: {
    flex: 1, paddingVertical: 14, borderRadius: radius.md,
    backgroundColor: colors.bg, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
  },
  btnCancelText: { fontSize: 14, fontWeight: '700', color: colors.textMid },
  btnCreate: { flex: 2, paddingVertical: 14, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
  btnCreateText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
