import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, TextInput, Alert } from 'react-native';
import MobileFooter from '../components/MobileFooter';

export default function ExploreScreen({ plots, onAddPlot, onDeletePlot, onSelectPlot, onOpenProfile }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlotName, setNewPlotName] = useState('');
  const [searchText, setSearchText] = useState(''); // NEW: Search State

  // 1. FILTER LOGIC: This filters the list by Name, Crop, or Status
  const filteredPlots = plots.filter(plot => {
    const searchLower = searchText.toLowerCase();
    return (
      plot.name.toLowerCase().includes(searchLower) ||
      plot.crop.toLowerCase().includes(searchLower) ||
      plot.status.toLowerCase().includes(searchLower)
    );
  });

  const submitNewPlot = () => {
    if (newPlotName.trim() === '') return;
    const newPlot = {
      id: Math.random().toString(),
      name: newPlotName,
      crop: "New Crop",
      status: "Offline",
      icon: "🚜",
      color: "#64748b",
      sensors: { moisture: "0", temp: "0", battery: "0%", signal: "No Signal" }
    };
    onAddPlot(newPlot);
    setNewPlotName('');
    setShowAddForm(false);
  };

  const confirmDelete = (id, name) => {
    Alert.alert(
      "Remove Plot",
      `Are you sure you want to remove ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => onDeletePlot(id) }
      ]
    );
  };

  const renderPlotItem = ({ item }) => (
    <View style={styles.cardWrapper}>
      <TouchableOpacity style={styles.plotCard} onPress={() => onSelectPlot(item)}>
        <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
          <Text style={{ fontSize: 24 }}>{item.icon}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.plotName}>{item.name}</Text>
          <Text style={styles.cropType}>{item.crop}</Text>
        </View>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: item.color }]} />
          <Text style={[styles.statusText, { color: item.color }]}>{item.status}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item.id, item.name)}>
        <Text style={{ fontSize: 18 }}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Farm Overview</Text>
            <Text style={styles.headerSubtitle}>Manage your farm plots</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={onOpenProfile}>
            <Text style={{ fontSize: 20 }}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <TextInput 
            style={styles.searchInput}
            placeholder="Search by name, crop, or status (e.g. Optimal)..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#94a3b8"
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearBtn}>
              <Text style={{ color: '#64748b' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => setShowAddForm(!showAddForm)}
        >
          <Text style={styles.addButtonText}>{showAddForm ? "✕ Cancel" : "+ Add New Plot"}</Text>
        </TouchableOpacity>

        {showAddForm && (
          <View style={styles.formContainer}>
            <TextInput 
              style={styles.input}
              placeholder="Enter Plot Name"
              value={newPlotName}
              onChangeText={setNewPlotName}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={submitNewPlot}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={filteredPlots} // USE THE FILTERED LIST HERE
        renderItem={renderPlotItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No plots found matching "{searchText}"</Text>
        }
      />
      <MobileFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 25, paddingTop: 40, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1b5e20' },
  headerSubtitle: { fontSize: 14, color: '#64748b' },
  profileBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#1b5e20', justifyContent: 'center', alignItems: 'center' },
  
  // Search Styles
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15 },
  searchInput: { flex: 1, height: 45, fontSize: 14, color: '#0f172a' },
  clearBtn: { padding: 5 },

  addButton: { backgroundColor: '#1b5e20', padding: 12, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  formContainer: { marginTop: 15, flexDirection: 'row', gap: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 15, backgroundColor: '#f8fafc' },
  saveBtn: { backgroundColor: '#1e293b', padding: 12, borderRadius: 8, justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },

  listPadding: { padding: 20 },
  cardWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  plotCard: { flex: 1, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, elevation: 2 },
  deleteBtn: { padding: 15 },
  iconContainer: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  textContainer: { flex: 1 },
  plotName: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  cropType: { fontSize: 14, color: '#64748b' },
  statusBadge: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#64748b', fontSize: 16 }
});