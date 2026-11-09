// screens/ExploreScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Platform,
  Image,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MobileFooter from '../components/MobileFooter';

// Supabase Direct Credentials
const SUPABASE_URL = 'https://fpisfwcphgjcvxomzpko.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cyQgbi_v02dkhswabEBWoQ_3exGPlaK';

// Add server root for mapping relative URLs from backend
const SERVER_ROOT = 'http://10.205.210.28:8000';

export default function ExploreScreen({
  user,
  plots,
  users,
  currentAdminId,
  currentAdminUsername,
  onAddPlot,
  onDeletePlot,
  onSelectPlot,
  onOpenProfile,
  currentTab,
  onSelectTab
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlotName, setNewPlotName] = useState('');
  const [newCropType, setNewCropType] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [searchText, setSearchText] = useState('');

  // Live Telemetry Map from Supabase
  const [plotLatestTelemetryMap, setPlotLatestTelemetryMap] = useState({});
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  // Custom Styled Card Alert State (Replaces Native OS Alerts)
  const [cardAlert, setCardAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info', // 'info', 'success', 'warning', 'danger'
    onConfirm: null,
    showCancel: false,
    confirmText: 'OK',
    cancelText: 'Cancel'
  });

  const showAlert = ({ title, message, type = 'info', onConfirm = null, showCancel = false, confirmText = 'OK', cancelText = 'Cancel' }) => {
    setCardAlert({
      visible: true,
      title,
      message,
      type,
      onConfirm,
      showCancel,
      confirmText,
      cancelText
    });
  };

  const closeAlert = () => {
    setCardAlert(prev => ({ ...prev, visible: false }));
  };

  const safeUsers = users || [];
  const loggedInAdmin = safeUsers.find(
    (u) =>
      (currentAdminId && String(u.id) === String(currentAdminId)) ||
      (currentAdminUsername && u.username === currentAdminUsername)
  );
  const adminEmail = loggedInAdmin?.email || user?.email || '';

  useEffect(() => {
    fetchLatestSoilTelemetry();

    // Auto-polling telemetry every 5 seconds
    const interval = setInterval(() => {
      fetchLatestSoilTelemetry();
    }, 5000);

    return () => clearInterval(interval);
  }, [plots]);

  const fetchLatestSoilTelemetry = async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/soil_records?select=*&order=timestamp.desc&limit=100`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const records = await response.json();
        if (Array.isArray(records)) {
          const telemetryMap = {};
          records.forEach((rec) => {
            const sId = rec.sensor_id;
            const pId = rec.plot_id;

            if (sId && !telemetryMap[`sensor_${sId}`]) {
              telemetryMap[`sensor_${sId}`] = rec;
            }
            if (pId && !telemetryMap[`plot_${pId}`]) {
              telemetryMap[`plot_${pId}`] = rec;
            }
          });
          setPlotLatestTelemetryMap(telemetryMap);
        }
      }
    } catch (err) {
      console.log('Error fetching telemetry for ExploreScreen:', err);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  // Filter visible plots based on user role and explicit email/account ownership
  const activeUser = user || { id: currentAdminId, username: currentAdminUsername, email: adminEmail };
  const isAdmin = activeUser?.role?.toUpperCase() === 'ADMIN' || activeUser?.is_staff;
  const activeUserIdStr = activeUser?.id ? String(activeUser.id) : null;
  const activeUsername = activeUser?.username || currentAdminUsername;

  const getAbsoluteImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('file:')) return url;
    return `${SERVER_ROOT}${url.startsWith('/') ? '' : '/'}${url}`;
  };
  const rawAvatar = user?.profile_image || user?.avatar || activeUser?.profile_image || activeUser?.avatar;
  const displayAvatar = getAbsoluteImageUrl(rawAvatar);

  const visiblePlots = (plots || []).filter(plot => {
    const plotOwnerEmail = plot?.owner_email ? String(plot.owner_email).toLowerCase().trim() : '';
    const currentAdminEmailClean = adminEmail ? String(adminEmail).toLowerCase().trim() : '';

    if (isAdmin) {
      const matchesOwnerEmail = currentAdminEmailClean && plotOwnerEmail === currentAdminEmailClean;
      const matchesAdminUser =
        (activeUserIdStr && plot.farmer && String(plot.farmer) === activeUserIdStr) ||
        (activeUsername && plot.farmer_username === activeUsername);

      return matchesOwnerEmail || matchesAdminUser;
    } else {
      const isAssignedToFarmer =
        (activeUserIdStr && plot.farmer && String(plot.farmer) === activeUserIdStr) ||
        (activeUsername && plot.farmer_username === activeUsername);

      return isAssignedToFarmer;
    }
  });

  const getDetailedPlotStatus = (plot) => {
    const hasSensor = Boolean(plot?.sensor_id && plot?.sensor_id !== "N/A");
   
    const liveRec =
      plotLatestTelemetryMap[`plot_${plot.id}`] ||
      plotLatestTelemetryMap[`sensor_${plot.sensor_id}`] ||
      (plot?.records && plot.records.length > 0 ? plot.records[0] : null);

    const ph = parseFloat(liveRec?.ph_level ?? liveRec?.ph ?? plot?.sensors?.ph);
    const moisture = parseFloat(liveRec?.soil_moisture ?? liveRec?.moisture ?? plot?.sensors?.moisture);
    const ec = parseFloat(liveRec?.ec ?? plot?.sensors?.ec);
    const n = parseFloat(liveRec?.nitrogen ?? plot?.sensors?.nitrogen);
    const p = parseFloat(liveRec?.phosphorus ?? plot?.sensors?.phosphorus);
    const k = parseFloat(liveRec?.potassium ?? plot?.sensors?.potassium);

    if (!hasSensor) {
      return { label: 'OFFLINE', color: '#64748b' };
    }

    if (isNaN(ph) && isNaN(moisture)) {
      return { label: 'SENSOR LINKED', color: '#2563eb' };
    }

    if (!isNaN(ph) && ph < 5.5) {
      return { label: 'HIGHLY ACIDIC', color: '#ef4444' };
    }
    if (!isNaN(ph) && ph > 7.5) {
      return { label: 'ALKALINE', color: '#3b82f6' };
    }
    if (!isNaN(ec) && ec < 200) {
      return { label: 'LOW NUTRIENTS', color: '#f97316' };
    }
    if ((!isNaN(n) && n < 30) || (!isNaN(p) && p < 20) || (!isNaN(k) && k < 30)) {
      return { label: 'NEEDS ATTENTION', color: '#ef4444' };
    }
    if (!isNaN(moisture) && moisture < 30) {
      return { label: 'CRITICAL', color: '#ef4444' };
    }
    if (!isNaN(moisture) && moisture < 40) {
      return { label: 'WARNING', color: '#f59e0b' };
    }

    return { label: 'OPTIMAL', color: '#22c55e' };
  };

  const filteredPlots = visiblePlots.filter(plot => {
    const searchLower = searchText.toLowerCase();
    const statusInfo = getDetailedPlotStatus(plot);
    return (
      plot.name.toLowerCase().includes(searchLower) ||
      (plot.crop || plot.crop_type || '').toLowerCase().includes(searchLower) ||
      (plot.location || '').toLowerCase().includes(searchLower) ||
      statusInfo.label.toLowerCase().includes(searchLower)
    );
  });

  const submitNewPlot = async () => {
    const plotName = newPlotName.trim();
    const cropType = newCropType.trim();
    const location = newLocation.trim();

    if (!plotName || !cropType || !location) {
      showAlert({
        title: 'Missing Information',
        message: 'Please enter the plot name, crop type, and location.',
        type: 'warning'
      });
      return;
    }

    const newPlot = {
      name: plotName,
      crop: cropType,
      crop_type: cropType,
      location: location,
      sensor_id: null,
      farmer: currentAdminId || null,
      farmer_username: currentAdminUsername || null,
      owner_email: adminEmail,
      icon: 'leaf',
      color: '#64748b',
      records: [],
      sensors: {
        moisture: 'N/A',
        temp: 'N/A',
        ph: 'N/A',
        humidity: 'N/A',
        nitrogen: 'N/A',
        phosphorus: 'N/A',
        potassium: 'N/A',
        battery: '0%',
        signal: 'No Signal',
      },
    };

    try {
      const saved = await onAddPlot(newPlot);

      if (saved) {
        setNewPlotName('');
        setNewCropType('');
        setNewLocation('');
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Submit New Plot Error:', error);
      showAlert({
        title: 'Error',
        message: 'Could not add the plot. Please try again.',
        type: 'danger'
      });
    }
  };

  const confirmDelete = (id, name) => {
    showAlert({
      title: 'Remove Plot',
      message: `Are you sure you want to remove ${name}?`,
      type: 'danger',
      showCancel: true,
      confirmText: 'Remove',
      onConfirm: () => onDeletePlot(id)
    });
  };

  const renderPlotItem = ({ item }) => {
    const status = getDetailedPlotStatus(item);
    return (
      <TouchableOpacity
        style={styles.plotCard}
        onPress={() => onSelectPlot(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconContainer, { backgroundColor: status.color + '15' }]}>
          <Ionicons name="leaf" size={24} color={status.color} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.plotName}>{item.name}</Text>
          <Text style={styles.cropType}>{item.crop || item.crop_type}</Text>
          <Text style={styles.locationText}>
            <Ionicons name="location-outline" size={12} color="#94a3b8" /> {item.location || 'No location'}
          </Text>
        </View>

        <View style={styles.rightRowContainer}>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>

          <TouchableOpacity
            style={styles.cardDeleteBtn}
            onPress={() => confirmDelete(item.id, item.name)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Farm Overview</Text>
            <Text style={styles.headerSubtitle}>Manage and monitor your farm plots</Text>
          </View>
         
          <TouchableOpacity style={styles.profileBtn} onPress={onOpenProfile} activeOpacity={0.8}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={{ width: 44, height: 44, borderRadius: 22 }} />
            ) : (
              <Ionicons name="person-circle-outline" size={28} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.controlsCardWrapper}>
        <View style={styles.controlsCard}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name, crop, location, status..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#94a3b8"
            />
            {searchText !== '' && (
              <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddForm(!showAddForm)} activeOpacity={0.8}>
            <Text style={styles.addButtonText}>
              {showAddForm ? (
                <><Ionicons name="close" size={16} color="#ffffff" /> Cancel</>
              ) : (
                <><Ionicons name="add" size={16} color="#ffffff" /> Add New Plot</>
              )}
            </Text>
          </TouchableOpacity>

          {showAddForm && (
            <View style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter Plot Name *"
                placeholderTextColor="#94a3b8"
                value={newPlotName}
                onChangeText={setNewPlotName}
              />

              <TextInput
                style={styles.input}
                placeholder="Enter Crop Type *"
                placeholderTextColor="#94a3b8"
                value={newCropType}
                onChangeText={setNewCropType}
              />

              <TextInput
                style={styles.input}
                placeholder="Enter Location *"
                placeholderTextColor="#94a3b8"
                value={newLocation}
                onChangeText={setNewLocation}
              />

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={submitNewPlot}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText}>Save Plot</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {loadingTelemetry ? (
        <ActivityIndicator size="large" color="#236339" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={filteredPlots}
          renderItem={renderPlotItem}
          keyExtractor={(item) => item.id ? String(item.id) : Math.random().toString()}
          contentContainerStyle={styles.listPadding}
          ListEmptyComponent={<Text style={styles.emptyText}>No plots found</Text>}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* CUSTOM DESIGNED CARD ALERT MODAL */}
      <Modal
        visible={cardAlert.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeAlert}
      >
        <View style={styles.cardAlertOverlay}>
          <View style={styles.cardAlertBox}>
            <View style={[
              styles.cardAlertIconBadge,
              cardAlert.type === 'danger' && { backgroundColor: '#fee2e2' },
              cardAlert.type === 'warning' && { backgroundColor: '#fef3c7' },
              cardAlert.type === 'success' && { backgroundColor: '#dcfce7' },
              cardAlert.type === 'info' && { backgroundColor: '#e0e7ff' },
            ]}>
              <Ionicons
                name={
                  cardAlert.type === 'danger' ? 'alert-circle' :
                  cardAlert.type === 'warning' ? 'warning' :
                  cardAlert.type === 'success' ? 'checkmark-circle' : 'information-circle'
                }
                size={28}
                color={
                  cardAlert.type === 'danger' ? '#ef4444' :
                  cardAlert.type === 'warning' ? '#d97706' :
                  cardAlert.type === 'success' ? '#10b981' : '#4338ca'
                }
              />
            </View>

            <Text style={styles.cardAlertTitle}>{cardAlert.title}</Text>
            <Text style={styles.cardAlertMessage}>{cardAlert.message}</Text>

            <View style={styles.cardAlertActions}>
              {cardAlert.showCancel && (
                <TouchableOpacity
                  style={styles.cardAlertCancelBtn}
                  onPress={closeAlert}
                >
                  <Text style={styles.cardAlertCancelText}>{cardAlert.cancelText}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.cardAlertConfirmBtn,
                  cardAlert.type === 'danger' && { backgroundColor: '#ef4444' },
                  cardAlert.type === 'warning' && { backgroundColor: '#d97706' },
                  !cardAlert.showCancel && { flex: 1 }
                ]}
                onPress={() => {
                  const callback = cardAlert.onConfirm;
                  closeAlert();
                  if (callback) callback();
                }}
              >
                <Text style={styles.cardAlertConfirmText}>{cardAlert.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <MobileFooter currentTab={currentTab || 'Farm'} onSelectTab={onSelectTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fdf8' },
  topHeader: {
    backgroundColor: '#236339',
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingHorizontal: 20,
    paddingBottom: 50,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#ffffff' },
  headerSubtitle: { fontSize: 13, color: '#dcfce7', marginTop: 2 },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsCardWrapper: {
    paddingHorizontal: 20,
    marginTop: -35,
    marginBottom: 5,
  },
  controlsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    height: 44,
  },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: '#0f172a' },
  clearBtn: { padding: 4 },
  addButton: {
    backgroundColor: '#236339',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  formContainer: { marginTop: 12, flexDirection: 'column', gap: 10 },
  input: {
    width: '100%',
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    color: '#0f172a',
    fontSize: 14,
  },
  saveBtn: { backgroundColor: '#15803d', padding: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  listPadding: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
  plotCard: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  iconContainer: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  textContainer: { flex: 1, marginRight: 8 },
  plotName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  cropType: { fontSize: 13, color: '#64748b', marginTop: 2 },
  locationText: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  rightRowContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#64748b', fontSize: 15 },

  // Custom Card Alert Styles
  cardAlertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  cardAlertBox: { backgroundColor: '#ffffff', borderRadius: 20, padding: 22, width: '100%', maxWidth: 340, alignItems: 'center', elevation: 5 },
  cardAlertIconBadge: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  cardAlertTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: 6 },
  cardAlertMessage: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  cardAlertActions: { flexDirection: 'row', gap: 10, width: '100%' },
  cardAlertCancelBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cardAlertCancelText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  cardAlertConfirmBtn: { flex: 1, backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cardAlertConfirmText: { fontSize: 13, fontWeight: 'bold', color: '#ffffff' }
});