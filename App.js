import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import ExploreScreen from './screens/ExploreScreen';
import MonitorScreen from './screens/MonitorScreen';
import LoginScreen from './screens/LoginScreen';
import ProfileScreen from './screens/ProfileScreen';

export default function App() {
  const [user, setUser] = useState(null); // Auth State
  const [currentScreen, setCurrentScreen] = useState('Explore'); // Navigation State
  const [selectedPlot, setSelectedPlot] = useState(null); // Data State

  // 1. If no user is logged in, show Login Screen
  if (!user) {
    return <LoginScreen onLogin={(name) => setUser({ name })} />;
  }

  // 2. Navigation Handler for Plots
  const handleSelectPlot = (plot) => {
    setSelectedPlot(plot);
    setCurrentScreen('Monitor');
  };

  return (
    <View style={{ flex: 1 }}>
      {currentScreen === 'Explore' ? (
        <ExploreScreen 
          onSelectPlot={handleSelectPlot} 
          onOpenProfile={() => setCurrentScreen('Profile')} 
        />
      ) : currentScreen === 'Monitor' ? (
        <MonitorScreen plotData={selectedPlot} />
      ) : (
        <ProfileScreen 
          user={user} 
          onLogout={() => { setUser(null); setCurrentScreen('Explore'); }} 
          onBack={() => setCurrentScreen('Explore')} 
        />
      )}

      {/* Floating Back Button (Shared for Monitor Screen) */}
      {currentScreen === 'Monitor' && (
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setCurrentScreen('Explore')}
        >
          <Text style={styles.backText}>⬅ Back to Overview</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  backText: { color: '#fff', fontWeight: 'bold' }
});