import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';

import ExploreScreen from './screens/ExploreScreen';
import AdminScreen from './screens/AdminScreen';
import MapScreen from './screens/MapScreen';
import HistoryScreen from './screens/HistoryScreen';
import MonitorScreen from './screens/MonitorScreen';
import LoginScreen from './screens/LoginScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdminRegistrationScreen from './screens/AdminRegistrationScreen';
import RegistrationScreen from './screens/RegistrationScreen';

const BASE_URL = 'http://10.175.94.28:8000/api';
const AUTH_URL = `${BASE_URL}/api-token-auth/`;
const REGISTER_URL = `${BASE_URL}/register/`; // Matches Django backend register_user endpoint

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('Login'); // Default to Login screen when unauthenticated
  const [plots, setPlots] = useState([]);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [usersList, setUsersList] = useState([]);

  // -------------------- FETCH USERS --------------------
  const fetchUsers = async (activeToken = token) => {
    if (!activeToken) return;

    try {
      const response = await fetch(`${BASE_URL}/users/`, {
        headers: {
          Authorization: `Token ${activeToken}`,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsersList(Array.isArray(data) ? data : data.results || []);
      } else {
        console.error('Fetch Users Failed:', response.status);
      }
    } catch (error) {
      console.error('Fetch Users Error:', error);
    }
  };

  // -------------------- FETCH PLOTS --------------------
  const fetchPlots = async (manualToken = null) => {
    const activeToken = manualToken || token;

    if (!activeToken) return;

    try {
      const response = await fetch(`${BASE_URL}/plots/`, {
        method: 'GET',
        headers: {
          Authorization: `Token ${activeToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Fetch Plots Failed:', response.status);
        return;
      }

      const data = await response.json();
      const plotList = Array.isArray(data) ? data : data.results || [];

      const formattedData = plotList.map((plot) => {
        const latest =
          plot.records && plot.records.length > 0
            ? plot.records[0]
            : null;

        return {
          id: String(plot.id),
          name: plot.name || '',
          crop: plot.crop_type || '',
          farmer_username: plot.farmer_username || 'Unassigned',
          status:
            plot.sensor_id &&
            plot.sensor_id !== 'N/A' &&
            latest
              ? 'Online'
              : 'Offline',
          icon: 'leaf',
          color: '#1b5e20',
          location: plot.location || 'N/A',
          sensor_id: plot.sensor_id || null,
          records: plot.records || [],
          sensors: {
            moisture: latest
              ? latest.soil_moisture ?? latest.moisture ?? 'N/A'
              : 'N/A',
            temp: latest
              ? latest.soil_temperature ?? latest.temperature ?? 'N/A'
              : 'N/A',
            ph: latest
              ? latest.ph_level ?? latest.ph ?? 'N/A'
              : 'N/A',
            humidity: latest
              ? latest.humidity ?? latest.soil_humidity ?? 'N/A'
              : 'N/A',
            nitrogen: latest
              ? latest.nitrogen ?? latest.n ?? 'N/A'
              : 'N/A',
            phosphorus: latest
              ? latest.phosphorus ?? latest.p ?? 'N/A'
              : 'N/A',
            potassium: latest
              ? latest.potassium ?? latest.k ?? 'N/A'
              : 'N/A',
            battery: latest
              ? `${latest.battery_percentage ?? 0}%`
              : '0%',
            signal: latest ? 'Strong' : 'No Signal',
          },
        };
      });

      setPlots(formattedData);

      setSelectedPlot((previousPlot) => {
        if (!previousPlot) return null;
        return (
          formattedData.find(
            (plot) => plot.id === String(previousPlot.id)
          ) || null
        );
      });
    } catch (error) {
      console.error('Fetch Plots Error:', error);
    }
  };

  // -------------------- REFRESH DATA AFTER LOGIN --------------------
  useEffect(() => {
    if (token) {
      fetchPlots(token);

      const isAdmin =
        user?.role?.toLowerCase() === 'admin' || user?.is_staff;

      if (isAdmin) {
        fetchUsers(token);
      }
    }
  }, [token, user]);

  // -------------------- REGISTRATION --------------------
  const handleRegister = async (formData) => {
    try {
      const response = await fetch(REGISTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Account created successfully! Please log in.');
        setCurrentScreen('Login');
      } else {
        const errorMsg = data.error || Object.values(data).flat().join('\n') || 'Registration failed';
        Alert.alert('Registration Error', errorMsg);
      }
    } catch (error) {
      console.error('Registration API Error:', error);
      Alert.alert('Connection Error', 'Could not connect to the registration server.');
    }
  };

  // -------------------- LOGIN --------------------
  const handleLogin = async (username, password) => {
    try {
      const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.token) {
        Alert.alert(
          'Login Failed',
          data.non_field_errors?.[0] ||
            data.detail ||
            'Invalid credentials'
        );
        return;
      }

      const loggedUsername = data.username || username;
      const userRole = (
        data.role || (data.is_staff ? 'ADMIN' : 'FARMER')
      ).toUpperCase();

      const isAdmin =
        userRole === 'ADMIN' ||
        Boolean(data.is_staff) ||
        Boolean(data.is_superuser);

      const authUser = {
        id: data.user_id || data.id || null,
        username: loggedUsername,
        name: data.name || loggedUsername,
        email: data.email || `${loggedUsername}@jjmap.ph`,
        role: isAdmin ? 'ADMIN' : 'FARMER',
        is_staff: isAdmin,
        is_active: true,
      };

      setToken(data.token);
      setUser(authUser);
      setCurrentScreen(isAdmin ? 'Admin' : 'Explore');

      fetchPlots(data.token);

      if (isAdmin) {
        fetchUsers(data.token);
      }
    } catch (error) {
      console.error('Login Error:', error);
      Alert.alert('Error', 'Server unreachable. Check your backend connection.');
    }
  };

  // -------------------- LOGOUT --------------------
  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setPlots([]);
    setUsersList([]);
    setSelectedPlot(null);
    setCurrentScreen('Login');
  };

  // -------------------- SELECT A PLOT --------------------
  const handleSelectPlot = (plot) => {
    setSelectedPlot(plot);
    setCurrentScreen('Monitor');
  };

  // -------------------- NAVIGATION --------------------
  const handleSelectTab = (tabId) => {
    if (tabId === 'Explore') {
      setCurrentScreen('Explore');
    } else if (tabId === 'Farm') {
      const isAdmin =
        user?.role?.toLowerCase() === 'admin' || user?.is_staff;

      setCurrentScreen(isAdmin ? 'Admin' : 'Explore');
    } else if (tabId === 'Settings') {
      setCurrentScreen('Profile');
    } else if (tabId === 'Map') {
      setCurrentScreen('Map');
    } else if (tabId === 'History') {
      setCurrentScreen('History');
    }
  };

  const getCurrentTabName = () => {
    if (currentScreen === 'Explore' || currentScreen === 'Admin') {
      return 'Farm';
    }

    if (currentScreen === 'Profile') return 'Settings';

    return currentScreen;
  };

  // -------------------- ADD PLOT --------------------
  const handleAddPlot = async (newPlot) => {
    if (!token) {
      Alert.alert('Login Required', 'Please log in before adding a plot.');
      return false;
    }

    const name = newPlot?.name?.trim();
    const cropType = newPlot?.crop?.trim();
    const location = newPlot?.location?.trim();

    if (!name || !cropType || !location) {
      Alert.alert(
        'Missing Information',
        'Plot name, crop type, and location are required.'
      );
      return false;
    }

    try {
      const response = await fetch(`${BASE_URL}/plots/`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: name,
          crop_type: cropType,
          location: location,
          sensor_id: null,
        }),
      });

      if (response.ok) {
        await fetchPlots(token);
        Alert.alert('Success', 'Plot saved successfully!');
        return true;
      }

      const contentType = response.headers.get('content-type');
      let errorMessage = `The server returned status ${response.status}.`;

      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = Object.entries(errorData)
          .map(([field, errors]) => {
            const message = Array.isArray(errors)
              ? errors.join(', ')
              : typeof errors === 'object'
                ? JSON.stringify(errors)
                : String(errors);

            return `${field}: ${message}`;
          })
          .join('\n');
      } else {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = `${errorMessage}\n${errorText.slice(0, 300)}`;
        }
      }

      console.error('Add Plot Failed:', errorMessage);
      Alert.alert('Error Adding Plot', errorMessage);
      return false;
    } catch (error) {
      console.error('Add Plot Error:', error);
      Alert.alert(
        'Connection Error',
        'Could not connect to the server. Check that Django is running and the API address is correct.'
      );
      return false;
    }
  };

  // -------------------- ADD SENSOR --------------------
  const handleAddSensor = async (plotId) => {
    const generatedSensorId =
      `SN-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const response = await fetch(`${BASE_URL}/plots/${plotId}/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ sensor_id: generatedSensorId }),
      });

      if (response.ok) {
        await fetchPlots(token);
        Alert.alert('Success', `Sensor ${generatedSensorId} assigned.`);
      } else {
        Alert.alert('Error', 'Could not assign sensor to plot.');
      }
    } catch (error) {
      console.error('Add Sensor Error:', error);
      Alert.alert('Connection Error', 'Could not connect to the server.');
    }
  };

  // -------------------- REMOVE SENSOR --------------------
  const handleRemoveSensor = async (plotId) => {
    try {
      const response = await fetch(`${BASE_URL}/plots/${plotId}/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ sensor_id: null }),
      });

      if (response.ok) {
        await fetchPlots(token);
        Alert.alert('Success', 'Sensor removed from plot.');
      } else {
        Alert.alert('Error', 'Could not remove sensor.');
      }
    } catch (error) {
      console.error('Remove Sensor Error:', error);
      Alert.alert('Connection Error', 'Could not connect to the server.');
    }
  };

  // -------------------- DELETE PLOT --------------------
  const handleDeletePlot = async (id) => {
    try {
      const response = await fetch(`${BASE_URL}/plots/${id}/`, {
        method: 'DELETE',
        headers: {
          Authorization: `Token ${token}`,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        setPlots((previousPlots) =>
          previousPlots.filter((plot) => plot.id !== String(id))
        );

        setSelectedPlot((previousPlot) =>
          previousPlot && previousPlot.id === String(id)
            ? null
            : previousPlot
        );

        return;
      }

      let errorMessage = 'Could not remove the plot.';

      try {
        const errorData = await response.json();
        errorMessage = errorData.error || JSON.stringify(errorData);
      } catch {
        // Keep fallback message if response is not JSON.
      }

      Alert.alert('Delete Failed', errorMessage);
    } catch (error) {
      console.error('Delete Plot Error:', error);
      Alert.alert('Connection Error', 'Check your backend connection.');
    }
  };

  // -------------------- ASSIGN PLOTS --------------------
  const handleAssignPlots = async (userId, plotIds) => {
    try {
      const response = await fetch(
        `${BASE_URL}/users/${userId}/assign-plots/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ plot_ids: plotIds }),
        }
      );

      if (response.ok) {
        Alert.alert('Success', 'Plots successfully assigned!');
        await fetchPlots(token);
      } else {
        Alert.alert('Error', 'Failed to assign plots.');
      }
    } catch (error) {
      console.error('Assign Plots Error:', error);
      Alert.alert('Connection Error', 'Could not connect to the server.');
    }
  };

  // -------------------- UNAUTHENTICATED SCREENS (LOGIN / REGISTRATION) --------------------
  if (!user) {
    if (currentScreen === 'AdminRegister') {
      return (
        <AdminRegistrationScreen
          onRegister={handleRegister}
          onBackToLogin={() => setCurrentScreen('Login')}
        />
      );
    }
    if (currentScreen === 'FarmerRegister') {
      return (
        <RegistrationScreen
          onRegister={handleRegister}
          onBackToLogin={() => setCurrentScreen('Login')}
        />
      );
    }
    return (
      <LoginScreen
        onLogin={handleLogin}
        onNavigateRegister={(screen) => setCurrentScreen(screen)}
      />
    );
  }

  const currentAdminUsername = user.username || user.name;
  const currentAdminId = user.id;

  // -------------------- DASHBOARD SCREENS --------------------
  const renderDashboardScreen = () => {
    if (currentScreen === 'Admin') {
      return (
        <AdminScreen
          currentAdminId={currentAdminId}
          currentAdminUsername={currentAdminUsername}
          users={usersList}
          plots={plots}
          onAddPlot={handleAddPlot}
          onDeletePlot={handleDeletePlot}
          onSelectPlot={handleSelectPlot}
          onAssignPlots={handleAssignPlots}
          onOpenProfile={() => setCurrentScreen('Profile')}
          currentTab={getCurrentTabName()}
          onSelectTab={handleSelectTab}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <ExploreScreen
        plots={plots}
        onAddPlot={handleAddPlot}
        onDeletePlot={handleDeletePlot}
        onSelectPlot={handleSelectPlot}
        onOpenProfile={() => setCurrentScreen('Profile')}
        currentTab={getCurrentTabName()}
        onSelectTab={handleSelectTab}
      />
    );
  };

  // -------------------- MAIN RENDER --------------------
  return (
    <View style={{ flex: 1 }}>
      {currentScreen === 'Explore' || currentScreen === 'Admin' ? (
        renderDashboardScreen()
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
          onBack={() =>
            setCurrentScreen(
              user?.role?.toLowerCase() === 'admin' || user?.is_staff
                ? 'Admin'
                : 'Explore'
            )
          }
          currentTab={getCurrentTabName()}
          onSelectTab={handleSelectTab}
        />
      )}

      {currentScreen === 'Monitor' && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            setCurrentScreen(
              user?.role?.toLowerCase() === 'admin' || user?.is_staff
                ? 'Admin'
                : 'Explore'
            )
          }
        >
          <Text style={styles.backText}>Back to Overview</Text>
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
  },
  backText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});