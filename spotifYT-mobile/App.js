import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';

import { initDb } from './src/database/db';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import WrappedScreen from './src/screens/WrappedScreen';

const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

export default function App() {
  const [currentSong, setCurrentSong] = useState(null);
  const [libraryVersion, setLibraryVersion] = useState(0);

  useEffect(() => {
    initDb().catch(console.error);
  }, []);

  const handleSongActivated = (song, targetTab = 'Player') => {
    if (!song) {
      return;
    }

    setCurrentSong(song);

    if (navigationRef.isReady()) {
      navigationRef.navigate(targetTab);
    }
  };

  const handleSongDownloaded = (song) => {
    setLibraryVersion((version) => version + 1);

    if (navigationRef.isReady()) {
      navigationRef.navigate('Library');
    }
  };

  const handleLibraryChanged = (nextCurrentSong = null) => {
    setLibraryVersion((version) => version + 1);
    if (nextCurrentSong !== undefined) {
      setCurrentSong(nextCurrentSong);
    }
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#F2F6F5',
              borderTopWidth: 0,
              elevation: 0,
              height: 68,
              paddingBottom: 10,
              paddingTop: 6,
            },
            tabBarActiveTintColor: '#6E8B7D',
            tabBarInactiveTintColor: '#A7B7AF',
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
            },
            tabBarIcon: ({ color, size }) => {
              const iconMap = {
                Home: 'home-filled',
                Search: 'travel-explore',
                Library: 'library-music',
                Player: 'album',
                Stats: 'insights',
              };

              return <MaterialIcons color={color} name={iconMap[route.name]} size={size} />;
            },
          })}>
          <Tab.Screen name="Home">
            {() => (
              <HomeScreen
                currentSong={currentSong}
                onSelectSong={(song) => handleSongActivated(song, 'Player')}
                refreshToken={libraryVersion}
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="Search">
            {() => (
              <SearchScreen
                onSongDownloaded={handleSongDownloaded}
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="Library">
            {() => (
              <LibraryScreen
                currentSong={currentSong}
                onLibraryChanged={handleLibraryChanged}
                onSelectSong={(song) => handleSongActivated(song, 'Player')}
                refreshToken={libraryVersion}
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="Player">
            {() => <PlayerScreen currentSong={currentSong} />}
          </Tab.Screen>
          <Tab.Screen name="Stats">
            {() => <WrappedScreen refreshToken={libraryVersion} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
