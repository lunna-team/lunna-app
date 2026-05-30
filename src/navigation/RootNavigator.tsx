import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { PatientNavigator } from './PatientNavigator';
import { DoctorNavigator } from './DoctorNavigator';
import { SecretaryNavigator } from './SecretaryNavigator';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme';

export type RootStackParams = {
  Login: undefined;
  Patient: undefined;
  Doctor: undefined;
  Secretary: undefined;
};

const Stack = createNativeStackNavigator<RootStackParams>();


export function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  const role = user?.role;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {role === 'patient' && <Stack.Screen name="Patient" component={PatientNavigator} />}
      {role === 'doctor' && <Stack.Screen name="Doctor" component={DoctorNavigator} />}
      {role === 'secretary' && <Stack.Screen name="Secretary" component={SecretaryNavigator} />}
    </Stack.Navigator>
  );
}
