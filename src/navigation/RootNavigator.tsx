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

function getInitialRoute(role?: string): keyof RootStackParams {
  if (role === 'doctor') return 'Doctor';
  if (role === 'secretary') return 'Secretary';
  if (role === 'patient') return 'Patient';
  return 'Login';
}

export function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const initialRoute = isAuthenticated ? getInitialRoute(user?.role) : 'Login';

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Patient" component={PatientNavigator} />
          <Stack.Screen name="Doctor" component={DoctorNavigator} />
          <Stack.Screen name="Secretary" component={SecretaryNavigator} />
        </>
      )}
    </Stack.Navigator>
  );
}
