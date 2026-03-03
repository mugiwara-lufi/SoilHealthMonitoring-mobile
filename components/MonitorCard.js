import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MonitorCard({ label, value, unit, targetRange, icon }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>Optimal</Text></View>
      </View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueContainer}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <View style={styles.divider} />
      <Text style={styles.rangeText}>Target Range: <Text style={styles.bold}>{targetRange}</Text></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 15, borderLeftWidth: 8, borderLeftColor: '#00c853', elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  icon: { fontSize: 20 },
  badge: { backgroundColor: '#00c853', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  label: { color: '#666', fontSize: 16, marginBottom: 10 },
  valueContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  value: { fontSize: 48, fontWeight: 'bold', color: '#000' },
  unit: { fontSize: 20, color: '#666', marginLeft: 4 },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 10 },
  rangeText: { fontSize: 14, color: '#444' },
  bold: { fontWeight: 'bold' }
});