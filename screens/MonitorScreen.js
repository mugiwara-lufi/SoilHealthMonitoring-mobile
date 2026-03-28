import React from 'react';
import { ScrollView, View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import MonitorCard from '../components/MonitorCard'; 
import MobileFooter from '../components/MobileFooter';

export default function MonitorScreen({ plotData }) {
  const currentPlot = plotData?.name || "Select Plot";
  const currentCrop = plotData?.crop || "N/A";
  const currentStatus = plotData?.status || "Unknown";
  const statusColor = plotData?.color || "#64748b"; // Used for the banner and battery
  const sensors = plotData?.sensors || { moisture: "0", temp: "0", battery: "0%", signal: "N/A" };

  // Logic for dynamic banner content
  const getStatusInfo = () => {
  switch (currentStatus) {
    case 'Optimal':
      return { icon: '✅', title: 'All Systems Normal', sub: `Soil conditions for ${currentCrop} are optimal.` };
    case 'Warning':
      return { icon: '⚠️', title: 'System Warning', sub: `Action required for ${currentCrop}. Check moisture levels.` };
    case 'Critical': // Added this
      return { icon: '🚨', title: 'CRITICAL ALERT', sub: `Extreme conditions detected! Immediate action required.` };
    case 'Offline':
      return { icon: '❌', title: 'System Offline', sub: `Sensor disconnected. Check battery or signal.` };
    default:
      return { icon: '❓', title: 'Unknown Status', sub: 'Cannot retrieve current soil data.' };
  }
};

  const statusInfo = getStatusInfo();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Live Farm Monitor</Text>
            <Text style={styles.subtitle}>{currentPlot} - {currentCrop}</Text>
          </View>
          <Text style={styles.trafficLight}>🚦</Text>
        </View>
        <View style={styles.headerBottom}>
          <Text style={styles.sensorStatus}>📡 {currentStatus === 'Offline' ? 'Disconnected' : 'Sensor Online'}</Text>
          <TouchableOpacity style={styles.refreshBtn}>
             <Text style={styles.refreshText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollPadding}>
        <Text style={styles.lastUpdated}>🕒 Last Updated: 0 seconds ago</Text>
        
        {/* DYNAMIC STATUS BANNER: This still changes based on the plot */}
        <View style={[styles.statusBanner, { borderLeftColor: statusColor }]}>
          <Text style={styles.checkIcon}>{statusInfo.icon}</Text>
          <View>
            <Text style={styles.statusTitle}>{statusInfo.title}</Text>
            <Text style={styles.statusSub}>{statusInfo.sub}</Text>
          </View>
        </View>

        <MonitorCard label="Soil Moisture" value={sensors.moisture} unit="%" targetRange="40 - 60%" icon="💧" />
        <MonitorCard label="Soil Temperature" value={sensors.temp} unit="°C" targetRange="22 - 30°C" icon="🌡️" />

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Sensor Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sensor ID:</Text>
            <Text style={styles.infoValue}>ESP32-{plotData?.id || '001'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location:</Text>
            <Text style={[styles.infoValue, { textAlign: 'right' }]}>{currentPlot}, North Section</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Battery:</Text>
            <Text style={[styles.infoValue, { color: statusColor }]}>{sensors.battery}</Text>
          </View>
        </View>
      </ScrollView>

      <MobileFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    backgroundColor: '#1b5e20',
    padding: 25, 
    paddingTop: 40, 
    borderBottomLeftRadius: 25, 
    borderBottomRightRadius: 25,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  title: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  subtitle: { color: '#fff', fontSize: 14, opacity: 0.9 },
  trafficLight: { fontSize: 22 },
  headerBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sensorStatus: { color: '#fff', fontSize: 13 },
  refreshBtn: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  refreshText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  scrollPadding: { padding: 18 },
  lastUpdated: { textAlign: 'center', color: '#64748b', fontSize: 12, marginBottom: 12 },
  statusBanner: { backgroundColor: '#fff', borderRadius: 15, padding: 15, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 6, marginBottom: 15, elevation: 2 },
  checkIcon: { fontSize: 24, marginRight: 12 },
  statusTitle: { fontWeight: 'bold', fontSize: 16 },
  statusSub: { color: '#64748b', fontSize: 12 },
  infoCard: { backgroundColor: '#fff', borderRadius: 15, padding: 18, marginBottom: 20, elevation: 2 },
  infoTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoLabel: { color: '#64748b', fontSize: 14 },
  infoValue: { fontWeight: 'bold', color: '#0f172a', fontSize: 14, flex: 1, textAlign: 'right' }
});