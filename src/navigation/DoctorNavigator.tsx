import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardMedicoScreen } from '../screens/doctor/DashboardMedicoScreen';
import { MedicoPacientesScreen } from '../screens/doctor/MedicoPacientesScreen';
import { PacienteDetalheScreen } from '../screens/doctor/PacienteDetalheScreen';
import { AgendaMedicoScreen } from '../screens/doctor/AgendaMedicoScreen';
import { DoctorCardTemplateScreen } from '../screens/doctor/DoctorCardTemplateScreen';
import { PatientCardScreen } from '../screens/doctor/PatientCardScreen';

export type DoctorStackParams = {
  DashboardMedico: undefined;
  MedicoPacientes: undefined;
  PacienteDetalhe: { patientId: string };
  AgendaMedico: undefined;
  CardTemplate: undefined;
  PatientCard: { patientId: string; patientName: string };
};

const Stack = createNativeStackNavigator<DoctorStackParams>();

export function DoctorNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="DashboardMedico">
      <Stack.Screen name="DashboardMedico" component={DashboardMedicoScreen} />
      <Stack.Screen name="MedicoPacientes" component={MedicoPacientesScreen} />
      <Stack.Screen name="PacienteDetalhe" component={PacienteDetalheScreen} />
      <Stack.Screen name="AgendaMedico" component={AgendaMedicoScreen} />
      <Stack.Screen name="CardTemplate" component={DoctorCardTemplateScreen} />
      <Stack.Screen name="PatientCard" component={PatientCardScreen} />
    </Stack.Navigator>
  );
}
