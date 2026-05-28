import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardMedicoScreen } from '../screens/doctor/DashboardMedicoScreen';
import { MedicoPacientesScreen } from '../screens/doctor/MedicoPacientesScreen';
import { PacienteDetalheScreen } from '../screens/doctor/PacienteDetalheScreen';
import { AgendaMedicoScreen } from '../screens/doctor/AgendaMedicoScreen';

export type DoctorStackParams = {
  DashboardMedico: undefined;
  MedicoPacientes: undefined;
  PacienteDetalhe: undefined;
  AgendaMedico: undefined;
};

const Stack = createNativeStackNavigator<DoctorStackParams>();

export function DoctorNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="DashboardMedico">
      <Stack.Screen name="DashboardMedico" component={DashboardMedicoScreen} />
      <Stack.Screen name="MedicoPacientes" component={MedicoPacientesScreen} />
      <Stack.Screen name="PacienteDetalhe" component={PacienteDetalheScreen} />
      <Stack.Screen name="AgendaMedico" component={AgendaMedicoScreen} />
    </Stack.Navigator>
  );
}
