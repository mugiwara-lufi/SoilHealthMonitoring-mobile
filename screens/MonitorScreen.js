// MonitorScreen.js

import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import MobileFooter from '../components/MobileFooter';

const screenWidth = Dimensions.get('window').width - 30;
const API_BASE_URL = 'http://192.168.11.28:8000';

// Supabase Direct Credentials
const SUPABASE_URL = 'https://fpisfwcphgjcvxomzpko.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cyQgbi_v02dkhswabEBWoQ_3exGPlaK';

const bleManager = new BleManager();

export default function MonitorScreen({ plotData, onRefreshData, onDisconnectSensor, currentTab, onSelectTab, onBack, onUpdatePlotSensor }) {
  const currentPlot = plotData?.name || "Plot";
  const currentCrop = plotData?.crop || plotData?.crop_type || "Crop";
  const plotSize = plotData?.size || "2.5 hectares";

  const parsedHectares = parseFloat(plotSize) || 2.5;

  const [loadingCharts, setLoadingCharts] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [showSensorModal, setShowSensorModal] = useState(false);
  
  // BLE Wi-Fi Provisioning States
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [scannedDevices, setScannedDevices] = useState([]);
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);

  const [connecting, setConnecting] = useState(false);
  const [availableSensors, setAvailableSensors] = useState([]);
 
  const [activeSensorId, setActiveSensorId] = useState(null);
  const [supabaseLatestRecord, setSupabaseLatestRecord] = useState(null);

  const [weeklyData, setWeeklyData] = useState({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    values: [4.0, 4.5, 5.5, 6.2, 6.5, 6.8, 7.6]
  });
  const [hourlyData, setHourlyData] = useState({
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
    values: [5.2, 5.4, 5.6, 5.8, 5.9, 5.7, 5.6]
  });

  useEffect(() => {
    if (plotData?.sensor_id && plotData.sensor_id !== 'N/A') {
      setActiveSensorId(plotData.sensor_id);
    }
  }, [plotData?.sensor_id]);

  const fetchSupabaseLiveRecord = async (targetSensorId) => {
    const sId = targetSensorId || activeSensorId;
    if (!sId || sId === 'N/A') {
      setSupabaseLatestRecord(null);
      return;
    }

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/soil_records?sensor_id=eq.${encodeURIComponent(sId)}&order=timestamp.desc&limit=1`,
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
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setSupabaseLatestRecord(data[0]);
        } else {
          setSupabaseLatestRecord(null);
        }
      }
    } catch (err) {
      console.log("Error fetching live record from Supabase:", err);
    }
  };

  const fetchAnalytics = async () => {
    if (!plotData?.id) return;
    setLoadingCharts(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/plots/${plotData.id}/ph-analytics/`);
      if (response.ok) {
        const data = await response.json();
        if (data.weekly) setWeeklyData(data.weekly);
        if (data.hourly) setHourlyData(data.hourly);
      }
    } catch (error) {
      console.log("Error fetching pH analytics:", error);
    } finally {
      setLoadingCharts(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    if (activeSensorId) fetchSupabaseLiveRecord(activeSensorId);
  }, [plotData?.id, activeSensorId]);

  const handleManualRefresh = () => {
    fetchAnalytics();
    fetchSupabaseLiveRecord(activeSensorId);
    if (onRefreshData) onRefreshData();
  };

  const latestRecord = supabaseLatestRecord
    || (Array.isArray(plotData?.records) && plotData.records.length > 0 ? plotData.records[0] : (plotData?.sensors || null));

  const hasSensor = Boolean(activeSensorId && activeSensorId !== "N/A");

  const updateSupabasePlotId = async (sensorId, plotId) => {
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/soil_records?sensor_id=eq.${encodeURIComponent(sensorId)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ plot_id: plotId })
        }
      );
    } catch (err) {
      console.log("Error updating Supabase plot_id:", err);
    }
  };

  const handleConnectOrDisconnect = async () => {
    if (hasSensor) {
      Alert.alert(
        "Disconnect Sensor",
        `Are you sure you want to disconnect sensor "${activeSensorId}" from ${currentPlot}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disconnect",
            style: "destructive",
            onPress: async () => {
              const prevSensorId = activeSensorId;
              setActiveSensorId(null);
              setSupabaseLatestRecord(null);
              await updateSupabasePlotId(prevSensorId, null);
              if (onDisconnectSensor) onDisconnectSensor();
              if (onRefreshData) onRefreshData();
            }
          }
        ]
      );
      return;
    }

    setConnecting(true);
    setShowSensorModal(true);

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

      const records = await response.json();

      if (Array.isArray(records) && records.length > 0) {
        const uniqueSensorsMap = {};
        records.forEach(rec => {
          const sId = rec.sensor_id || "SENSOR_001";
          if (!uniqueSensorsMap[sId]) {
            uniqueSensorsMap[sId] = {
              sensor_id: sId,
              battery: rec.battery_percentage ?? rec.battery ?? 'N/A',
              timestamp: rec.timestamp ? new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'
            };
          }
        });
        setAvailableSensors(Object.values(uniqueSensorsMap));
      } else {
        setAvailableSensors([]);
      }
    } catch (error) {
      console.log("Error fetching available sensors:", error);
    } finally {
      setConnecting(false);
    }
  };

  const handleSelectSensor = async (sensorId) => {
    setShowSensorModal(false);
    setActiveSensorId(sensorId);
    await updateSupabasePlotId(sensorId, plotData.id);
    if (onUpdatePlotSensor) onUpdatePlotSensor(plotData.id, sensorId);
    await fetchSupabaseLiveRecord(sensorId);
    if (onRefreshData) onRefreshData();
    Alert.alert("Sensor Linked", `Successfully linked ${sensorId} to ${currentPlot}`);
  };

  // --- BLE Wi-Fi Provisioning Handlers ---
  const startBleScan = () => {
    setScannedDevices([]);
    setShowWifiModal(true);
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log(error);
        return;
      }
      if (device && device.name && device.name.includes("JJMAP")) {
        setScannedDevices(prev => {
          if (!prev.some(d => d.id === device.id)) {
            return [...prev, device];
          }
          return prev;
        });
      }
    });
  };

  const configureDeviceWifi = async (device) => {
    if (!wifiSsid.trim() || !wifiPass.trim()) {
      Alert.alert("Error", "Please enter both Wi-Fi SSID and Password.");
      return;
    }

    try {
      setIsProvisioning(true);
      bleManager.stopDeviceScan();
      const connectedDevice = await device.connect();
      await connectedDevice.discoverAllServicesAndCharacteristics();

      const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
      const SSID_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
      const PASS_CHAR_UUID = "1b5483e-36e1-4688-b7f5-ea07361b26a9";

      const base64Ssid = Buffer.from(wifiSsid).toString('base64');
      const base64Pass = Buffer.from(wifiPass).toString('base64');

      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID, SSID_CHAR_UUID, base64Ssid
      );
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID, PASS_CHAR_UUID, base64Pass
      );

      Alert.alert("Success", "Wi-Fi configuration sent to device successfully! Device will now reboot.");
      setShowWifiModal(false);
      setWifiSsid('');
      setWifiPass('');
    } catch (err) {
      Alert.alert("Provisioning Error", err.message);
    } finally {
      setIsProvisioning(false);
    }
  };

  const getSensorVal = (rec, ...keys) => {
    if (!rec) return null;
    for (const key of keys) {
      const val = key.split('.').reduce((obj, k) => obj?.[k], rec);
      if (val !== undefined && val !== null && val !== '' && val !== 'N/A') {
        const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  };

  const sensors = {
    ph: getSensorVal(latestRecord, 'ph_level', 'ph', 'phLevel', 'soil_ph'),
    moisture: getSensorVal(latestRecord, 'soil_moisture', 'moisture', 'soilMoisture', 'humidity'),
    ec: getSensorVal(latestRecord, 'ec', 'soil_ec', 'electrical_conductivity'),
    temp: getSensorVal(latestRecord, 'soil_temperature', 'temp', 'temperature', 'soilTemp'),
    nitrogen: getSensorVal(latestRecord, 'nitrogen', 'n', 'n_level', 'npk.n', 'npk.nitrogen'),
    phosphorus: getSensorVal(latestRecord, 'phosphorus', 'p', 'p_level', 'npk.p', 'npk.phosphorus'),
    potassium: getSensorVal(latestRecord, 'potassium', 'k', 'k_level', 'npk.k', 'npk.potassium'),
    battery: getSensorVal(latestRecord, 'battery_percentage', 'battery', 'battery_level', 'batteryLevel'),
  };

  const getPhStatus = (ph) => {
    if (ph === null || ph === undefined) return { label: 'Unknown', color: '#64748b' };
    const num = parseFloat(ph);
    if (num < 5.5) return { label: 'Highly Acidic', color: '#ef4444' };
    if (num <= 6.5) return { label: 'Mod. Acidic', color: '#f97316' };
    if (num <= 7.5) return { label: 'OPTIMAL', color: '#22c55e' };
    return { label: 'Alkaline', color: '#3b82f6' };
  };

  const getEcStatus = (ec) => {
    if (ec === null || ec === undefined) return { label: 'Unknown', color: '#64748b' };
    const num = parseFloat(ec);
    if (num < 200) return { label: 'Low Nutrients', color: '#f97316' };
    if (num <= 1200) return { label: 'OPTIMAL', color: '#22c55e' };
    return { label: 'High Salinity', color: '#ef4444' };
  };

  const getNpkStatus = (n, p, k) => {
    if (n === null && p === null && k === null) return { label: 'Unknown', color: '#64748b' };
    if ((n !== null && n < 30) || (p !== null && p < 20) || (k !== null && k < 30)) {
      return { label: 'Needs Attention', color: '#ef4444' };
    }
    return { label: 'Optimal Range', color: '#22c55e' };
  };

  const phStatus = getPhStatus(sensors.ph);
  const ecStatus = getEcStatus(sensors.ec);
  const npkStatus = getNpkStatus(sensors.nitrogen, sensors.phosphorus, sensors.potassium);

  const limeSacksNeeded = Math.max(1, Math.round(parsedHectares * 1.5));
  const ureaSacksNeeded = Math.max(1, Math.round(parsedHectares * 0.8));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
       
        <View style={styles.headerCard}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{currentPlot} Soil Analytics</Text>
          <Text style={styles.headerSubtitle}>{currentCrop} Real-time Monitoring</Text>
        </View>

        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            <View style={styles.metricCard}>
              <View style={[styles.iconContainer, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="flask" size={22} color="#ef4444" />
              </View>
              <Text style={styles.cardLabel}>Soil pH</Text>
              <Text style={styles.cardValue}>
                {sensors.ph !== null ? Number(sensors.ph).toFixed(1) : 'N/A'}
              </Text>
              <Text style={[styles.cardStatus, { color: phStatus.color }]}>
                {phStatus.label}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.iconContainer, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="water" size={24} color="#3b82f6" />
              </View>
              <Text style={styles.cardLabel}>Moisture</Text>
              <Text style={styles.cardValue}>
                {sensors.moisture !== null ? `${Math.round(sensors.moisture)}%` : 'N/A'}
              </Text>
              <Text style={[styles.cardStatus, { color: '#2563eb' }]}>OPTIMAL</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.iconContainer, { backgroundColor: '#e0e7ff' }]}>
                <Ionicons name="flash" size={22} color="#fff764" />
              </View>
              <Text style={styles.cardLabel}>EC</Text>
              <Text style={styles.cardValue}>
                {sensors.ec !== null ? `${Math.round(sensors.ec)}` : 'N/A'}
              </Text>
              <Text style={[styles.cardStatus, { color: ecStatus.color }]}>{ecStatus.label}</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={[styles.metricCard, styles.largeRowCard]}>
              <View style={[styles.iconContainer, { backgroundColor: '#ffedd5' }]}>
                <Ionicons name="thermometer" size={24} color="#f97316" />
              </View>
              <Text style={styles.cardLabel}>Temperature</Text>
              <Text style={styles.cardValueBig}>
                {sensors.temp !== null ? `${Number(sensors.temp).toFixed(1)}°C` : 'N/A'}
              </Text>
              <Text style={[styles.cardStatus, { color: '#ef4444' }]}>Normal</Text>
            </View>

            <View style={[styles.metricCard, styles.largeRowCard, styles.npkCard]}>
              <View style={styles.npkHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#dcfce7', marginBottom: 0 }]}>
                  <Ionicons name="leaf" size={20} color="#22c55e" />
                </View>
                <Text style={styles.cardLabelNPK}>NPK Levels</Text>
              </View>

              <View style={styles.npkMetricRow}>
                <Text style={styles.npkLabel}>N (Nitrogen):</Text>
                <Text style={styles.npkValue}>
                  {sensors.nitrogen !== null ? Math.round(sensors.nitrogen) : 'N/A'}
                </Text>
              </View>
              <View style={styles.npkMetricRow}>
                <Text style={styles.npkLabel}>P (Phosphorus):</Text>
                <Text style={styles.npkValue}>
                  {sensors.phosphorus !== null ? Math.round(sensors.phosphorus) : 'N/A'}
                </Text>
              </View>
              <View style={styles.npkMetricRow}>
                <Text style={styles.npkLabel}>K (Potassium):</Text>
                <Text style={styles.npkValue}>
                  {sensors.potassium !== null ? Math.round(sensors.potassium) : 'N/A'}
                </Text>
              </View>

              <Text style={[styles.cardStatus, { color: npkStatus.color, marginTop: 4 }]}>
                {npkStatus.label}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.optimizeButton}
            onPress={() => setShowOptimizeModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.optimizeButtonText}>Optimize Soil Health</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Soil pH Levels by Day</Text>
          <Text style={styles.chartSubtitle}>Weekly monitoring</Text>

          {loadingCharts ? (
            <ActivityIndicator size="small" color="#2d6a4f" style={{ marginVertical: 30 }} />
          ) : (
            <>
              <BarChart
                data={{
                  labels: weeklyData.labels,
                  datasets: [{ data: weeklyData.values }]
                }}
                width={screenWidth - 20}
                height={200}
                yAxisMax={14}
                fromZero
                withCustomBarColorFromData
                flatColor
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                  barPercentage: 0.65,
                  fillShadowGradientOpacity: 1,
                }}
                style={styles.chartStyle}
                withInnerLines={true}
                showBarTops={false}
              />

              <View style={styles.legendGrid}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.legendText}>Highly Acidic (&lt;5.5)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
                  <Text style={styles.legendText}>Mod. Acidic (5.5-6.5)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={styles.legendText}>OPTIMAL (6.5-7.5)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                  <Text style={styles.legendText}>Alkaline (&gt;7.5)</Text>
                </View>
              </View>
            </>
          )}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>pH Trend Over Time</Text>
          <Text style={styles.chartSubtitle}>Last 24 hours</Text>

          {loadingCharts ? (
            <ActivityIndicator size="small" color="#2d6a4f" style={{ marginVertical: 30 }} />
          ) : (
            <LineChart
              data={{
                labels: hourlyData.labels,
                datasets: [{ data: hourlyData.values }]
              }}
              width={screenWidth - 20}
              height={190}
              yAxisMin={4}
              yAxisMax={8}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                propsForDots: {
                  r: '5',
                  strokeWidth: '2',
                  stroke: '#22c55e'
                }
              }}
              bezier
              style={styles.chartStyle}
            />
          )}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Text style={styles.infoTitle}>Sensor Information</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={handleManualRefresh}>
              <Ionicons name="refresh" size={14} color="#22c55e" style={{ marginRight: 4 }} />
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sensor ID:</Text>
            <Text style={styles.infoValue}>{hasSensor ? activeSensorId : 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location:</Text>
            <Text style={styles.infoValue}>{plotData?.location || 'North Sector'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Battery Status:</Text>
            <Text style={[styles.infoValue, styles.batteryText]}>
              {hasSensor && sensors.battery !== null ? `${sensors.battery}%` : 'N/A'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: hasSensor ? '#ef4444' : '#22c55e' }
            ]}
            onPress={handleConnectOrDisconnect}
          >
            <Ionicons name="power" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>
              {hasSensor ? 'Disconnect Sensor' : 'Connect Available Sensor'}
            </Text>
          </TouchableOpacity>

          {/* Dedicated BLE Wi-Fi Configuration Button */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#3b82f6', marginTop: 10 }]}
            onPress={startBleScan}
          >
            <Ionicons name="bluetooth" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>Configure Device WiFi (BLE)</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* SENSOR SELECTION POPUP MENU */}
      <Modal
        visible={showSensorModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSensorModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSensorModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalHeaderTitle}>
              <Ionicons name="radio" size={20} color="#0f172a" /> Select Available Sensor
            </Text>
            <Text style={styles.modalHeaderSubtitle}>
              Link an active Supabase hardware sensor to {currentPlot}
            </Text>

            {connecting ? (
              <ActivityIndicator size="large" color="#22c55e" style={{ marginVertical: 30 }} />
            ) : availableSensors.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>No active sensors found in Supabase.</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 260, marginVertical: 10 }}>
                {availableSensors.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.sensorSelectItem}
                    onPress={() => handleSelectSensor(item.sensor_id)}
                  >
                    <View style={styles.sensorSelectIconBadge}>
                      <Ionicons name="hardware-chip-outline" size={20} color="#64748b" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sensorSelectTitle}>{item.sensor_id}</Text>
                      <Text style={styles.sensorSelectSub}>
                        Battery: {item.battery}% • Last seen: {item.timestamp}
                      </Text>
                    </View>
                    <View style={styles.connectBadge}>
                      <Text style={styles.connectBadgeText}>Connect</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowSensorModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Cancel</Text>
            </TouchableOpacity>

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* BLE WIFI PROVISIONING MODAL */}
      <Modal
        visible={showWifiModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWifiModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWifiModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalHeaderTitle}>
              <Ionicons name="bluetooth" size={20} color="#3b82f6" /> ESP32 Wi-Fi Provisioning
            </Text>
            <Text style={styles.modalHeaderSubtitle}>
              Scan and configure local network credentials via Bluetooth
            </Text>

            <TextInput
              style={styles.inputField}
              placeholder="Wi-Fi SSID"
              placeholderTextColor="#94a3b8"
              value={wifiSsid}
              onChangeText={setWifiSsid}
            />
            <TextInput
              style={styles.inputField}
              placeholder="Wi-Fi Password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={wifiPass}
              onChangeText={setWifiPass}
            />

            <Text style={styles.sectionHeaderLabel}>Available Devices (JJMAP_Setup):</Text>
            
            {isProvisioning ? (
              <ActivityIndicator size="large" color="#3b82f6" style={{ marginVertical: 20 }} />
            ) : scannedDevices.length === 0 ? (
              <Text style={styles.emptyStateText}>Searching for nearby ESP32 devices...</Text>
            ) : (
              <ScrollView style={{ maxHeight: 180, marginVertical: 10 }}>
                {scannedDevices.map((device, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.sensorSelectItem}
                    onPress={() => configureDeviceWifi(device)}
                  >
                    <View style={styles.sensorSelectIconBadge}>
                      <Ionicons name="bluetooth-outline" size={20} color="#3b82f6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sensorSelectTitle}>{device.name || 'Unknown Device'}</Text>
                      <Text style={styles.sensorSelectSub}>ID: {device.id}</Text>
                    </View>
                    <View style={[styles.connectBadge, { backgroundColor: '#dbeafe' }]}>
                      <Text style={[styles.connectBadgeText, { color: '#1d4ed8' }]}>Provision</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.closeModalButton, { backgroundColor: '#64748b', marginTop: 10 }]}
              onPress={() => setShowWifiModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* SOIL OPTIMIZATION RECOMMENDATIONS MODAL */}
      <Modal
        visible={showOptimizeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptimizeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptimizeModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
           
            <View style={styles.recHeaderRow}>
              <View style={styles.lightbulbBadge}>
                <Ionicons name="bulb" size={20} color="#eab308" />
              </View>
              <Text style={styles.recTitle}>Fertilizer Recommendations</Text>
            </View>

            <Text style={styles.recSubtitle}>
              For lot size: {plotSize} Based on soil test results
            </Text>

            <View style={styles.recBoxLime}>
              <View style={styles.recBoxTopRow}>
                <View style={styles.alertIconBadge}>
                  <Ionicons name="warning" size={16} color="#ef4444" />
                </View>
                <Text style={styles.recItemTitle}>Agricultural Lime</Text>
                <View style={styles.priorityTag}>
                  <Text style={styles.priorityTagText}>PRIORITY</Text>
                </View>
              </View>

              <Text style={styles.sackCount}>{limeSacksNeeded} {limeSacksNeeded === 1 ? 'sack' : 'sacks'}</Text>
              <Text style={styles.recDescText}>
                pH {sensors.ph !== null ? Number(sensors.ph).toFixed(1) : '6.0'} is acidic. Adjust pH to optimal range (6.5-7.0) first.
              </Text>
            </View>

            <View style={styles.recBoxUrea}>
              <View style={styles.recBoxTopRow}>
                <View style={styles.numberIconBadge}>
                  <Text style={styles.numberIconText}>2</Text>
                </View>
                <Text style={styles.recItemTitle}>Urea (46-0-0)</Text>
              </View>

              <Text style={styles.sackCount}>{ureaSacksNeeded} {ureaSacksNeeded === 1 ? 'sack' : 'sacks'}</Text>
              <Text style={styles.recDescText}>
                Nitrogen reading is {sensors.nitrogen !== null ? `${Math.round(sensors.nitrogen)} ppm` : 'below threshold'}. Urea provides high nitrogen content.
              </Text>
            </View>

            <View style={styles.recBoxTip}>
              <Text style={styles.tipText}>
                <Text style={styles.tipTitle}><Ionicons name="warning" size={14} color="#b45309" /> pH Prioritization: </Text>
                Apply lime treatment first to correct soil acidity. This prevents nutrient lockout and ensures NPK fertilizers will be effective.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowOptimizeModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Close Recommendations</Text>
            </TouchableOpacity>

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <MobileFooter currentTab={currentTab} onSelectTab={onSelectTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingBottom: 110 },
  headerCard: {
    backgroundColor: '#2d6a4f',
    paddingTop: 45,
    paddingHorizontal: 20,
    paddingBottom: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  headerTitle: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { color: '#d8f3dc', fontSize: 14, marginTop: 4 },
 
  gridContainer: { paddingHorizontal: 15, marginTop: -40 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
 
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    marginHorizontal: 4,
    minHeight: 120,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    justifyContent: 'space-between',
  },
  largeRowCard: {
    minHeight: 135,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  cardLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  cardValue: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginVertical: 2 },
  cardValueBig: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginVertical: 4 },
  cardStatus: { fontSize: 11, fontWeight: '700' },

  npkCard: { flex: 1.25 },
  npkHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardLabelNPK: { fontSize: 13, color: '#0f172a', fontWeight: 'bold', marginLeft: 8 },
  npkMetricRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  npkLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  npkValue: { fontSize: 12, color: '#0f172a', fontWeight: 'bold' },

  optimizeButton: {
    flexDirection: 'row',
    backgroundColor: '#2d6a4f',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  optimizeButtonText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },

  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 15,
    marginTop: 15,
    elevation: 2,
  },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  chartSubtitle: { fontSize: 12, color: '#94a3b8', marginBottom: 10 },
  chartStyle: { marginVertical: 8, borderRadius: 12, paddingRight: 35 },
 
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', width: '48%', marginBottom: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 11, color: '#64748b', fontWeight: '500' },

  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 15,
    marginTop: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  infoCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  infoTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  refreshButton: { flexDirection: 'row', alignItems: 'center' },
  refreshText: { fontSize: 13, color: '#15803d', fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  infoLabel: { color: '#64748b', fontSize: 14 },
  infoValue: { fontWeight: 'bold', color: '#0f172a', fontSize: 14 },
  batteryText: { color: '#16a34a', fontWeight: 'bold' },
 
  actionButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  actionButtonText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  modalHeaderSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  
  inputField: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
  },
  sectionHeaderLabel: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 10, marginBottom: 6 },
  emptyStateText: { textAlign: 'center', color: '#64748b', fontStyle: 'italic', marginVertical: 15 },
  
  sensorSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sensorSelectIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sensorSelectTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  sensorSelectSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  connectBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  connectBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#15803d' },

  recHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  lightbulbBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef9c3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  recTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  recSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 16 },

  recBoxLime: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  recBoxTopRow: { flexDirection: 'row', alignItems: 'center' },
  alertIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  recItemTitle: { fontSize: 17, fontWeight: 'bold', color: '#0f172a', flex: 1 },
  priorityTag: { backgroundColor: '#ffe4e6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityTagText: { color: '#e11d48', fontSize: 10, fontWeight: 'bold' },
  sackCount: { fontSize: 20, fontWeight: 'bold', color: '#064e3b', marginTop: 6, marginBottom: 4 },
  recDescText: { fontSize: 13, color: '#334155', lineHeight: 18 },

  recBoxUrea: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  numberIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#166534',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  numberIconText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },

  recBoxTip: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde047',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  tipText: { fontSize: 13, color: '#713f12', lineHeight: 18 },
  tipTitle: { fontWeight: 'bold', color: '#a16207' },

  closeModalButton: {
    backgroundColor: '#2d6a4f',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeModalButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
});