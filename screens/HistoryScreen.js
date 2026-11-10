
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Alert,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import MobileFooter from '../components/MobileFooter';

const SCREEN_WIDTH = Dimensions.get('window').width;
const AXIS_WIDTH = 42;
const CHART_VIEWPORT_WIDTH = SCREEN_WIDTH - 32 - 32 - AXIS_WIDTH;

const SUPABASE_URL = 'https://fpisfwcphgjcvxomzpko.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cyQgbi_v02dkhswabEBWoQ_3exGPlaK';

export default function HistoryScreen({
  currentTab,
  onSelectTab,
  selectedPlotId,
  plots = [],
  token,
}) {
  const [selectedRange, setSelectedRange] = useState('7 Days');
  const [selectedMetric, setSelectedMetric] = useState('pH');

  const [selectedPlot, setSelectedPlot] = useState(
    selectedPlotId ? String(selectedPlotId) : ''
  );

  const [showPlotDropdown, setShowPlotDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const [rawRecords, setRawRecords] = useState([]);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });

  const [stats, setStats] = useState({
    avg: '--',
    min: '--',
    max: '--',
  });

  const [recentEvents, setRecentEvents] = useState([]);

  const metricTheme = {
    pH: {
      title: 'pH Level Trend',
      unit: '',
      color: '#f97316',
    },
    Moisture: {
      title: 'Soil Moisture (%) Trend',
      unit: '%',
      color: '#3b82f6',
    },
    Temp: {
      title: 'Temperature (°C) Trend',
      unit: '°C',
      color: '#ef4444',
    },
    NPK: {
      title: 'NPK Overall Trend',
      unit: '',
      color: '#1b5e20',
    },
  };

  const activeTheme = metricTheme[selectedMetric];

  // Only use plots provided by the authenticated user's Django response.
  const connectedPlots = useMemo(() => {
    return (Array.isArray(plots) ? plots : []).filter((plot) => {
      const sensorId = plot?.sensor_id;

      return (
        sensorId !== null &&
        sensorId !== undefined &&
        String(sensorId).trim() !== '' &&
        String(sensorId).toUpperCase() !== 'N/A'
      );
    });
  }, [plots]);

  // Keep the selected plot valid when the user's plot list changes.
  useEffect(() => {
    if (selectedPlotId !== undefined && selectedPlotId !== null) {
      const matchingPlot = connectedPlots.find(
        (plot) => String(plot.id) === String(selectedPlotId)
      );

      if (matchingPlot) {
        setSelectedPlot(String(matchingPlot.id));
        return;
      }
    }

    const currentSelectionExists = connectedPlots.some(
      (plot) => String(plot.id) === String(selectedPlot)
    );

    if (!currentSelectionExists) {
      setSelectedPlot(
        connectedPlots.length > 0 ? String(connectedPlots[0].id) : ''
      );
    }
  }, [connectedPlots, selectedPlotId]);

  const selectedPlotObject = useMemo(() => {
    return connectedPlots.find(
      (plot) => String(plot.id) === String(selectedPlot)
    ) || null;
  }, [connectedPlots, selectedPlot]);

  // Fetch records directly from Supabase using the selected plot's sensor ID.
  const fetchHistory = useCallback(async () => {
    if (!selectedPlotObject) {
      setRawRecords([]);
      setLoading(false);
      return;
    }

    const sensorId = String(selectedPlotObject.sensor_id || '').trim();

    if (!sensorId || sensorId.toUpperCase() === 'N/A') {
      setRawRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const now = new Date();

      const daysToCut =
        selectedRange === '30 Days'
          ? 30
          : selectedRange === '90 Days'
            ? 90
            : 7;

      const cutoffDate = new Date(
        now.getTime() - daysToCut * 24 * 60 * 60 * 1000
      );

      // Query only the selected sensor's readings.
      // The date range is also applied in Supabase to reduce returned data.
      const query = new URLSearchParams({
        select: '*',
        sensor_id: `eq.${sensorId}`,
        timestamp: `gte.${cutoffDate.toISOString()}`,
        order: 'timestamp.asc',
        limit: '1000',
      });

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/soil_records?${query.toString()}`,
        {
          method: 'GET',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Accept: 'application/json',
          },
        }
      );

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(
          `Supabase request failed (${response.status}): ${responseText}`
        );
      }

      const data = responseText ? JSON.parse(responseText) : [];

      if (!Array.isArray(data)) {
        throw new Error('Supabase returned an unexpected response.');
      }

      // Make sure every returned reading belongs to the selected sensor.
      const filteredRecords = data.filter((record) => {
        if (!record?.timestamp) return false;

        return (
          String(record.sensor_id || '').trim() === sensorId
        );
      });

      setRawRecords(filteredRecords);

    } catch (error) {
      console.log('History loading error:', error);
      setRawRecords([]);

      Alert.alert(
        'History Loading Error',
        error.message || 'Unable to load sensor readings from Supabase.'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedPlotObject, selectedRange]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Process the selected plot's records based on date range and metric.
  useEffect(() => {
    const now = new Date();

    const daysToCut =
      selectedRange === '30 Days'
        ? 30
        : selectedRange === '90 Days'
          ? 90
          : 7;

    const cutoffTime =
      now.getTime() - daysToCut * 24 * 60 * 60 * 1000;

    const toNumber = (value) => {
      if (value === null || value === undefined || value === '') {
        return null;
      }

      const number = Number(value);

      return Number.isFinite(number) ? number : null;
    };

    const inRangeRecords = rawRecords
      .filter((record) => {
        if (!record?.timestamp) return false;

        const time = new Date(record.timestamp).getTime();

        return (
          Number.isFinite(time) &&
          time >= cutoffTime &&
          time <= now.getTime()
        );
      })
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() -
          new Date(b.timestamp).getTime()
      );

    const getMetricValues = (record) => {
      if (selectedMetric === 'pH') {
        const value = toNumber(record.ph_level ?? record.ph);
        return value === null ? null : [value];
      }

      if (selectedMetric === 'Moisture') {
        const value = toNumber(
          record.soil_moisture ?? record.moisture
        );

        return value === null ? null : [value];
      }

      if (selectedMetric === 'Temp') {
        const value = toNumber(
          record.soil_temperature ?? record.temp
        );

        return value === null ? null : [value];
      }

      if (selectedMetric === 'NPK') {
        const nitrogen = toNumber(record.nitrogen ?? record.n);
        const phosphorus = toNumber(record.phosphorus ?? record.p);
        const potassium = toNumber(record.potassium ?? record.k);

        return [nitrogen, phosphorus, potassium];
      }

      return null;
    };

    const validRecords = inRangeRecords
      .map((record) => ({
        record,
        values: getMetricValues(record),
      }))
      .filter(({ values }) => {
        if (!values) return false;

        if (selectedMetric === 'NPK') {
          return values.some((value) => value !== null);
        }

        return values[0] !== null;
      });

    if (validRecords.length === 0) {
      setChartData({
        labels: [],
        datasets: [],
      });

      setStats({
        avg: 'N/A',
        min: 'N/A',
        max: 'N/A',
      });

      setRecentEvents([]);
      return;
    }

    // Keep all valid data points. Only reduce the number of visible date labels.
    const pointCount = validRecords.length;
    const labelCount = Math.min(6, pointCount);

    const labelIndexes = new Set(
      Array.from({ length: labelCount }, (_, index) =>
        labelCount === 1
          ? 0
          : Math.round(
              (index * (pointCount - 1)) / (labelCount - 1)
            )
      )
    );

    const labels = validRecords.map(({ record }, index) => {
      if (!labelIndexes.has(index)) return '';

      const date = new Date(record.timestamp);

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    });

    let datasets = [];
    let statsValues = [];

    if (selectedMetric === 'NPK') {
      const nutrientSeries = [
        { color: '#4ade80', index: 0 },
        { color: '#166534', index: 1 },
        { color: '#064e3b', index: 2 },
      ];

      datasets = nutrientSeries.map((nutrient) => ({
        data: validRecords.map(({ values }) => {
          const value = values[nutrient.index];

          // Chart Kit requires numeric data points.
          // Missing nutrient readings are represented as zero in this chart.
          return value === null ? 0 : value;
        }),
        color: (opacity = 1) => {
          const hex = nutrient.color.replace('#', '');
          const red = parseInt(hex.slice(0, 2), 16);
          const green = parseInt(hex.slice(2, 4), 16);
          const blue = parseInt(hex.slice(4, 6), 16);

          return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
        },
      }));

      statsValues = validRecords.flatMap(({ values }) =>
        values.filter((value) => value !== null)
      );
    } else {
      const values = validRecords.map(({ values }) =>
        Number(values[0].toFixed(2))
      );

      datasets = [{ data: values }];
      statsValues = values;
    }

    if (statsValues.length > 0) {
      const precision = selectedMetric === 'pH' ? 2 : 1;

      const average =
        statsValues.reduce((sum, value) => sum + value, 0) /
        statsValues.length;

      setStats({
        avg: `${average.toFixed(precision)}${activeTheme.unit}`,
        min: `${Math.min(...statsValues).toFixed(precision)}${activeTheme.unit}`,
        max: `${Math.max(...statsValues).toFixed(precision)}${activeTheme.unit}`,
      });
    } else {
      setStats({
        avg: 'N/A',
        min: 'N/A',
        max: 'N/A',
      });
    }

    setChartData({
      labels,
      datasets,
    });

    // Recent events are also based only on the selected plot.
    const generatedEvents = [];

    [...inRangeRecords]
      .reverse()
      .slice(0, 10)
      .forEach((record, index) => {
        const date = new Date(record.timestamp);

        const dateStr = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        const phValue = toNumber(
          record.ph_level ?? record.ph
        );

        if (phValue !== null) {
          if (phValue < 5.5) {
            generatedEvents.push({
              id: `evt-${index}-acidic`,
              title: `Low pH (${phValue.toFixed(1)}) - Acidic Soil Detected`,
              date: dateStr,
              dotColor: '#ef4444',
            });
          } else if (phValue >= 6.0 && phValue <= 7.0) {
            generatedEvents.push({
              id: `evt-${index}-optimal`,
              title: `pH level (${phValue.toFixed(1)}) reached optimal range`,
              date: dateStr,
              dotColor: '#22c55e',
            });
          }
        }

        if (record.sensor_id || selectedPlotObject?.sensor_id) {
          generatedEvents.push({
            id: `evt-${index}-sensor`,
            title: `Telemetry update from Node ${
              record.sensor_id || selectedPlotObject.sensor_id
            }`,
            date: dateStr,
            dotColor: '#3b82f6',
          });
        }
      });

    setRecentEvents(generatedEvents.slice(0, 4));
  }, [
    rawRecords,
    selectedRange,
    selectedMetric,
    activeTheme.unit,
    selectedPlotObject,
  ]);

  // Calculate a chart width based on the number of readings.
  const chartContentWidth = Math.max(
    CHART_VIEWPORT_WIDTH,
    chartData.labels.length * 45
  );

  // Create fixed Y-axis labels outside the horizontal chart scroll.
  const allChartValues = useMemo(() => {
    return chartData.datasets.flatMap((dataset) =>
      dataset.data.filter(
        (value) => Number.isFinite(Number(value))
      )
    );
  }, [chartData]);

  const chartMin =
    allChartValues.length > 0
      ? Math.min(...allChartValues)
      : 0;

  const chartMax =
    allChartValues.length > 0
      ? Math.max(...allChartValues)
      : 10;

  const chartPadding =
    chartMax === chartMin
      ? Math.max(Math.abs(chartMax) * 0.1, 1)
      : (chartMax - chartMin) * 0.1;

  const axisMin = chartMin - chartPadding;
  const axisMax = chartMax + chartPadding;

  const yAxisLabels = Array.from({ length: 5 }, (_, index) => {
    const value =
      axisMax - ((axisMax - axisMin) * index) / 4;

    return selectedMetric === 'pH'
      ? value.toFixed(1)
      : value.toFixed(0);
  });

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: selectedMetric === 'pH' ? 2 : 1,
    color: (opacity = 1) =>
      `rgba(249, 115, 22, ${opacity})`,
    labelColor: (opacity = 1) =>
      `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#ffffff',
    },
    propsForBackgroundLines: {
      strokeDasharray: '4',
      stroke: '#e2e8f0',
    },
    fillShadowGradientOpacity: 0.15,
  };

  const handleSelectPlot = (plot) => {
    setSelectedPlot(String(plot.id));
    setShowPlotDropdown(false);
  };

  const selectedPlotName =
    selectedPlotObject?.name || 'Select a plot';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerTitle}>History</Text>
              <Text style={styles.headerSubtitle}>
                Historical telemetry & trends
              </Text>
            </View>

            <TouchableOpacity
              onPress={fetchHistory}
              style={styles.refreshHeaderBtn}
              activeOpacity={0.8}
            >
              <Feather
                name="refresh-cw"
                size={18}
                color="#dcfce7"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Controls */}
        <View style={styles.filterCard}>
          <Text style={styles.filterLabel}>Select Plot</Text>

          <TouchableOpacity
            style={styles.plotDropdown}
            onPress={() => setShowPlotDropdown(true)}
            activeOpacity={0.8}
          >
            <View style={styles.plotDropdownLeft}>
              <Feather
                name="map-pin"
                size={17}
                color="#15803d"
              />

              <Text
                style={[
                  styles.plotDropdownText,
                  !selectedPlotObject && styles.placeholderText,
                ]}
                numberOfLines={1}
              >
                {selectedPlotName}
              </Text>
            </View>

            <Feather
              name="chevron-down"
              size={20}
              color="#64748b"
            />
          </TouchableOpacity>

          {!selectedPlotObject && (
            <Text style={styles.helperText}>
              No connected plots available. Connect a sensor to a plot
              to view its history.
            </Text>
          )}

          <Text style={[styles.filterLabel, { marginTop: 16 }]}>
            Date Range
          </Text>

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
                    selectedRange === range &&
                      styles.rangeBtnTextActive,
                  ]}
                >
                  {range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.filterLabel, { marginTop: 16 }]}>
            Metric
          </Text>

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
                    selectedMetric === metric.id &&
                      styles.metricBtnTextActive,
                  ]}
                >
                  {metric.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Plot Dropdown Modal */}
        <Modal
          visible={showPlotDropdown}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPlotDropdown(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPlotDropdown(false)}
          >
            <View style={styles.dropdownModal}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>
                  Select a Plot
                </Text>

                <TouchableOpacity
                  onPress={() => setShowPlotDropdown(false)}
                >
                  <Feather
                    name="x"
                    size={22}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>

              {connectedPlots.length === 0 ? (
                <Text style={styles.emptyDropdownText}>
                  No connected plots found.
                </Text>
              ) : (
                <ScrollView
                  style={styles.dropdownList}
                  showsVerticalScrollIndicator={false}
                >
                  {connectedPlots.map((plot) => {
                    const isSelected =
                      String(plot.id) === String(selectedPlot);

                    return (
                      <TouchableOpacity
                        key={String(plot.id)}
                        style={[
                          styles.dropdownItem,
                          isSelected && styles.dropdownItemActive,
                        ]}
                        onPress={() => handleSelectPlot(plot)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.dropdownItemInfo}>
                          <Text
                            style={[
                              styles.dropdownItemName,
                              isSelected &&
                                styles.dropdownItemNameActive,
                            ]}
                          >
                            {plot.name || 'Unnamed Plot'}
                          </Text>

                          <Text style={styles.dropdownItemSensor}>
                            Sensor: {plot.sensor_id}
                          </Text>
                        </View>

                        {isSelected && (
                          <Feather
                            name="check-circle"
                            size={20}
                            color="#16a34a"
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Chart Card */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.chartTitle}>
                {activeTheme.title}
              </Text>

              <Text style={styles.chartSubtitle}>
                {selectedPlotName} • Last {selectedRange.toLowerCase()}
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#16a34a"
              style={{ marginVertical: 40 }}
            />
          ) : !selectedPlotObject ? (
            <View style={styles.emptyChart}>
              <Feather
                name="map-pin"
                size={28}
                color="#94a3b8"
              />
              <Text style={styles.noChartText}>
                Select a plot with a connected sensor to view history.
              </Text>
            </View>
          ) : chartData.datasets.length === 0 ? (
            <View style={styles.emptyChart}>
              <Feather
                name="bar-chart-2"
                size={28}
                color="#94a3b8"
              />
              <Text style={styles.noChartText}>
                No {selectedMetric} readings found for this plot in the
                last {selectedRange.toLowerCase()}.
              </Text>
            </View>
          ) : (

            <View style={styles.chartWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                nestedScrollEnabled
                style={styles.horizontalChartScroll}
                contentContainerStyle={styles.horizontalChartContent}
              >
                <LineChart
                  data={chartData}
                  width={chartContentWidth}
                  height={240}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1, index) => {
                      if (selectedMetric === 'NPK') {
                        const colors = [
                          '#4ade80',
                          '#166534',
                          '#064e3b',
                        ];

                        const hex = colors[index || 0].replace('#', '');
                        const red = parseInt(hex.slice(0, 2), 16);
                        const green = parseInt(hex.slice(2, 4), 16);
                        const blue = parseInt(hex.slice(4, 6), 16);

                        return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
                      }

                      const hex = activeTheme.color.replace('#', '');
                      const red = parseInt(hex.slice(0, 2), 16);
                      const green = parseInt(hex.slice(2, 4), 16);
                      const blue = parseInt(hex.slice(4, 6), 16);

                      return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
                    },
                  }}
                  bezier={false}
                  withDots
                  withLegend={false}
                  withVerticalLabels
                  withHorizontalLabels
                  fromZero={false}
                  segments={4}
                  formatYLabel={(value) =>
                    selectedMetric === 'pH'
                      ? Number(value).toFixed(1)
                      : Number(value).toFixed(0)
                  }
                  style={styles.chartStyle}
                />
              </ScrollView>
            </View>

          )}

          {selectedMetric === 'NPK' && (
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: '#4ade80' },
                  ]}
                />
                <Text style={styles.legendText}>Nitrogen (N)</Text>
              </View>

              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: '#166534' },
                  ]}
                />
                <Text style={styles.legendText}>Phosphorus (P)</Text>
              </View>

              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: '#064e3b' },
                  ]}
                />
                <Text style={styles.legendText}>Potassium (K)</Text>
              </View>
            </View>
          )}
        </View>

        {/* Statistics */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>
            Statistics
          </Text>

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

        {/* Recent Events */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>
            Recent Events
          </Text>

          <View style={styles.eventsList}>
            {recentEvents.length === 0 ? (
              <Text style={styles.noEventsText}>
                No telemetry alert events logged in this range.
              </Text>
            ) : (
              recentEvents.map((event) => (
                <View key={event.id} style={styles.eventCard}>
                  <View
                    style={[
                      styles.eventDot,
                      { backgroundColor: event.dotColor },
                    ]}
                  />

                  <View style={styles.eventTextContainer}>
                    <Text style={styles.eventTitle}>
                      {event.title}
                    </Text>

                    <Text style={styles.eventDate}>
                      {event.date}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
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

  plotDropdown: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  plotDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },

  plotDropdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginLeft: 10,
    flex: 1,
  },

  placeholderText: {
    color: '#94a3b8',
  },

  helperText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 7,
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
    marginLeft: 8,
  },


  chartWrapper: {
    width: '100%',
    marginTop: 8,
  },

  horizontalChartScroll: {
    width: '100%',
  },

  horizontalChartContent: {
    paddingRight: 4,
  },

  chartStyle: {
    marginVertical: 4,
    borderRadius: 16,
  },

  fixedYAxis: {
    width: AXIS_WIDTH,
    height: 205,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 5,
    paddingTop: 7,
    paddingBottom: 28,
  },

  yAxisLabel: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'right',
  },

  horizontalChartScroll: {
    flex: 1,
  },

  horizontalChartContent: {
    paddingRight: 8,
  },

  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
  },

  emptyChart: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  noChartText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
  },

  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexWrap: 'wrap',
    gap: 8,
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
    justifyContent: 'space-between',
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
    color: '#475569',
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  dropdownModal: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    maxHeight: '65%',
    elevation: 8,
  },

  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  dropdownTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  dropdownList: {
    maxHeight: 350,
  },

  dropdownItem: {
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dropdownItemActive: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
  },

  dropdownItemInfo: {
    flex: 1,
  },

  dropdownItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },

  dropdownItemNameActive: {
    color: '#15803d',
  },

  dropdownItemSensor: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },

  emptyDropdownText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
