import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AIHomeScreen from '../features/ai-diagnosis/screens/AIHomeScreen';
import CameraScreen from '../features/ai-diagnosis/screens/CameraScreen';
import ImagePreviewScreen from '../features/ai-diagnosis/screens/ImagePreviewScreen';
import AnalysisScreen from '../features/ai-diagnosis/screens/AnalysisScreen';
import ResultScreen from '../features/ai-diagnosis/screens/ResultScreen';
import HistoryScreen from '../features/ai-diagnosis/screens/HistoryScreen';

const Stack = createStackNavigator();

const AINavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { elevation: 0, shadowOpacity: 0 },
      }}
    >
      <Stack.Screen
        name="AIHome"
        component={AIHomeScreen}
        options={{ title: 'First Diagnosis AI' }}
      />
      <Stack.Screen
        name="Camera"
        component={CameraScreen}
        options={{ title: 'Ambil Foto Gigi', headerShown: false }}
      />
      <Stack.Screen
        name="ImagePreview"
        component={ImagePreviewScreen}
        options={{ title: 'Preview Foto' }}
      />
      <Stack.Screen
        name="Analysis"
        component={AnalysisScreen}
        options={{ title: 'Menganalisis...', headerShown: false }}
      />
      <Stack.Screen
        name="Result"
        component={ResultScreen}
        options={{ title: 'Hasil Diagnosis' }}
      />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'Riwayat Diagnosis' }}
      />
    </Stack.Navigator>
  );
};

export default AINavigator;
