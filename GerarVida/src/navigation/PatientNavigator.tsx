import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingScreen } from '../screens/patient/OnboardingScreen';
import { HomeScreen } from '../screens/patient/HomeScreen';
import { ChatScreen } from '../screens/patient/ChatScreen';
import { AreaMedicaScreen } from '../screens/patient/AreaMedicaScreen';
import { PerfilScreen } from '../screens/patient/PerfilScreen';
import { NomesScreen } from '../screens/patient/NomesScreen';
import { Feto3DScreen } from '../screens/patient/Feto3DScreen';
import { ConsultasScreen } from '../screens/patient/ConsultasScreen';
import { ContracoesScreen } from '../screens/patient/ContracoesScreen';
import { GlicoseScreen } from '../screens/patient/GlicoseScreen';
import { PressaoScreen } from '../screens/patient/PressaoScreen';
import { AvisosScreen } from '../screens/patient/AvisosScreen';
import { ProntuarioScreen } from '../screens/patient/ProntuarioScreen';

export type PatientStackParams = {
  Onboarding: undefined;
  Home: undefined;
  Chat: undefined;
  AreaMedica: undefined;
  Perfil: undefined;
  Nomes: undefined;
  Feto3D: undefined;
  Consultas: undefined;
  Contracoes: undefined;
  Glicose: undefined;
  Pressao: undefined;
  Avisos: undefined;
  Prontuario: undefined;
};

const Stack = createNativeStackNavigator<PatientStackParams>();

export function PatientNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Home">
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="AreaMedica" component={AreaMedicaScreen} />
      <Stack.Screen name="Perfil" component={PerfilScreen} />
      <Stack.Screen name="Nomes" component={NomesScreen} />
      <Stack.Screen name="Feto3D" component={Feto3DScreen} />
      <Stack.Screen name="Consultas" component={ConsultasScreen} />
      <Stack.Screen name="Contracoes" component={ContracoesScreen} />
      <Stack.Screen name="Glicose" component={GlicoseScreen} />
      <Stack.Screen name="Pressao" component={PressaoScreen} />
      <Stack.Screen name="Avisos" component={AvisosScreen} />
      <Stack.Screen name="Prontuario" component={ProntuarioScreen} />
    </Stack.Navigator>
  );
}
