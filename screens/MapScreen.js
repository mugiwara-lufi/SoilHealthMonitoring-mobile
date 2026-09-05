import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MobileFooter from '../components/MobileFooter';

export default function MapScreen({ plots = [], onSelectPlot, currentTab, onSelectTab }) {
  const [viewMode, setViewMode] = useState('Schematic');

  // Helper function to map soil moisture to dynamic map colors
  const getStatusColors = (sensors) => {
    const moisture = parseFloat(sensors?.moisture || 0);
    if (moisture === 0 || isNaN(moisture)) {
      return { border: '#64748b', bg: 'rgba(203, 213, 225, 0.4)' }; // Offline / No Data
    }
    if (moisture < 30) {
      return { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.25)' }; // Critical Low
    }
    if (moisture < 40) {
      return { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.25)' }; // Warning
    }
    return { border: '#22c55e', bg: 'rgba(34, 197, 94, 0.25)' }; // Optimal
  };

  // Static screen layout positions for Plots A, B, C, D
  const layoutZones = [
    {
      name: 'Plot A',
      position: { top: 20, left: 15, width: '42%', height: 190 },
      pinPos: { top: 75, left: '42%' },
    },
    {
      name: 'Plot B',
      position: { top: 165, left: '46%', width: '30%', height: 125 },
      pinPos: { top: 60, left: '35%' },
    },
    {
      name: 'Plot C',
      position: { top: 220, left: 12, width: '43%', height: 235 },
      pinPos: { top: 150, left: '50%' },
    },
    {
      name: 'Plot D',
      position: { top: 150, left: '77%', width: '20%', height: 150 },
      pinPos: null,
    },
  ];

  // Merge live plots array with visual layout zones
  const plotGrid = layoutZones.map((zone, index) => {
    // Try to match by plot name first, or fall back to array order
    const livePlot =
      plots.find((p) => p.name?.toLowerCase() === zone.name.toLowerCase()) ||
      plots[index];

    if (livePlot) {
      const colors = getStatusColors(livePlot.sensors);
      return {
        ...livePlot,
        name: zone.name, // Keeps the Plot A, B, C, D visual title
        position: zone.position,
        pinPos: zone.pinPos,
        borderColor: colors.border,
        bgColor: colors.bg,
        statusColor: colors.border,
      };
    }

    // Default fallback if no plot exists in DB for this quadrant
    return {
      id: `fallback-${index}`,
      name: zone.name,
      crop: 'Unassigned',
      position: zone.position,
      pinPos: zone.pinPos,
      borderColor: '#64748b',
      bgColor: 'rgba(203, 213, 225, 0.4)',
      statusColor: '#64748b',
      sensors: {
        moisture: '0',
        temp: '0',
        ph: '0',
        battery: '0%',
        signal: 'Offline',
      },
    };
  });

  // Calculate live online nodes
  const activeNodesCount = plots.filter(
    (p) => p.sensors?.moisture && parseFloat(p.sensors.moisture) > 0
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Field Map</Text>
              <Text style={styles.headerSubtitle}>
                CDO Agricultural Zone · LoRa Network
              </Text>
            </View>
            <TouchableOpacity
              style={styles.schematicBtn}
              onPress={() =>
                setViewMode(viewMode === 'Schematic' ? 'Satellite' : 'Schematic')
              }
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="layers-outline"
                size={22}
                color="#ffffff"
              />
              <Text style={styles.schematicBtnText}>{viewMode} View</Text>
            </TouchableOpacity>
          </View>

          {/* Network Status Badges */}
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Feather name="wifi" size={14} color="#86efac" />
              <Text style={styles.badgeText}>
                {activeNodesCount}/{plots.length || 4} LoRa Online
              </Text>
            </View>
            <View style={styles.badge}>
              <Feather name="navigation" size={14} color="#86efac" />
              <Text style={styles.badgeText}>GPS Active</Text>
            </View>
          </View>
        </View>

        {/* Interactive Map Section */}
        <View style={styles.mapContainer}>
          {/* Coordinates Top Right & Bottom Left */}
          <Text style={styles.coordTopRight}>8.4557°N 124.6353°E</Text>
          <Text style={styles.coordBottomLeft}>8.4526°N 124.6296°E</Text>

          {/* Compass Rose Top Right */}
          <View style={styles.compassContainer}>
            <View style={styles.compassCircle}>
              <Text style={[styles.compassText, { color: '#ef4444', fontWeight: 'bold' }]}>
                N
              </Text>
              <Text style={[styles.compassText, { color: '#94a3b8' }]}>S</Text>
            </View>
          </View>

          {/* Grid Background Overlay */}
          <View style={styles.gridOverlay}>
            {[...Array(12)].map((_, i) => (
              <View key={`v-${i}`} style={styles.gridLineV} />
            ))}
            {[...Array(12)].map((_, i) => (
              <View key={`h-${i}`} style={styles.gridLineH} />
            ))}
          </View>

          {/* Sector Crosshair Lines */}
          <View style={styles.crosshairV} />
          <View style={styles.crosshairH} />

          {/* Plot Boundaries */}
          {plotGrid.map((plot) => (
            <TouchableOpacity
              key={plot.id}
              activeOpacity={0.85}
              onPress={() => onSelectPlot && onSelectPlot(plot)}
              style={[
                styles.plotBox,
                plot.position,
                {
                  borderColor: plot.borderColor,
                  backgroundColor: plot.bgColor,
                },
              ]}
            >
              <Text style={styles.plotTitle}>{plot.name}</Text>
              <Text style={styles.plotCrop}>{plot.crop}</Text>

              {/* Sensor Target Ring Pin */}
              {plot.pinPos && (
                <View style={[styles.pinWrapper, plot.pinPos]}>
                  <View
                    style={[
                      styles.pinOuter,
                      { borderColor: plot.statusColor },
                    ]}
                  >
                    <View
                      style={[
                        styles.pinInner,
                        { backgroundColor: plot.statusColor },
                      ]}
                    />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}

          {/* Scale Legend Indicator Bottom Right */}
          <View style={styles.scaleContainer}>
            <Text style={styles.scaleText}>~200m</Text>
            <View style={styles.scaleBar}>
              <View style={styles.scaleTick} />
              <View style={styles.scaleLine} />
              <View style={styles.scaleTick} />
            </View>
          </View>
        </View>

        {/* Bottom Map Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendHeaderRow}>
            <Text style={styles.legendTitle}>LEGEND</Text>
            <Text style={styles.legendSubtitle}>
              Tap a sensor pin to view readings
            </Text>
          </View>

          <View style={styles.legendItemsRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
              <Text style={styles.legendLabel}>Online</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#94a3b8' }]} />
              <Text style={styles.legendLabel}>Offline</Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.pillOutline,
                  { borderColor: '#22c55e' },
                ]}
              />
              <Text style={styles.legendLabel}>Optimal</Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.pillOutline,
                  { borderColor: '#ef4444' },
                ]}
              />
              <Text style={styles.legendLabel}>Critical</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Navigation */}
      <MobileFooter
        currentTab={currentTab || 'Map'}
        onSelectTab={onSelectTab}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#236339',
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#dcfce7',
    marginTop: 2,
  },
  schematicBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schematicBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  mapContainer: {
    height: 480,
    backgroundColor: '#eaf4eb',
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridLineV: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  crosshairV: {
    position: 'absolute',
    left: '44%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
  },
  crosshairH: {
    position: 'absolute',
    top: '44%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
  },
  coordTopRight: {
    position: 'absolute',
    top: 10,
    right: 12,
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
    zIndex: 2,
  },
  coordBottomLeft: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
    zIndex: 2,
  },
  compassContainer: {
    position: 'absolute',
    top: 26,
    right: 18,
    zIndex: 2,
  },
  compassCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  compassText: {
    fontSize: 9,
    lineHeight: 11,
  },
  plotBox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 12,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plotTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  plotCrop: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  pinWrapper: {
    position: 'absolute',
    zIndex: 10,
  },
  pinOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  pinInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scaleContainer: {
    position: 'absolute',
    bottom: 15,
    right: 20,
    alignItems: 'center',
  },
  scaleText: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 2,
  },
  scaleBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scaleLine: {
    width: 50,
    height: 2,
    backgroundColor: '#64748b',
  },
  scaleTick: {
    width: 2,
    height: 8,
    backgroundColor: '#64748b',
  },
  legendContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  legendHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 0.6,
  },
  legendSubtitle: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '500',
  },
  legendItemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  pillOutline: {
    width: 18,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
});