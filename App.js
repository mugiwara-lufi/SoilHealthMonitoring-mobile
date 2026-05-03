// --- App.js ---

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import ExploreScreen from './screens/ExploreScreen';
import MonitorScreen from './screens/MonitorScreen';
import LoginScreen from './screens/LoginScreen';
import ProfileScreen from './screens/ProfileScreen';

const BASE_URL = "http://192.168.5.66:8000/api"; 
const AUTH_URL = "http://192.168.5.66:8000/api/api-token-auth/";

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); 
  const [currentScreen, setCurrentScreen] = useState('Explore');
  const [plots, setPlots] = useState([]);
  const [selectedPlot, setSelectedPlot] = useState(null);

  const fetchPlots = async (manualToken = null) => {
    const activeToken = manualToken || token;
    if (!activeToken) return;

    try {
      const response = await fetch(`${BASE_URL}/plots/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${activeToken}`, 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && Array.isArray(data)) {
        const formattedData = data.map(plot => {
          // Find the most recent record in the array
          const latest = plot.records && plot.records.length > 0 ? plot.records[0] : null;

          return {
            id: plot.id.toString(),
            name: plot.name,
            crop: plot.crop_type || "Rice",
            status: latest ? "Online" : "Offline",
            icon: "🌱",
            color: "#1b5e20",
            // Use live data from database fields
            location: plot.location || "N/A",
            sensor_id: plot.sensor_id || "N/A",
            
            sensors: {
              // Extract exact fields from your SoilRecord model
              moisture: latest ? latest.soil_moisture : "N/A", 
              temp: latest ? latest.soil_temperature : "N/A", 
              ph: latest ? latest.ph_level : "N/A",           
              battery: latest ? `${latest.battery_percentage}%` : "0%",
              signal: "Strong"
            }
          };
        });
        setPlots(formattedData);
      }
    } catch (error) {
      console.error("Connection Error:", error);
    }
  };

  useEffect(() => {
    if (token && plots.length === 0) {
      fetchPlots();
    }
  }, [token]);

  const handleLogin = async (username, password) => {
    try {
      const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        setToken(data.token); 
        setUser({ name: username });
        fetchPlots(data.token); 
      } else {
        Alert.alert("Login Failed", data.non_field_errors?.[0] || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login Error:", error);
      Alert.alert("Error", "Server unreachable.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setPlots([]); 
    setSelectedPlot(null);
    setCurrentScreen('Explore');
  };

  const handleSelectPlot = (plot) => {
    setSelectedPlot(plot);
    setCurrentScreen('Monitor');
  };

  const handleAddPlot = async (newPlot) => {
  try {
    const response = await fetch(`${BASE_URL}/plots/`, {
      method: 'POST',
      headers: { 
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: newPlot.name,
        crop_type: newPlot.crop || "Rice", // Match the 'crop_type' field name
        sensor_id: `SN-${Math.floor(1000 + Math.random() * 9000)}`,
        location: "North Sector"
      }),
    });

    if (response.ok) {
      fetchPlots(); 
    } else {
      const errorData = await response.json();
      console.log("Validation Errors:", errorData); // This will tell you exactly what failed
      Alert.alert("Error Adding Plot", JSON.stringify(errorData));
    }
  } catch (error) {
    console.error("Add Plot Error:", error);
  }
};

  const handleDeletePlot = async (id) => {
  try {
    const response = await fetch(`${BASE_URL}/plots/${id}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Token ${token}`,
        'Accept': 'application/json',
      }
    });

    // 1. If response is OK (Status 200-299)
    if (response.ok) {
      // 2. Remove the plot from the mobile UI state immediately
      setPlots(prevPlots => prevPlots.filter(plot => plot.id !== id));
      
      // 3. STOP HERE. Do not call response.json() for a DELETE.
      // Django returns status 204 (No Content), which has no JSON to parse.
      console.log("Successfully deleted plot ID:", id);
      return; 
    } 

    // 4. Only attempt to parse JSON if the request failed (to see the error message)
    const errorData = await response.json();
    Alert.alert("Delete Failed", errorData.error || "Could not remove the plot.");

  } catch (error) {
    // If we reach here and the plot is already gone from the UI, 
    // it means the deletion worked and we can ignore the 'Network request failed' ghost error.
    if (plots.some(p => p.id === id)) {
      console.error("Actual Delete Error:", error);
      Alert.alert("Connection Error", "Check your local IP or Wi-Fi.");
    }
  }
};

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <View style={{ flex: 1 }}>
      {currentScreen === 'Explore' ? (
        <ExploreScreen 
          plots={plots} 
          onAddPlot={handleAddPlot} 
          onDeletePlot={handleDeletePlot} 
          onSelectPlot={handleSelectPlot} 
          onOpenProfile={() => setCurrentScreen('Profile')} 
        />
      ) : currentScreen === 'Monitor' ? (
        <MonitorScreen plotData={selectedPlot} />
      ) : (
        <ProfileScreen 
          user={user} 
          onLogout={handleLogout} 
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