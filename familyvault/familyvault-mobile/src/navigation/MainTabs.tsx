import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from '../types';
import HomeScreen from '../screens/files/HomeScreen';
import UploadScreen from '../screens/files/UploadScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#0F0E17' },
        headerTintColor: '#FFFFFE',
        headerTitleStyle: { fontWeight: '600' },
        tabBarStyle: { backgroundColor: '#0F0E17', borderTopColor: '#2D2B55' },
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#A7A9BE',
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, string> = {
            Files: focused ? 'folder' : 'folder-outline',
            Upload: focused ? 'cloud-upload' : 'cloud-upload-outline',
            Profile: focused ? 'person-circle' : 'person-circle-outline',
          };
          return <Ionicons name={icons[route.name] as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Files" component={HomeScreen} options={{ title: 'Family Files' }} />
      <Tab.Screen name="Upload" component={UploadScreen} options={{ title: 'Upload' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
