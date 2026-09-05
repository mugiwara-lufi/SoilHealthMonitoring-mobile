import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import ExploreScreen from './screens/ExploreScreen';
import MapScreen from './screens/MapScreen';
import HistoryScreen from './screens/HistoryScreen';
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

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const formattedData = data.map(plot => {
            const latest = plot.records && plot.records.length > 0 ? plot.records[0] : null;

            return {
              id: plot.id.toString(),
              name: plot.name,
              crop: plot.crop_type || "Rice",
              status: (plot.sensor_id && plot.sensor_id !== "N/A" && latest) ? "Online" : "Offline",
              icon: "🌱",
              color: "#1b5e20",
              location: plot.location || "N/A",
              sensor_id: plot.sensor_id || "N/A",
              
              sensors: {
                moisture: latest ? (latest.soil_moisture ?? latest.moisture ?? "N/A") : "N/A", 
                temp: latest ? (latest.soil_temperature ?? latest.temperature ?? "N/A") : "N/A", 
                ph: latest ? (latest.ph_level ?? latest.ph ?? "N/A") : "N/A",           
                battery: latest ? `${latest.battery_percentage ?? 0}%` : "0%",
                signal: "Strong"
              }
            };
          });

          setPlots(formattedData);

          setSelectedPlot(prevSelected => {
            if (!prevSelected) return null;
            return formattedData.find(p => p.id === prevSelected.id) || prevSelected;
          });
        }
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
        setUser({ name: username, email: `${username}@jjmap.ph` });
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

  const handleSelectTab = (tabId) => {
    if (tabId === 'Farm') {
      setCurrentScreen('Explore');
    } else if (tabId === 'Settings') {
      setCurrentScreen('Profile');
    } else if (tabId === 'Map') {
      setCurrentScreen('Map');
    } else if (tabId === 'History') {
      setCurrentScreen('History');
    }
  };

  const getCurrentTabName = () => {
    if (currentScreen === 'Explore') return 'Farm';
    if (currentScreen === 'Profile') return 'Settings';
    return currentScreen;
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
          crop_type: newPlot.crop || "Rice",
          sensor_id: null,
          location: newPlot.location || "North Sector"
        }),
      });

      if (response.ok) {
        fetchPlots(); 
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          Alert.alert("Error Adding Plot", JSON.stringify(errorData));
        } else {
          Alert.alert("Server Error", `HTTP ${response.status}: Please check server logs.`);
        }
      }
    } catch (error) {
      console.error("Add Plot Error:", error);
    }
  };

  const handleAddSensor = async (plotId) => {
    const generatedSensorId = `SN-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      const response = await fetch(`${BASE_URL}/plots/${plotId}/`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ sensor_id: generatedSensorId }),
      });

      if (response.ok) {
        await fetchPlots();
      } else {
        Alert.alert("Error", "Could not assign sensor to plot.");
      }
    } catch (error) {
      console.error("Add Sensor Error:", error);
    }
  };

  const handleRemoveSensor = async (plotId) => {
    try {
      const response = await fetch(`${BASE_URL}/plots/${plotId}/`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ sensor_id: null }),
      });

      if (response.ok) {
        await fetchPlots();
      } else {
        Alert.alert("Error", "Could not remove sensor.");
      }
    } catch (error) {
      console.error("Remove Sensor Error:", error);
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

      if (response.ok) {
        setPlots(prevPlots => prevPlots.filter(plot => plot.id !== id));
        return; 
      } 

      const errorData = await response.json();
      Alert.alert("Delete Failed", errorData.error || "Could not remove the plot.");

    } catch (error) {
      console.error("Delete Plot Error:", error);
      Alert.alert("Connection Error", "Check your backend connection.");
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
          currentTab={getCurrentTabName()}
          onSelectTab={handleSelectTab}
        />
      ) : currentScreen === 'Map' ? (
        <MapScreen 
          plots={plots}
          onSelectPlot={handleSelectPlot}
          currentTab={getCurrentTabName()}
          onSelectTab={handleSelectTab}
        />
      ) : currentScreen === 'History' ? (
        <HistoryScreen 
          currentTab={getCurrentTabName()}
          onSelectTab={handleSelectTab}
        />
      ) : currentScreen === 'Monitor' ? (
        <MonitorScreen 
          plotData={selectedPlot}
          onAddSensor={handleAddSensor}
          onRemoveSensor={handleRemoveSensor}
          onRefreshData={fetchPlots}
          currentTab={getCurrentTabName()}
          onSelectTab={handleSelectTab}
        />
      ) : (
        <ProfileScreen 
          user={user} 
          onLogout={handleLogout} 
          onBack={() => setCurrentScreen('Explore')} 
          currentTab={getCurrentTabName()}
          onSelectTab={handleSelectTab}
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