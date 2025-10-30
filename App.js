import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import CaptureScreen from './screens/CaptureScreen';
import DescriptionEditScreen from './screens/DescriptionEditScreen';
import PlaybackScreen from './screens/PlaybackScreen';
import ARViewScreen from './screens/ARViewScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Capture" component={CaptureScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="DescriptionEdit" component={DescriptionEditScreen} />
        <Stack.Screen name="Playback" component={PlaybackScreen} options={{ animation: 'fade' }} />
        <Stack.Screen
          name="ARView"
          component={ARViewScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
