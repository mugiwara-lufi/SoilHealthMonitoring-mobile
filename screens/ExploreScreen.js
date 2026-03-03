import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView 
} from 'react-native';
import MobileFooter from '../components/MobileFooter';
import { FARM_DATA } from '../data/mockData';

export default function ExploreScreen({ onSelectPlot }) {
  // Logic for the list items
  const renderPlotItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.plotCard} 
      onPress={() => onSelectPlot(item)} // This triggers the screen switch
    >
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
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Farm Overview</Text>
        <Text style={styles.headerSubtitle}>Select a plot to view live data</Text>
      </View>

      <FlatList
        data={FARM_DATA.plots}
        renderItem={renderPlotItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listPadding}
      />

      <MobileFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    padding: 25,
    paddingTop: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 10,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1b5e20' },
  headerSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  listPadding: { padding: 20 },
  plotCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  textContainer: { flex: 1 },
  plotName: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  cropType: { fontSize: 14, color: '#64748b', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
});