import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';

import ExploreScreen from './screens/ExploreScreen';
import AdminScreen from './screens/AdminScreen';
import HistoryScreen from './screens/HistoryScreen';
import MonitorScreen from './screens/MonitorScreen';
import LoginScreen from './screens/LoginScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdminRegistrationScreen from './screens/AdminRegistrationScreen';
import RegistrationScreen from './screens/RegistrationScreen';

const BASE_URL = 'http://10.25.7.28:8000/api';
const AUTH_URL = `${BASE_URL}/api-token-auth/`;

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('Login');
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
          crop: plot.crop_type || plot.crop || '',
          crop_type: plot.crop_type || plot.crop || '',
          farmer: plot.farmer ? String(plot.farmer) : (plot.farmer_id ? String(plot.farmer_id) : null),
          farmer_username: plot.farmer_username || 'Unassigned',
          owner_id: plot.owner_id ? String(plot.owner_id) : (plot.owner ? String(plot.owner) : null),
          owner_username: plot.owner_username || '',
          owner_email: plot.owner_email || '',
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
          ) || previousPlot
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

  // -------------------- UPDATE PLOT SENSOR LOCALLY --------------------
  const handleUpdatePlotSensor = (plotId, newSensorId) => {
    const updatedPlotIdStr = String(plotId);

    setPlots((prevPlots) =>
      prevPlots.map((p) =>
        p.id === updatedPlotIdStr ? { ...p, sensor_id: newSensorId } : p
      )
    );

    setSelectedPlot((prevPlot) => {
      if (prevPlot && prevPlot.id === updatedPlotIdStr) {
        return { ...prevPlot, sensor_id: newSensorId };
      }
      return prevPlot;
    });
  };

  // -------------------- POST-OTP REGISTRATION SUCCESS HANDLER --------------------
  const handleRegisterSuccess = (verifiedData) => {
    Alert.alert(
      'Account Verified',
      'Your account was verified and created successfully. Please log in.'
    );
    setCurrentScreen('Login');
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
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        name: (data.first_name || data.last_name)
          ? `${data.first_name || ''} ${data.last_name || ''}`.trim()
          : loggedUsername,
        email: data.email || `${loggedUsername}@jjmap.ph`,
        phone: data.phone || '',
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
    const generatedSensorId = `SN-${Math.floor(1000 + Math.random() * 9000)}`;

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
        handleUpdatePlotSensor(plotId, generatedSensorId);
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
        handleUpdatePlotSensor(plotId, null);
        await fetchPlots(token);
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
        // Keep fallback message
      }

      Alert.alert('Delete Failed', errorMessage);
    } catch (error) {
      console.error('Delete Plot Error:', error);
      Alert.alert('Connection Error', 'Check your backend connection.');
    }
  };

  // -------------------- CREATE USER --------------------
  const handleAddUser = async (newUser) => {
    if (!token) { Alert.alert('Authentication Error', 'Please log in again.'); return false; }
    const nameParts = (newUser.name || '').trim().split(/\s+/).filter(Boolean);
    const payload = {
      username: (newUser.username || '').trim(), password: newUser.password,
      first_name: nameParts.shift() || '', last_name: nameParts.join(' '),
      email: (newUser.email || '').trim(), phone: newUser.phone || '',
      is_staff: newUser.role === 'ADMIN', is_active: true,
    };
    try {
      const response = await fetch(`${BASE_URL}/users/`, {
        method: 'POST', headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = Object.entries(data).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : JSON.stringify(value)}`).join('\n') || `Server returned ${response.status}`;
        Alert.alert('Create User Failed', message); return false;
      }
      await fetchUsers(token); await fetchPlots(token);
      Alert.alert('Success', 'User account created successfully.'); return true;
    } catch (error) {
      console.error('Create User Error:', error); Alert.alert('Connection Error', 'Could not create the user.'); return false;
    }
  };

  // -------------------- UPDATE USER --------------------
  const handleUpdateUser = async (userId, updatedData) => {
    if (!token) { Alert.alert('Authentication Error', 'Please log in again.'); return false; }
    const payload = {};
    ['username', 'email', 'phone', 'first_name', 'last_name', 'is_active', 'is_staff'].forEach((field) => {
      if (updatedData[field] !== undefined) payload[field] = updatedData[field];
    });
    if (updatedData.name !== undefined) {
      const nameParts = String(updatedData.name || '').trim().split(/\s+/).filter(Boolean);
      payload.first_name = nameParts.shift() || ''; payload.last_name = nameParts.join(' ');
    }
    if (updatedData.role !== undefined) payload.is_staff = updatedData.role === 'ADMIN';
    if (updatedData.password) payload.password = updatedData.password;
    if (updatedData.old_password) payload.old_password = updatedData.old_password;
    try {
      const response = await fetch(`${BASE_URL}/users/${userId}/`, {
        method: 'PATCH', headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = Object.entries(data).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : JSON.stringify(value)}`).join('\n') || `Server returned ${response.status}`;
        Alert.alert('Update Failed', message); return false;
      }
      await fetchUsers(token); return true;
    } catch (error) {
      console.error('Update User Error:', error); Alert.alert('Connection Error', 'Could not update the user.'); return false;
    }
  };

  // -------------------- DELETE USER --------------------
  const handleDeleteUser = async (userId) => {
    if (!token) return false;
    try {
      const response = await fetch(`${BASE_URL}/users/${userId}/`, { method: 'DELETE', headers: { Authorization: `Token ${token}`, Accept: 'application/json' } });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})); Alert.alert('Delete Failed', data.detail || `Server returned ${response.status}`); return false;
      }
      await fetchUsers(token); await fetchPlots(token); return true;
    } catch (error) {
      console.error('Delete User Error:', error); Alert.alert('Connection Error', 'Could not delete the user.'); return false;
    }
  };

  // -------------------- ASSIGN PLOTS --------------------
  const handleAssignPlots = async (userId, plotIds) => {
    if (!token) return false;
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
        await fetchPlots(token);
        return true;
      } else {
        Alert.alert('Error', 'Failed to assign plots.');
        return false;
      }
    } catch (error) {
      console.error('Assign Plots Error:', error);
      Alert.alert('Connection Error', 'Could not connect to the server.');
      return false;
    }
  };

  // -------------------- UNAUTHENTICATED SCREENS --------------------
  if (!user) {
    if (currentScreen === 'AdminRegister') {
      return (
        <RegistrationScreen
          defaultRole="admin"
          onRegister={handleRegisterSuccess}
          onBackToLogin={() => setCurrentScreen('Login')}
        />
      );
    }
    if (currentScreen === 'FarmerRegister') {
      return (
        <RegistrationScreen
          defaultRole="user"
          onRegister={handleRegisterSuccess}
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
          onAddUser={handleAddUser}
          onUpdateUser={handleUpdateUser}
          onDeleteUser={handleDeleteUser}
          token={token}
          onOpenProfile={() => setCurrentScreen('Profile')}
          onRefreshData={async () => { await fetchUsers(token); await fetchPlots(token); }}
          currentTab={getCurrentTabName()}
          onSelectTab={handleSelectTab}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <ExploreScreen
        user={user}
        currentAdminId={currentAdminId}
        currentAdminUsername={currentAdminUsername}
        users={usersList}
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
      ) : currentScreen === 'History' ? (
        <HistoryScreen
          currentTab={getCurrentTabName()}
          onSelectTab={handleSelectTab}
        />
      ) : currentScreen === 'Monitor' ? (
        <MonitorScreen
          plotData={selectedPlot}
          token={token}
          onAddSensor={handleAddSensor}
          onRemoveSensor={handleRemoveSensor}
          onDisconnectSensor={handleRemoveSensor}
          onUpdatePlotSensor={handleUpdatePlotSensor}
          onRefreshData={() => fetchPlots(token)}
          currentTab={getCurrentTabName()}
          onSelectTab={handleSelectTab}
          onBack={() =>
            setCurrentScreen(
              user?.role?.toLowerCase() === 'admin' || user?.is_staff
                ? 'Admin'
                : 'Explore'
            )
          }
        />
      ) : (
        <ProfileScreen
          user={user}
          token={token}
          plots={plots}
          onLogout={handleLogout}
          onUpdateUser={(userId, updatedData) => {
            setUser((prev) => (prev ? { ...prev, ...updatedData } : prev));
          }}
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
    </View>
  );
}

const styles = StyleSheet.create({});