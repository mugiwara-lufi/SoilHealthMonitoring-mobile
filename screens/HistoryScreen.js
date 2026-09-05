import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import MobileFooter from '../components/MobileFooter';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function HistoryScreen({ currentTab, onSelectTab }) {
  const [selectedRange, setSelectedRange] = useState('7 Days');
  const [selectedMetric, setSelectedMetric] = useState('pH'); // 'pH', 'Moisture', 'Temp', 'NPK'

  // Metric configurations matching image styling & dynamic colors
  const metricConfig = {
    pH: {
      title: 'pH Level Trend',
      unit: '',
      color: '#f97316', // Orange
      chartData: {
        labels: ['Jan 15', 'Jan 20', 'Jan 25', 'Feb 01', 'Feb 05', 'Feb 15'],
        datasets: [{ data: [5.2, 5.4, 5.6, 5.8, 6.0, 6.5] }],
      },
      stats: { avg: '5.75', min: '5.20', max: '6.50' },
    },
    Moisture: {
      title: 'Soil Moisture (%) Trend',
      unit: '%',
      color: '#3b82f6', // Blue
      chartData: {
        labels: ['Jan 15', 'Jan 20', 'Jan 25', 'Feb 01', 'Feb 05', 'Feb 15'],
        datasets: [{ data: [58, 62, 65, 68, 70, 65] }],
      },
      stats: { avg: '64.6%', min: '58%', max: '70%' },
    },
    Temp: {
      title: 'Temperature (°C) Trend',
      unit: '°C',
      color: '#ef4444', // Red
      chartData: {
        labels: ['Jan 15', 'Jan 20', 'Jan 25', 'Feb 01', 'Feb 05', 'Feb 15'],
        datasets: [{ data: [26, 27, 28, 29, 28, 26] }],
      },
      stats: { avg: '27.3°C', min: '26°C', max: '29°C' },
    },
    NPK: {
      title: 'NPK Levels Trend',
      unit: '',
      color: '#1b5e20', // Dark Green
      chartData: {
        labels: ['Jan 15', 'Jan 25', 'Feb 05', 'Feb 15'],
        datasets: [{ data: [45, 52, 60, 68] }],
      },
      stats: { avg: '58', min: '45', max: '70' },
    },
  };

  // Recent Events list matching the UI mockup
  const recentEvents = [
    {
      id: '1',
      title: 'pH level reached optimal range',
      date: 'Feb 15, 2026',
      dotColor: '#22c55e', // Green
    },
    {
      id: '2',
      title: 'Lime treatment applied',
      date: 'Feb 10, 2026',
      dotColor: '#3b82f6', // Blue
    },
    {
      id: '3',
      title: 'Low nitrogen detected',
      date: 'Feb 05, 2026',
      dotColor: '#f97316', // Orange
    },
    {
      id: '4',
      title: 'New sensor added to Plot A',
      date: 'Feb 01, 2026',
      dotColor: '#3b82f6', // Blue
    },
  ];

  const activeMetric = metricConfig[selectedMetric];

  // Common chart style parameters
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: selectedMetric === 'pH' ? 1 : 0,
    color: (opacity = 1) => activeMetric.color,
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
          <Text style={styles.headerTitle}>History</Text>
          <Text style={styles.headerSubtitle}>Historical data & trends</Text>
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
              <Text style={styles.chartTitle}>{activeMetric.title}</Text>
              <Text style={styles.chartSubtitle}>Last {selectedRange.toLowerCase()}</Text>
            </View>
            <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.7}>
              <Feather name="download" size={18} color="#15803d" />
            </TouchableOpacity>
          </View>

          {/* Render LineChart or BarChart based on Metric selection */}
          <View style={styles.chartWrapper}>
            {selectedMetric === 'NPK' ? (
              <BarChart
                data={activeMetric.chartData}
                width={SCREEN_WIDTH - 72}
                height={220}
                yAxisSuffix={activeMetric.unit}
                chartConfig={chartConfig}
                verticalLabelRotation={0}
                style={styles.chartStyle}
                showValuesOnTopOfBars={false}
              />
            ) : (
              <LineChart
                data={activeMetric.chartData}
                width={SCREEN_WIDTH - 72}
                height={220}
                yAxisSuffix={activeMetric.unit}
                chartConfig={chartConfig}
                bezier
                style={styles.chartStyle}
              />
            )}
          </View>

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

        {/* Statistics Summary Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>Statistics</Text>
          <View style={styles.statsCardRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Average</Text>
              <Text style={styles.statValue}>{activeMetric.stats.avg}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Min</Text>
              <Text style={styles.statValue}>{activeMetric.stats.min}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Max</Text>
              <Text style={styles.statValue}>{activeMetric.stats.max}</Text>
            </View>
          </View>
        </View>

        {/* Recent Events Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>Recent Events</Text>
          <View style={styles.eventsList}>
            {recentEvents.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={[styles.eventDot, { backgroundColor: event.dotColor }]} />
                <View style={styles.eventTextContainer}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDate}>{event.date}</Text>
                </View>
              </View>
            ))}
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
    justify: 'space-between',
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
    justify: 'space-between',
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
    justify: 'center',
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
    fontSize: 20,
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
});