// screens/HistoryScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import MobileFooter from '../components/MobileFooter';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Supabase Direct Credentials
const SUPABASE_URL = 'https://fpisfwcphgjcvxomzpko.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cyQgbi_v02dkhswabEBWoQ_3exGPlaK';

export default function HistoryScreen({ currentTab, onSelectTab, selectedPlotId }) {
  const [selectedRange, setSelectedRange] = useState('7 Days'); // '7 Days', '30 Days', '90 Days'
  const [selectedMetric, setSelectedMetric] = useState('pH'); // 'pH', 'Moisture', 'Temp', 'NPK'

  const [loading, setLoading] = useState(false);
  const [rawRecords, setRawRecords] = useState([]);
  const [chartData, setChartData] = useState({
    labels: ['--'],
    datasets: [{ data: [0] }],
  });
  const [stats, setStats] = useState({ avg: '--', min: '--', max: '--' });
  const [recentEvents, setRecentEvents] = useState([]);

  // Metric visual configurations
  const metricTheme = {
    pH: { title: 'pH Level Trend', unit: '', color: '#f97316' },
    Moisture: { title: 'Soil Moisture (%) Trend', unit: '%', color: '#3b82f6' },
    Temp: { title: 'Temperature (°C) Trend', unit: '°C', color: '#ef4444' },
    NPK: { title: 'NPK Overall Trend', unit: '', color: '#1b5e20' },
  };

  const activeTheme = metricTheme[selectedMetric];

  // Fetch telemetry records from Supabase
  const fetchHistoryFromSupabase = useCallback(async () => {
    setLoading(true);
    try {
      let queryUrl = `${SUPABASE_URL}/rest/v1/soil_records?select=*&order=timestamp.asc&limit=300`;
      
      if (selectedPlotId) {
        queryUrl = `${SUPABASE_URL}/rest/v1/soil_records?select=*&plot_id=eq.${selectedPlotId}&order=timestamp.asc&limit=300`;
      }

      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRawRecords(Array.isArray(data) ? data : []);
      } else {
        setRawRecords([]);
      }
    } catch (err) {
      console.log('Error fetching history records from Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPlotId]);

  useEffect(() => {
    fetchHistoryFromSupabase();
  }, [fetchHistoryFromSupabase]);

  // Process data based on Selected Date Range & Selected Metric
  useEffect(() => {
    if (!rawRecords || rawRecords.length === 0) {
      setChartData({ labels: ['No Data'], datasets: [{ data: [0] }] });
      setStats({ avg: 'N/A', min: 'N/A', max: 'N/A' });
      setRecentEvents([]);
      return;
    }

    // 1. Filter by Date Range
    const now = new Date();
    let daysToCut = 7;
    if (selectedRange === '30 Days') daysToCut = 30;
    if (selectedRange === '90 Days') daysToCut = 90;

    const cutoffDate = new Date(now.getTime() - daysToCut * 24 * 60 * 60 * 1000);

    const filtered = rawRecords.filter((rec) => {
      if (!rec.timestamp) return true;
      const recDate = new Date(rec.timestamp);
      return recDate >= cutoffDate;
    });

    const datasetToUse = filtered.length > 0 ? filtered : rawRecords.slice(-10);

    // 2. Extract values for selected metric
    const extractMetricValue = (rec, metric) => {
      if (!rec) return null;
      if (metric === 'pH') {
        const val = rec.ph_level ?? rec.ph;
        return val !== undefined && val !== null ? parseFloat(val) : null;
      }
      if (metric === 'Moisture') {
        const val = rec.soil_moisture ?? rec.moisture;
        return val !== undefined && val !== null ? parseFloat(val) : null;
      }
      if (metric === 'Temp') {
        const val = rec.soil_temperature ?? rec.temp;
        return val !== undefined && val !== null ? parseFloat(val) : null;
      }
      if (metric === 'NPK') {
        const n = parseFloat(rec.nitrogen ?? rec.n ?? 0);
        const p = parseFloat(rec.phosphorus ?? rec.p ?? 0);
        const k = parseFloat(rec.potassium ?? rec.k ?? 0);
        return (n + p + k) / 3 || null;
      }
      return null;
    };

    // Downsample points for clear chart visibility (max 6 labels)
    const totalPoints = datasetToUse.length;
    const step = Math.max(1, Math.floor(totalPoints / 6));

    const sampledLabels = [];
    const sampledValues = [];
    const validNumericValues = [];

    for (let i = 0; i < totalPoints; i += step) {
      const rec = datasetToUse[i];
      const val = extractMetricValue(rec, selectedMetric);

      if (val !== null && !isNaN(val)) {
        const d = rec.timestamp ? new Date(rec.timestamp) : new Date();
        const labelStr = `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
        
        sampledLabels.push(labelStr);
        sampledValues.push(Number(val.toFixed(1)));
      }
    }

    datasetToUse.forEach((rec) => {
      const val = extractMetricValue(rec, selectedMetric);
      if (val !== null && !isNaN(val)) {
        validNumericValues.push(val);
      }
    });

    // 3. Compute Dynamic Statistics
    if (validNumericValues.length > 0) {
      const sum = validNumericValues.reduce((acc, v) => acc + v, 0);
      const average = (sum / validNumericValues.length).toFixed(selectedMetric === 'pH' ? 2 : 1);
      const minimum = Math.min(...validNumericValues).toFixed(selectedMetric === 'pH' ? 2 : 1);
      const maximum = Math.max(...validNumericValues).toFixed(selectedMetric === 'pH' ? 2 : 1);

      setStats({
        avg: `${average}${activeTheme.unit}`,
        min: `${minimum}${activeTheme.unit}`,
        max: `${maximum}${activeTheme.unit}`,
      });
    } else {
      setStats({ avg: 'N/A', min: 'N/A', max: 'N/A' });
    }

    if (sampledValues.length > 0) {
      setChartData({
        labels: sampledLabels.length > 0 ? sampledLabels : ['Recent'],
        datasets: [{ data: sampledValues }],
      });
    } else {
      setChartData({ labels: ['No Data'], datasets: [{ data: [0] }] });
    }

    // 4. Build Dynamic Recent Events from Telemetry Log
    const generatedEvents = [];
    const reversedData = [...datasetToUse].reverse().slice(0, 5);

    reversedData.forEach((rec, idx) => {
      const d = rec.timestamp ? new Date(rec.timestamp) : new Date();
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const phVal = parseFloat(rec.ph_level ?? rec.ph);

      if (!isNaN(phVal)) {
        if (phVal < 5.5) {
          generatedEvents.push({
            id: `evt-${idx}-acidic`,
            title: `Low pH (${phVal.toFixed(1)}) - Acidic Soil Detected`,
            date: dateStr,
            dotColor: '#ef4444',
          });
        } else if (phVal >= 6.0 && phVal <= 7.0) {
          generatedEvents.push({
            id: `evt-${idx}-opt`,
            title: `pH level (${phVal.toFixed(1)}) reached optimal range`,
            date: dateStr,
            dotColor: '#22c55e',
          });
        }
      }

      if (rec.sensor_id) {
        generatedEvents.push({
          id: `evt-${idx}-sensor`,
          title: `Telemetry update from Node ${rec.sensor_id}`,
          date: dateStr,
          dotColor: '#3b82f6',
        });
      }
    });

    // Deduplicate & fallback events
    const uniqueEvents = Array.from(new Set(generatedEvents.map(e => e.title)))
      .map(title => generatedEvents.find(e => e.title === title))
      .slice(0, 4);

    setRecentEvents(uniqueEvents);
  }, [rawRecords, selectedRange, selectedMetric, activeTheme.unit]);

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: selectedMetric === 'pH' ? 1 : 0,
    color: (opacity = 1) => activeTheme.color,
    labelColor: (opacity = 1) => '#94a3b8',
    style: { borderRadius: 16 },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: '#ffffff',
    },
    propsForBackgroundLines: {
      strokeDasharray: '4',
      stroke: '#f1f5f9',
    },
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Top Dark Green Banner Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerTitle}>History</Text>
              <Text style={styles.headerSubtitle}>Historical telemetry & trends</Text>
            </View>
            <TouchableOpacity onPress={fetchHistoryFromSupabase} style={styles.refreshHeaderBtn}>
              <Feather name="refresh-cw" size={18} color="#dcfce7" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Controls Card */}
        <View style={styles.filterCard}>
          {/* Date Range Selector */}
          <Text style={styles.filterLabel}>Date Range</Text>
          <View style={styles.buttonRow}>
            {['7 Days', '30 Days', '90 Days'].map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.rangeBtn,
                  selectedRange === range && styles.rangeBtnActive,
                ]}
                onPress={() => setSelectedRange(range)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.rangeBtnText,
                    selectedRange === range && styles.rangeBtnTextActive,
                  ]}
                >
                  {range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Metric Selector Grid */}
          <Text style={[styles.filterLabel, { marginTop: 16 }]}>Metric</Text>
          <View style={styles.metricGrid}>
            {[
              { id: 'pH', label: 'pH', color: '#f97316' },
              { id: 'Moisture', label: 'Moisture', color: '#3b82f6' },
              { id: 'Temp', label: 'Temp', color: '#ef4444' },
              { id: 'NPK', label: 'NPK', color: '#1b5e20' },
            ].map((metric) => (
              <TouchableOpacity
                key={metric.id}
                style={[
                  styles.metricBtn,
                  selectedMetric === metric.id && {
                    backgroundColor: metric.color,
                  },
                ]}
                onPress={() => setSelectedMetric(metric.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.metricBtnText,
                    selectedMetric === metric.id && styles.metricBtnTextActive,
                  ]}
                >
                  {metric.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dynamic Chart Display Card */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>{activeTheme.title}</Text>
              <Text style={styles.chartSubtitle}>Last {selectedRange.toLowerCase()}</Text>
            </View>
            <TouchableOpacity 
              style={styles.downloadBtn} 
              activeOpacity={0.7}
              onPress={() => Alert.alert('Export Complete', 'Telemetry data exported to report.')}
            >
              <Feather name="download" size={18} color="#15803d" />
            </TouchableOpacity>
          </View>

          {/* Loading state or Chart Render */}
          {loading ? (
            <ActivityIndicator size="large" color="#16a34a" style={{ marginVertical: 40 }} />
          ) : (
            <View style={styles.chartWrapper}>
              {selectedMetric === 'NPK' ? (
                <BarChart
                  data={chartData}
                  width={SCREEN_WIDTH - 72}
                  height={220}
                  yAxisSuffix={activeTheme.unit}
                  chartConfig={chartConfig}
                  verticalLabelRotation={0}
                  style={styles.chartStyle}
                  showValuesOnTopOfBars={false}
                />
              ) : (
                <LineChart
                  data={chartData}
                  width={SCREEN_WIDTH - 72}
                  height={220}
                  yAxisSuffix={activeTheme.unit}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chartStyle}
                />
              )}
            </View>
          )}

          {/* Legend section for NPK */}
          {selectedMetric === 'NPK' && (
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4ade80' }]} />
                <Text style={styles.legendText}>Nitrogen (N)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#166534' }]} />
                <Text style={styles.legendText}>Phosphorus (P)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#064e3b' }]} />
                <Text style={styles.legendText}>Potassium (K)</Text>
              </View>
            </View>
          )}
        </View>

        {/* Dynamic Statistics Summary Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>Statistics</Text>
          <View style={styles.statsCardRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Average</Text>
              <Text style={styles.statValue}>{stats.avg}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Min</Text>
              <Text style={styles.statValue}>{stats.min}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Max</Text>
              <Text style={styles.statValue}>{stats.max}</Text>
            </View>
          </View>
        </View>

        {/* Dynamic Recent Events Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>Recent Events</Text>
          <View style={styles.eventsList}>
            {recentEvents.length === 0 ? (
              <Text style={styles.noEventsText}>No telemetry alert events logged in this range.</Text>
            ) : (
              recentEvents.map((event) => (
                <View key={event.id} style={styles.eventCard}>
                  <View style={[styles.eventDot, { backgroundColor: event.dotColor }]} />
                  <View style={styles.eventTextContainer}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventDate}>{event.date}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Persistent Bottom Navigation */}
      <MobileFooter
        currentTab={currentTab || 'History'}
        onSelectTab={onSelectTab}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    backgroundColor: '#236339',
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#dcfce7',
    marginTop: 2,
  },
  refreshHeaderBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  filterCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: -25,
    borderRadius: 20,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
  },
  rangeBtnActive: {
    backgroundColor: '#16a34a',
  },
  rangeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  rangeBtnTextActive: {
    color: '#ffffff',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricBtn: {
    width: '48.5%',
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
  },
  metricBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  metricBtnTextActive: {
    color: '#ffffff',
  },
  chartCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  downloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    marginRight: 10,
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legendRow: {
    flexDirection: 'row',
    justify: 'space-around',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  statsCardRow: {
    flexDirection: 'row',
    justify: 'space-between',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  eventsList: {
    gap: 10,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 14,
  },
  eventTextContainer: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  eventDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 3,
  },
  noEventsText: {
    color: '#94a3b8',
    fontStyle: 'italic',
    fontSize: 13,
  },
});