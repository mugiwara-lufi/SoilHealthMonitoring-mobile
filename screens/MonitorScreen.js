import React from 'react';
import { ScrollView, View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import MonitorCard from '../components/MonitorCard'; 
import MobileFooter from '../components/MobileFooter';

export default function MonitorScreen({ plotData, onAddSensor, onRemoveSensor, onRefreshData, currentTab, onSelectTab }) {
  const currentPlot = plotData?.name || "Select Plot";
  const currentCrop = plotData?.crop || "N/A";

  const hasSensor = Boolean(plotData?.sensor_id && plotData?.sensor_id !== "N/A");

  const sensors = plotData?.sensors || { 
    moisture: "N/A", 
    temp: "N/A", 
    ph: "N/A", 
    battery: "0%", 
    signal: "N/A" 
  };

  const getDerivedStatus = () => {
    const rawMoisture = sensors?.moisture;

    // Direct Offline fallback if plot has no active sensor or no readings
    if (
      !hasSensor ||
      rawMoisture === undefined || 
      rawMoisture === null || 
      rawMoisture === "N/A" || 
      rawMoisture === ""
    ) {
      return { 
        label: 'Offline', 
        color: '#64748b', 
        icon: '❌', 
        title: 'System Offline', 
        sub: 'No sensor active or no telemetry received yet.' 
      };
    }

    const cleanedString = String(rawMoisture).replace(/[^0-9.]/g, '');
    const moisture = parseFloat(cleanedString);

    if (isNaN(moisture)) {
      return { 
        label: 'Offline', 
        color: '#64748b', 
        icon: '❌', 
        title: 'System Offline', 
        sub: 'Invalid reading received.' 
      };
    }

    if (moisture < 30) {
      return { 
        label: 'Critical', 
        color: '#ef4444', 
        icon: '🚨', 
        title: 'CRITICAL ALERT', 
        sub: 'Moisture level critical! Immediate action required.' 
      };
    }

    if (moisture < 40) {
      return { 
        label: 'Warning', 
        color: '#f59e0b', 
        icon: '⚠️', 
        title: 'System Warning', 
        sub: 'Moisture is getting low.' 
      };
    }

    return { 
      label: 'Optimal', 
      color: '#22c55e', 
      icon: '✅', 
      title: 'All Systems Normal', 
      sub: `Conditions for ${currentCrop} are optimal.` 
    };
  };

  const statusInfo = getDerivedStatus();

  const handleSensorToggle = () => {
    if (hasSensor) {
      Alert.alert(
        "Remove Sensor",
        `Are you sure you want to disconnect sensor (${plotData.sensor_id}) from ${currentPlot}?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Remove", 
            style: "destructive", 
            onPress: () => onRemoveSensor && onRemoveSensor(plotData.id) 
          }
        ]
      );
    } else {
      Alert.alert(
        "Connect Sensor",
        `Assign a new active sensor module to ${currentPlot}?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Connect Sensor", 
            onPress: () => onAddSensor && onAddSensor(plotData.id) 
          }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Live Farm Monitor</Text>
            <Text style={styles.subtitle}>{currentPlot} - {currentCrop}</Text>
          </View>
          <Text style={styles.trafficLight}>🚦</Text>
        </View>
        <View style={styles.headerBottom}>
          <Text style={styles.sensorStatus}>
            📡 {!hasSensor ? 'No Sensor Linked' : (statusInfo.label === 'Offline' ? 'Disconnected' : 'Sensor Online')}
          </Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefreshData}>
            <Text style={styles.refreshText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollPadding}>
        <Text style={styles.lastUpdated}>🕒 Last Updated: Just now</Text>
        
        {/* Status Banner */}
        <View style={[styles.statusBanner, { borderLeftColor: statusInfo.color }]}>
          <Text style={styles.checkIcon}>{statusInfo.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>{statusInfo.title}</Text>
            <Text style={styles.statusSub}>{statusInfo.sub}</Text>
          </View>
        </View>

        {/* Dynamic Metric Cards */}
        <MonitorCard 
          label="Soil Moisture" 
          value={hasSensor ? sensors.moisture : "N/A"} 
          unit={hasSensor && sensors.moisture !== "N/A" && !String(sensors.moisture).includes("%") ? "%" : ""} 
          targetRange="40 - 60%" 
          icon="💧" 
        />
        <MonitorCard 
          label="Soil Temperature" 
          value={hasSensor ? sensors.temp : "N/A"} 
          unit={hasSensor && sensors.temp !== "N/A" && !String(sensors.temp).includes("°C") ? "°C" : ""} 
          targetRange="22 - 30°C" 
          icon="🌡️" 
        />
        <MonitorCard 
          label="Soil pH Level" 
          value={hasSensor ? sensors.ph : "N/A"} 
          unit="" 
          targetRange="6.0 - 7.5" 
          icon="🧪" 
        />

        {/* Sensor Details Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Sensor Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sensor ID:</Text>
            <Text style={styles.infoValue}>{hasSensor ? plotData.sensor_id : 'Not Assigned'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location:</Text>
            <Text style={styles.infoValue}>{plotData?.location || 'Cagayan de Oro'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Battery Status:</Text>
            <Text style={[styles.infoValue, { color: !hasSensor || sensors.battery === '0%' ? '#ef4444' : '#16a34a' }]}>
              {hasSensor ? sensors.battery : '0%'}
            </Text>
          </View>

          {/* Connect / Disconnect Action Button */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              hasSensor ? styles.disconnectBtn : styles.connectBtn
            ]}
            onPress={handleSensorToggle}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>
              {hasSensor ? '🔌 Remove Sensor' : '➕ Connect Sensor'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Navigation Footer */}
      <MobileFooter currentTab={currentTab} onSelectTab={onSelectTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#1b5e20', padding: 25, paddingTop: 40, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, zIndex: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  title: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  subtitle: { color: '#dcfce7', fontSize: 14 },
  trafficLight: { fontSize: 22 },
  headerBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sensorStatus: { color: '#fff', fontSize: 13, fontWeight: '500' },
  refreshBtn: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  refreshText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  scrollPadding: { padding: 18, paddingBottom: 100 },
  lastUpdated: { textAlign: 'center', color: '#64748b', fontSize: 12, marginBottom: 12 },
  statusBanner: { backgroundColor: '#fff', borderRadius: 15, padding: 15, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 6, marginBottom: 15, elevation: 2 },
  checkIcon: { fontSize: 24, marginRight: 12 },
  statusTitle: { fontWeight: 'bold', fontSize: 16, color: '#0f172a' },
  statusSub: { color: '#64748b', fontSize: 12, marginTop: 2 },
  infoCard: { backgroundColor: '#fff', borderRadius: 15, padding: 18, marginBottom: 20, elevation: 2 },
  infoTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoLabel: { color: '#64748b', fontSize: 14 },
  infoValue: { fontWeight: 'bold', color: '#0f172a', fontSize: 14, flex: 1, textAlign: 'right' },
  actionBtn: {
    marginTop: 15,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBtn: {
    backgroundColor: '#16a34a',
  },
  disconnectBtn: {
    backgroundColor: '#ef4444',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});