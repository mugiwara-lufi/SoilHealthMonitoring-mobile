import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MonitorCard({ label, value, unit, targetRange, icon }) {
  // Helper to determine status and colors dynamically
  const getCardStatus = () => {
    if (value === undefined || value === null || value === 'N/A' || value === '') {
      return { label: 'Offline', color: '#64748b' };
    }

    const numericValue = parseFloat(String(value).replace(/[^0-9.]/g, ''));

    if (isNaN(numericValue)) {
      return { label: 'Offline', color: '#64748b' };
    }

    // Moisture-based evaluation
    if (label.toLowerCase().includes('moisture')) {
      if (numericValue < 30) return { label: 'Critical', color: '#ef4444' };
      if (numericValue < 40) return { label: 'Warning', color: '#f59e0b' };
      return { label: 'Optimal', color: '#22c55e' };
    }

    // Temperature-based evaluation
    if (label.toLowerCase().includes('temp')) {
      if (numericValue < 18 || numericValue > 35) return { label: 'Critical', color: '#ef4444' };
      if (numericValue < 22 || numericValue > 30) return { label: 'Warning', color: '#f59e0b' };
      return { label: 'Optimal', color: '#22c55e' };
    }

    // pH-based evaluation
    if (label.toLowerCase().includes('ph')) {
      if (numericValue < 5.5 || numericValue > 8.0) return { label: 'Critical', color: '#ef4444' };
      if (numericValue < 6.0 || numericValue > 7.5) return { label: 'Warning', color: '#f59e0b' };
      return { label: 'Optimal', color: '#22c55e' };
    }

    return { label: 'Optimal', color: '#22c55e' };
  };

  const status = getCardStatus();

  return (
    <View style={[styles.card, { borderLeftColor: status.color }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={[styles.badge, { backgroundColor: status.color }]}>
          <Text style={styles.badgeText}>{status.label}</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueContainer}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <View style={styles.divider} />
      <Text style={styles.rangeText}>
        Target Range: <Text style={styles.bold}>{targetRange}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 15, borderLeftWidth: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  icon: { fontSize: 20 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  label: { color: '#666', fontSize: 16, marginBottom: 10 },
  valueContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  value: { fontSize: 48, fontWeight: 'bold', color: '#000' },
  unit: { fontSize: 20, color: '#666', marginLeft: 4 },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 10 },
  rangeText: { fontSize: 14, color: '#444' },
  bold: { fontWeight: 'bold' }
});