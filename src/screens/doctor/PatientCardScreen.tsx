import React from 'react';
import { View, Text } from 'react-native';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { colors } from '../../theme';

export function PatientCardScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Cartão da Gestante" />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textMid }}>Em construção...</Text>
      </View>
    </View>
  );
}
