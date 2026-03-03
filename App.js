import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MonitorScreen from './screens/MonitorScreen';
import ExploreScreen from './screens/ExploreScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Explore');
  const [selectedPlot, setSelectedPlot] = useState(null);

  // Function to handle clicking a plot in ExploreScreen
  const handleSelectPlot = (plot) => {
    setSelectedPlot(plot);
    setCurrentScreen('Monitor');
  };

  return (
    <View style={{ flex: 1 }}>
      {currentScreen === 'Explore' ? (
        <ExploreScreen onSelectPlot={handleSelectPlot} />
      ) : (
        <MonitorScreen plotData={selectedPlot} />
      )}

      {/* Floating Back Button (Only shows when in Monitor screen) */}
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
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 5,
  },
  backText: { color: '#fff', fontWeight: 'bold' }
});