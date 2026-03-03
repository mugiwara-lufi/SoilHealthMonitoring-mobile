import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MobileFooter() {
  return (
    <View style={styles.footerContainer}>
      <View style={styles.logoRow}>
        <Text style={styles.emoji}>🌱</Text>
        <Text style={styles.footerBrand}>Soil Health Monitor v1.0</Text>
      </View>
      <Text style={styles.syncText}>Last Sync: {new Date().toLocaleTimeString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: { paddingVertical: 20, alignItems: 'center', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  emoji: { fontSize: 16, marginRight: 6 },
  footerBrand: { fontSize: 16, fontWeight: 'bold', color: '#1b5e20' },
  syncText: { fontSize: 12, color: '#94a3b8' },
});