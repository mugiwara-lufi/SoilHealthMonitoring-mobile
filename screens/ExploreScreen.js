// ExploreScreen.js

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MobileFooter from '../components/MobileFooter';

// Supabase Direct Credentials
const SUPABASE_URL = 'https://fpisfwcphgjcvxomzpko.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cyQgbi_v02dkhswabEBWoQ_3exGPlaK';

export default function ExploreScreen({
  plots,
  users,
  currentAdminId,
  currentAdminUsername,
  onAddPlot,
  onDeletePlot,
  onSelectPlot,
  onOpenProfile,
  currentTab,
  onSelectTab
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlotName, setNewPlotName] = useState('');
  const [newCropType, setNewCropType] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [searchText, setSearchText] = useState('');

  // Live Telemetry Map from Supabase
  const [plotLatestTelemetryMap, setPlotLatestTelemetryMap] = useState({});
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  const safeUsers = users || [];
  const loggedInAdmin = safeUsers.find(
    (u) =>
      (currentAdminId && u.id === currentAdminId) ||
      (currentAdminUsername && u.username === currentAdminUsername)
  );
  const adminEmail = loggedInAdmin?.email || '';

  useEffect(() => {
    fetchLatestSoilTelemetry();
  }, [plots]);

  const fetchLatestSoilTelemetry = async () => {
    setLoadingTelemetry(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/soil_records?select=*&order=timestamp.desc&limit=100`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const records = await response.json();
        if (Array.isArray(records)) {
          const telemetryMap = {};
          records.forEach((rec) => {
            const sId = rec.sensor_id;
            const pId = rec.plot_id;

            if (sId && !telemetryMap[`sensor_${sId}`]) {
              telemetryMap[`sensor_${sId}`] = rec;
            }
            if (pId && !telemetryMap[`plot_${pId}`]) {
              telemetryMap[`plot_${pId}`] = rec;
            }
          });
          setPlotLatestTelemetryMap(telemetryMap);
        }
      }
    } catch (err) {
      console.log('Error fetching telemetry for ExploreScreen:', err);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  // Filter visible plots based on user ownership or shared email inheritance
  const visiblePlots = (plots || []).filter(plot => {
    const isOwnerPlot = 
      plot.farmer === currentAdminId ||
      plot.farmer_username === currentAdminUsername ||
      plot.owner_id === currentAdminId ||
      plot.owner_username === currentAdminUsername;

    const matchesEmail = adminEmail && plot.owner_email && plot.owner_email === adminEmail;

    return isOwnerPlot || matchesEmail || (!plot.farmer && !plot.owner_email);
  });

  // Comprehensive warning/status evaluator using live telemetry
  const getDetailedPlotStatus = (plot) => {
    const hasSensor = Boolean(plot?.sensor_id && plot?.sensor_id !== "N/A");
    
    const liveRec =
      plotLatestTelemetryMap[`plot_${plot.id}`] ||
      plotLatestTelemetryMap[`sensor_${plot.sensor_id}`] ||
      (plot?.records && plot.records.length > 0 ? plot.records[0] : null);

    const ph = parseFloat(liveRec?.ph_level ?? liveRec?.ph ?? plot?.sensors?.ph);
    const moisture = parseFloat(liveRec?.soil_moisture ?? liveRec?.moisture ?? plot?.sensors?.moisture);
    const ec = parseFloat(liveRec?.ec ?? plot?.sensors?.ec);
    const n = parseFloat(liveRec?.nitrogen ?? plot?.sensors?.nitrogen);
    const p = parseFloat(liveRec?.phosphorus ?? plot?.sensors?.phosphorus);
    const k = parseFloat(liveRec?.potassium ?? plot?.sensors?.potassium);

    if (!hasSensor || (isNaN(ph) && isNaN(moisture))) {
      return { label: 'OFFLINE', color: '#64748b' };
    }

    if (!isNaN(ph) && ph < 5.5) {
      return { label: 'HIGHLY ACIDIC', color: '#ef4444' };
    }
    if (!isNaN(ph) && ph > 7.5) {
      return { label: 'ALKALINE', color: '#3b82f6' };
    }
    if (!isNaN(ec) && ec < 200) {
      return { label: 'LOW NUTRIENTS', color: '#f97316' };
    }
    if ((!isNaN(n) && n < 30) || (!isNaN(p) && p < 20) || (!isNaN(k) && k < 30)) {
      return { label: 'NEEDS ATTENTION', color: '#ef4444' };
    }
    if (!isNaN(moisture) && moisture < 30) {
      return { label: 'CRITICAL', color: '#ef4444' };
    }
    if (!isNaN(moisture) && moisture < 40) {
      return { label: 'WARNING', color: '#f59e0b' };
    }

    return { label: 'OPTIMAL', color: '#22c55e' };
  };

  const filteredPlots = visiblePlots.filter(plot => {
    const searchLower = searchText.toLowerCase();
    const statusInfo = getDetailedPlotStatus(plot);
    return (
      plot.name.toLowerCase().includes(searchLower) ||
      (plot.crop || plot.crop_type || '').toLowerCase().includes(searchLower) ||
      statusInfo.label.toLowerCase().includes(searchLower)
    );
  });

  const submitNewPlot = async () => {
    const plotName = newPlotName.trim();
    const cropType = newCropType.trim();
    const location = newLocation.trim();

    if (!plotName || !cropType || !location) {
      Alert.alert(
        'Missing Information',
        'Please enter the plot name, crop type, and location.'
      );
      return;
    }

    const newPlot = {
      name: plotName,
      crop: cropType,
      crop_type: cropType,
      location: location,
      sensor_id: null,
      farmer: currentAdminId || null,
      farmer_username: currentAdminUsername || null,
      owner_email: adminEmail,
      icon: 'leaf',
      color: '#64748b',
      records: [],
      sensors: {
        moisture: 'N/A',
        temp: 'N/A',
        ph: 'N/A',
        humidity: 'N/A',
        nitrogen: 'N/A',
        phosphorus: 'N/A',
        potassium: 'N/A',
        battery: '0%',
        signal: 'No Signal',
      },
    };

    try {
      const saved = await onAddPlot(newPlot);

      if (saved) {
        setNewPlotName('');
        setNewCropType('');
        setNewLocation('');
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Submit New Plot Error:', error);
      Alert.alert('Error', 'Could not add the plot. Please try again.');
    }
  };

  const confirmDelete = (id, name) => {
    Alert.alert(
      "Remove Plot",
      `Are you sure you want to remove ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => onDeletePlot(id) }
      ]
    );
  };

  const renderPlotItem = ({ item }) => {
    const status = getDetailedPlotStatus(item);
    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity style={styles.plotCard} onPress={() => onSelectPlot(item)}>
          <View style={[styles.iconContainer, { backgroundColor: status.color + '20' }]}>
            <Ionicons name="leaf" size={24} color={status.color} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.plotName}>{item.name}</Text>
            <Text style={styles.cropType}>{item.crop || item.crop_type}</Text>
            <Text style={styles.locationText}>
              <Ionicons name="location-outline" size={12} /> {item.location || 'No location'}
            </Text>
          </View>
          <View style={styles.badgeColumn}>
            <View style={[styles.statusBadge, { backgroundColor: status.color + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }]}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item.id, item.name)}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Farm Overview</Text>
            <Text style={styles.headerSubtitle}>Manage your farm plots</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={onOpenProfile}>
            <Ionicons name="person-circle-outline" size={28} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, crop, or status..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#94a3b8"
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddForm(!showAddForm)}>
          <Text style={styles.addButtonText}>
            {showAddForm ? (
              <><Ionicons name="close" size={14} color="#fff" /> Cancel</>
            ) : (
              <><Ionicons name="add" size={14} color="#fff" /> Add New Plot</>
            )}
          </Text>
        </TouchableOpacity>

        {showAddForm && (
          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter Plot Name *"
              placeholderTextColor="#94a3b8"
              value={newPlotName}
              onChangeText={setNewPlotName}
            />

            <TextInput
              style={styles.input}
              placeholder="Enter Crop Type *"
              placeholderTextColor="#94a3b8"
              value={newCropType}
              onChangeText={setNewCropType}
            />

            <TextInput
              style={styles.input}
              placeholder="Enter Location *"
              placeholderTextColor="#94a3b8"
              value={newLocation}
              onChangeText={setNewLocation}
            />

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={submitNewPlot}
            >
              <Text style={styles.saveBtnText}>Save Plot</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>

      {loadingTelemetry ? (
        <ActivityIndicator size="large" color="#1b5e20" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredPlots}
          renderItem={renderPlotItem}
          keyExtractor={(item) => item.id ? String(item.id) : Math.random().toString()}
          contentContainerStyle={styles.listPadding}
          ListEmptyComponent={<Text style={styles.emptyText}>No plots found</Text>}
        />
      )}

      <MobileFooter currentTab={currentTab || 'Farm'} onSelectTab={onSelectTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 25, paddingTop: 40, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1b5e20' },
  headerSubtitle: { fontSize: 14, color: '#64748b' },
  profileBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#1b5e20', justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15 },
  searchInput: { flex: 1, height: 45, fontSize: 14, color: '#0f172a' },
  clearBtn: { padding: 5 },
  addButton: { backgroundColor: '#1b5e20', padding: 12, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  formContainer: { marginTop: 15, flexDirection: 'column', gap: 10 },
  input: { width: '100%', minHeight: 45, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#f8fafc', color: '#0f172a' },
  saveBtn: { backgroundColor: '#1e293b', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  listPadding: { padding: 20 },
  cardWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  plotCard: { flex: 1, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, elevation: 2 },
  deleteBtn: { padding: 15 },
  iconContainer: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  textContainer: { flex: 1 },
  plotName: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  cropType: { fontSize: 14, color: '#64748b' },
  locationText: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  badgeColumn: { justifyContent: 'center', alignItems: 'flex-end' },
  statusBadge: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#64748b', fontSize: 16 }
});