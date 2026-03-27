import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';

export default function ProfileScreen({ user, onLogout, onBack }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Profile</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 50 }}>👤</Text>
        </View>
        
        <Text style={styles.label}>Logged in as:</Text>
        <Text style={styles.username}>{user?.name || "Guest"}</Text>
        <Text style={styles.role}>System Administrator</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Farm ID: SHM-2026-001</Text>
          <Text style={styles.infoText}>Access Level: Full Control</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#fff' 
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backLink: { color: '#1b5e20', fontWeight: '600', marginTop: 10 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  avatar: { 
    width: 100, height: 100, borderRadius: 50, 
    backgroundColor: '#dcfce7', justifyContent: 'center', 
    alignItems: 'center', marginBottom: 20,
    borderWidth: 2, borderColor: '#1b5e20'
  },
  label: { color: '#64748b', fontSize: 14 },
  username: { fontSize: 32, fontWeight: 'bold', color: '#0f172a' },
  role: { fontSize: 16, color: '#1b5e20', marginBottom: 30 },
  infoBox: { width: '100%', backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 40 },
  infoText: { color: '#475569', marginVertical: 4 },
  logoutBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 12 },
  logoutText: { color: '#ef4444', fontWeight: 'bold' }
});