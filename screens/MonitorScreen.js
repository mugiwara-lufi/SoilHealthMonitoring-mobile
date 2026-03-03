import React from 'react';
import { ScrollView, View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import MonitorCard from '../components/MonitorCard'; 
import MobileFooter from '../components/MobileFooter';

export default function MonitorScreen({ plotData }) {
  // Use passed data or fall back to default if none is selected
  const currentPlot = plotData?.name || "Select Plot";
  const currentCrop = plotData?.crop || "N/A";
  const sensors = plotData?.sensors || { moisture: "0", temp: "0", battery: "0%", signal: "N/A" };

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
          <Text style={styles.sensorStatus}>📡 Sensor Online</Text>
          <TouchableOpacity style={styles.refreshBtn}>
             <Text style={styles.refreshText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollPadding}>
        <Text style={styles.lastUpdated}>🕒 Last Updated: 0 seconds ago</Text>
        
        <View style={styles.statusBanner}>
          <Text style={styles.checkIcon}>✅</Text>
          <View>
            <Text style={styles.statusTitle}>All Systems Normal</Text>
            <Text style={styles.statusSub}>Soil conditions for {currentCrop} are optimal.</Text>
          </View>
        </View>

        <MonitorCard label="Soil Moisture" value={sensors.moisture} unit="%" targetRange="40 - 60%" icon="💧" />
        <MonitorCard label="Soil Temperature" value={sensors.temp} unit="°C" targetRange="22 - 30°C" icon="🌡️" />

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>📂 Quick Tips</Text>
          <View style={styles.tipRow}>
            <Text style={styles.dotGreen}>●</Text>
            <Text style={styles.tipText}><Text style={styles.bold}>Green light:</Text> = Soil conditions perfect for {currentCrop?.toLowerCase()} growth</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.dotYellow}>●</Text>
            <Text style={styles.tipText}><Text style={styles.bold}>Yellow light:</Text> = Monitor closely, adjustment may be needed</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.dotRed}>●</Text>
            <Text style={styles.tipText}><Text style={styles.bold}>Red light:</Text> = Take immediate action to protect your crop</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.dotBlue}>●</Text>
            <Text style={styles.tipText}>Pull down to refresh or tap the Refresh button</Text>
          </View>
        </View>

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
            <Text style={[styles.infoValue, { color: '#00c853' }]}>{sensors.battery}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Signal:</Text>
            <Text style={[styles.infoValue, { color: '#00c853' }]}>{sensors.signal}</Text>
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
  statusBanner: { backgroundColor: '#fff', borderRadius: 15, padding: 15, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 6, borderLeftColor: '#00c853', marginBottom: 15, elevation: 2 },
  checkIcon: { fontSize: 24, marginRight: 12 },
  statusTitle: { fontWeight: 'bold', fontSize: 16 },
  statusSub: { color: '#64748b', fontSize: 12 },
  tipsCard: { backgroundColor: '#fff', borderRadius: 15, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  tipsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#0f172a' },
  tipRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' },
  tipText: { flex: 1, marginLeft: 10, color: '#334155', fontSize: 13, lineHeight: 18 },
  bold: { fontWeight: '700' },
  dotGreen: { color: '#00c853' }, dotYellow: { color: '#ffb300' }, dotRed: { color: '#ef4444' }, dotBlue: { color: '#3b82f6' },
  infoCard: { backgroundColor: '#fff', borderRadius: 15, padding: 18, marginBottom: 20, elevation: 2 },
  infoTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoLabel: { color: '#64748b', fontSize: 14 },
  infoValue: { fontWeight: 'bold', color: '#0f172a', fontSize: 14, flex: 1, textAlign: 'right' }
});