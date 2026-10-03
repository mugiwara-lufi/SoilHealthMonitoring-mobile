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
  Modal 
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import MobileFooter from '../components/MobileFooter';

const screenWidth = Dimensions.get('window').width - 30;
const API_BASE_URL = 'http://192.168.5.66:8000'; // Replace with your environment/config variable

export default function MonitorScreen({ plotData, onRefreshData, onDisconnectSensor, currentTab, onSelectTab, onBack }) {
  const currentPlot = plotData?.name || "Plot";
  const currentCrop = plotData?.crop || plotData?.crop_type || "Crop";
  const plotSize = plotData?.size || "2.5 hectares";

  // Parse numeric hectare size for fertilizer scaling fallback
  const parsedHectares = parseFloat(plotSize) || 2.5;

  // 1. Get records array from Django API or fallback to single object/mock
  const recordsArray = Array.isArray(plotData?.records) ? plotData.records : [];
  const latestRecord = recordsArray.length > 0 
    ? recordsArray[0] 
    : (plotData?.sensors || null);

  // Debug output
  console.log("RECEIVED RECORD IN MONITOR SCREEN:", latestRecord);

  const hasSensor = Boolean(
    plotData?.sensor_id && 
    plotData?.sensor_id !== "N/A" && 
    latestRecord !== null
  );

  const [loadingCharts, setLoadingCharts] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);

  const [weeklyData, setWeeklyData] = useState({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    values: [4.0, 4.5, 5.5, 6.2, 6.5, 6.8, 7.6]
  });
  const [hourlyData, setHourlyData] = useState({
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
    values: [5.2, 5.4, 5.6, 5.8, 5.9, 5.7, 5.6]
  });

  const fetchAnalytics = async () => {
    if (!plotData?.id) return;
    setLoadingCharts(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/plots/${plotData.id}/ph-analytics/`);
      const data = await response.json();
      if (data.weekly) setWeeklyData(data.weekly);
      if (data.hourly) setHourlyData(data.hourly);
    } catch (error) {
      console.log("Error fetching pH analytics:", error);
    } finally {
      setLoadingCharts(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [plotData?.id]);

  const handleManualRefresh = () => {
    fetchAnalytics();
    if (onRefreshData) onRefreshData();
  };

  // Helper to safely extract numeric values from both Django API & legacy mock keys
  const getSensorVal = (rec, ...keys) => {
    if (!rec) return null;
    for (const key of keys) {
      const val = key.split('.').reduce((obj, k) => obj?.[k], rec);
      if (val !== undefined && val !== null && val !== '') {
        // Strip string noise (e.g. "90%" -> 90)
        const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  };

  // Extract sensors with Django key priorities, with fallback to legacy keys
  const sensors = {
    ph: getSensorVal(latestRecord, 'ph_level', 'ph', 'phLevel'),
    moisture: getSensorVal(latestRecord, 'soil_moisture', 'moisture', 'soilMoisture'),
    humidity: getSensorVal(latestRecord, 'humidity', 'soil_humidity', 'air_humidity', 'env_humidity'),
    temp: getSensorVal(latestRecord, 'soil_temperature', 'temp', 'temperature', 'soilTemp'),
    nitrogen: getSensorVal(latestRecord, 'nitrogen', 'n', 'n_level', 'npk.n', 'npk.nitrogen'),
    phosphorus: getSensorVal(latestRecord, 'phosphorus', 'p', 'p_level', 'npk.p', 'npk.phosphorus'),
    potassium: getSensorVal(latestRecord, 'potassium', 'k', 'k_level', 'npk.k', 'npk.potassium'),
    battery: getSensorVal(latestRecord, 'battery_percentage', 'battery', 'battery_level', 'batteryLevel'),
  };

  console.log("Current Sensors State:", sensors);

  // Dynamic Status Helper for pH Level
  const getPhStatus = (ph) => {
    if (ph === null || ph === undefined) return { label: 'Unknown', color: '#64748b' };
    const num = parseFloat(ph);
    if (num < 5.5) return { label: 'Highly Acidic', color: '#ef4444' };
    if (num <= 6.5) return { label: 'Mod. Acidic', color: '#f97316' };
    if (num <= 7.5) return { label: 'OPTIMAL', color: '#22c55e' };
    return { label: 'Alkaline', color: '#3b82f6' };
  };

  // Dynamic Status Helper for NPK Levels
  const getNpkStatus = (n, p, k) => {
    if (n === null && p === null && k === null) return { label: 'Unknown', color: '#64748b' };
    if ((n !== null && n < 30) || (p !== null && p < 20) || (k !== null && k < 30)) {
      return { label: 'Needs Attention', color: '#ef4444' };
    }
    return { label: 'Optimal Range', color: '#22c55e' };
  };

  const phStatus = getPhStatus(sensors.ph);
  const npkStatus = getNpkStatus(sensors.nitrogen, sensors.phosphorus, sensors.potassium);

  // Dynamic Calculations for Modal Recommendations
  const limeSacksNeeded = Math.max(1, Math.round(parsedHectares * 1.5));
  const ureaSacksNeeded = Math.max(1, Math.round(parsedHectares * 0.8));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Block */}
        <View style={styles.headerCard}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{currentPlot} - Soil Analytics</Text>
          <Text style={styles.headerSubtitle}>{currentCrop} • Real-time Monitoring</Text>
        </View>

        {/* Dynamic Metric Grid */}
        <View style={styles.gridContainer}>
          
          {/* TOP ROW: Soil pH, Moisture, Humidity */}
          <View style={styles.gridRow}>
            {/* Soil pH */}
            <View style={styles.metricCard}>
              <View style={[styles.iconContainer, { backgroundColor: '#fee2e2' }]}>
                <Text style={styles.cardEmoji}>🧪</Text>
              </View>
              <Text style={styles.cardLabel}>Soil pH</Text>
              <Text style={styles.cardValue}>
                {sensors.ph !== null ? Number(sensors.ph).toFixed(1) : 'N/A'}
              </Text>
              <Text style={[styles.cardStatus, { color: phStatus.color }]}>
                {phStatus.label}
              </Text>
            </View>

            {/* Moisture */}
            <View style={styles.metricCard}>
              <View style={[styles.iconContainer, { backgroundColor: '#dbeafe' }]}>
                <Text style={styles.cardEmoji}>💧</Text>
              </View>
              <Text style={styles.cardLabel}>Moisture</Text>
              <Text style={styles.cardValue}>
                {sensors.moisture !== null ? `${Math.round(sensors.moisture)}%` : 'N/A'}
              </Text>
              <Text style={[styles.cardStatus, { color: '#2563eb' }]}>OPTIMAL</Text>
            </View>

            {/* Humidity */}
            <View style={styles.metricCard}>
              <View style={[styles.iconContainer, { backgroundColor: '#e0e7ff' }]}>
                <Text style={styles.cardEmoji}>💨</Text>
              </View>
              <Text style={styles.cardLabel}>Humidity</Text>
              <Text style={styles.cardValue}>
                {sensors.humidity !== null ? `${Math.round(sensors.humidity)}%` : 'N/A'}
              </Text>
              <Text style={[styles.cardStatus, { color: '#4f46e5' }]}>Normal</Text>
            </View>
          </View>

          {/* BOTTOM ROW: Temperature & Combined NPK Card */}
          <View style={styles.gridRow}>
            
            {/* Temperature Card */}
            <View style={[styles.metricCard, styles.largeRowCard]}>
              <View style={[styles.iconContainer, { backgroundColor: '#ffedd5' }]}>
                <Text style={styles.cardEmoji}>🌡️</Text>
              </View>
              <Text style={styles.cardLabel}>Temperature</Text>
              <Text style={styles.cardValueBig}>
                {sensors.temp !== null ? `${Number(sensors.temp).toFixed(1)}°C` : 'N/A'}
              </Text>
              <Text style={[styles.cardStatus, { color: '#ef4444' }]}>Normal</Text>
            </View>

            {/* Combined N, P, K Card */}
            <View style={[styles.metricCard, styles.largeRowCard, styles.npkCard]}>
              <View style={styles.npkHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#dcfce7', marginBottom: 0 }]}>
                  <Text style={styles.cardEmoji}>🌱</Text>
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

          {/* OPTIMIZE BUTTON */}
          <TouchableOpacity 
            style={styles.optimizeButton} 
            onPress={() => setShowOptimizeModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.optimizeButtonEmoji}>⚡</Text>
            <Text style={styles.optimizeButtonText}>Optimize Soil Health</Text>
          </TouchableOpacity>

        </View>

        {/* --- GRAPH 1: Soil pH Levels by Day --- */}
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

        {/* --- GRAPH 2: pH Trend Over Time --- */}
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

        {/* SENSOR INFORMATION CARD */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Text style={styles.infoTitle}>Sensor Information</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={handleManualRefresh}>
              <Text style={styles.refreshIcon}>🔄</Text>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sensor ID:</Text>
            <Text style={styles.infoValue}>{hasSensor ? plotData.sensor_id : 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location:</Text>
            <Text style={styles.infoValue}>{plotData?.location || 'North Sector'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Battery Status:</Text>
            <Text style={[styles.infoValue, styles.batteryText]}>
              {sensors.battery !== null ? `${sensors.battery}%` : '0%'}
            </Text>
          </View>

          <TouchableOpacity 
            style={[
              styles.actionButton, 
              { backgroundColor: hasSensor ? '#ef4444' : '#22c55e' }
            ]} 
            onPress={onDisconnectSensor}
          >
            <Text style={styles.actionButtonText}>
              {hasSensor ? '🔌 Disconnect Sensor' : '🔌 Connect Sensor'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* FERTILIZER RECOMMENDATIONS MODAL POPUP */}
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
            
            {/* Header Title with Lightbulb Badge */}
            <View style={styles.recHeaderRow}>
              <View style={styles.lightbulbBadge}>
                <Text style={{ fontSize: 16 }}>💡</Text>
              </View>
              <Text style={styles.recTitle}>Fertilizer Recommendations</Text>
            </View>

            <Text style={styles.recSubtitle}>
              For lot size: {plotSize} • Based on soil test results
            </Text>

            {/* Recommendation Item 1: Agricultural Lime */}
            <View style={styles.recBoxLime}>
              <View style={styles.recBoxTopRow}>
                <View style={styles.alertIconBadge}>
                  <Text style={styles.alertIconText}>⚠️</Text>
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

            {/* Recommendation Item 2: Urea */}
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

            {/* Recommendation Item 3: pH Prioritization Tip Box */}
            <View style={styles.recBoxTip}>
              <Text style={styles.tipText}>
                <Text style={styles.tipTitle}>⚠️ pH Prioritization: </Text>
                Apply lime treatment first to correct soil acidity. This prevents nutrient lockout and ensures NPK fertilizers will be effective.
              </Text>
            </View>

            {/* Close Button */}
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
  backIcon: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  headerTitle: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { color: '#d8f3dc', fontSize: 14, marginTop: 4 },
  
  // Grid layout
  gridContainer: { paddingHorizontal: 15, marginTop: -40 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  
  // Metric Cards
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
  cardEmoji: { fontSize: 16 },
  cardLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  cardValue: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginVertical: 2 },
  cardValueBig: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginVertical: 4 },
  cardStatus: { fontSize: 11, fontWeight: '700' },

  // NPK Card
  npkCard: { flex: 1.25 },
  npkHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardLabelNPK: { fontSize: 13, color: '#0f172a', fontWeight: 'bold', marginLeft: 8 },
  npkMetricRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  npkLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  npkValue: { fontSize: 12, color: '#0f172a', fontWeight: 'bold' },

  // Optimize Button
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
  optimizeButtonEmoji: { fontSize: 16, marginRight: 8 },
  optimizeButtonText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },

  // Charts
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

  // Sensor Information Card
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
  refreshIcon: { fontSize: 13, marginRight: 4 },
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

  // --- POPUP MODAL STYLES ---
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
  recHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  lightbulbBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef9c3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  recTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  recSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },

  // Box 1: Lime
  recBoxLime: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  recBoxTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  alertIconText: { fontSize: 14 },
  recItemTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
    flex: 1,
  },
  priorityTag: {
    backgroundColor: '#ffe4e6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityTagText: {
    color: '#e11d48',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sackCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#064e3b',
    marginTop: 6,
    marginBottom: 4,
  },
  recDescText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },

  // Box 2: Urea
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
  numberIconText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Box 3: Tip
  recBoxTip: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde047',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  tipText: {
    fontSize: 13,
    color: '#713f12',
    lineHeight: 18,
  },
  tipTitle: {
    fontWeight: 'bold',
    color: '#a16207',
  },

  // Modal Close Button
  closeModalButton: {
    backgroundColor: '#2d6a4f',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});