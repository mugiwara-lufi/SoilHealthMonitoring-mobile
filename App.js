import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import ExploreScreen from './screens/ExploreScreen';
import MonitorScreen from './screens/MonitorScreen';
import LoginScreen from './screens/LoginScreen';
import ProfileScreen from './screens/ProfileScreen';
import { FARM_DATA } from './data/mockData';

export default function App() {
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('Explore');
  
  // 1. Lifted plots state with Plot C set to Critical
  const [plots, setPlots] = useState(FARM_DATA.plots.map(p => 
    p.id === '3' ? { ...p, status: 'Critical', color: '#dc2626' } : p
  ));
  
  const [selectedPlot, setSelectedPlot] = useState(null);

  if (!user) {
    return <LoginScreen onLogin={(name) => setUser({ name })} />;
  }

  const handleSelectPlot = (plot) => {
    setSelectedPlot(plot);
    setCurrentScreen('Monitor');
  };

  // 2. Function to add plot at the BOTTOM
  const handleAddPlot = (newPlot) => {
    setPlots([...plots, newPlot]); 
  };

  // 3. NEW: Function to remove plot from state
  const handleDeletePlot = (id) => {
    setPlots(plots.filter(plot => plot.id !== id));
  };

  return (
    <View style={{ flex: 1 }}>
      {currentScreen === 'Explore' ? (
        <ExploreScreen 
          plots={plots} 
          onAddPlot={handleAddPlot} 
          onDeletePlot={handleDeletePlot} // Passed new delete function
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

      {currentScreen === 'Monitor' && (
        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('Explore')}>
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
    elevation: 5 
  },
  backText: { color: '#fff', fontWeight: 'bold' }
});