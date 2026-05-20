import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardSecretariaScreen } from '../screens/secretary/DashboardSecretariaScreen';

export type SecretaryStackParams = {
  DashboardSecretaria: undefined;
};

const Stack = createNativeStackNavigator<SecretaryStackParams>();

export function SecretaryNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardSecretaria" component={DashboardSecretariaScreen} />
    </Stack.Navigator>
  );
}
