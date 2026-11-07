// AdminScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Supabase Direct Credentials (for Telemetry Logs / Analytics)
const SUPABASE_URL = 'https://fpisfwcphgjcvxomzpko.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cyQgbi_v02dkhswabEBWoQ_3exGPlaK';

// Metric Status Threshold Helpers for Dynamic Color-Coding
const getPhStatus = (ph) => {
  if (ph === null || ph === undefined || isNaN(parseFloat(ph))) {
    return { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' };
  }
  const val = parseFloat(ph);
  if (val < 5.5 || val > 8.0) return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' };
  if (val < 6.0 || val > 7.5) return { bg: '#fef9c3', text: '#a16207', border: '#fde047' };
  return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' };
};

const getMoistureStatus = (m) => {
  if (m === null || m === undefined || isNaN(parseFloat(m))) {
    return { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' };
  }
  const val = parseFloat(m);
  if (val < 35 || val > 90) return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' };
  if (val < 50 || val > 80) return { bg: '#fef9c3', text: '#a16207', border: '#fde047' };
  return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' };
};

const getTempStatus = (t) => {
  if (t === null || t === undefined || isNaN(parseFloat(t))) {
    return { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' };
  }
  const val = parseFloat(t);
  if (val < 12 || val > 38) return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' };
  if (val < 18 || val > 32) return { bg: '#fef9c3', text: '#a16207', border: '#fde047' };
  return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' };
};

const getBatteryStatus = (b) => {
  if (b === null || b === undefined || isNaN(parseFloat(b))) {
    return { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' };
  }
  const val = parseFloat(b);
  if (val < 20) return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' };
  if (val < 50) return { bg: '#fef9c3', text: '#a16207', border: '#fde047' };
  return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' };
};

export default function AdminScreen({
  plots = [],
  users = [],
  logs = [],
  currentAdminId,
  currentAdminUsername,
  token,
  onSelectPlot,
  onOpenProfile,
  currentTab,
  onSelectTab,
  onLogout,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onAssignPlots,
  onRefreshData
}) {
  const [activeSubTab, setActiveSubTab] = useState('Overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Supabase Logs & Latest Readings State
  const [supabaseLogs, setSupabaseLogs] = useState([]);
  const [plotLatestPhMap, setPlotLatestPhMap] = useState({});
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [scopedAvailableSensors, setScopedAvailableSensors] = useState([]);

  // Folder Logs Pop-up Modal State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [activeFolderData, setActiveFolderData] = useState({ name: '', logs: [] });

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
  const safePlots = plots || [];

  const loggedInAdmin = safeUsers.find(
    (u) =>
      (currentAdminId && String(u.id) === String(currentAdminId)) ||
      (currentAdminUsername && u.username === currentAdminUsername)
  );

  const displayAdminName =
    currentAdminUsername ||
    loggedInAdmin?.username ||
    'Admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    role: 'FARMER',
    assignedPlotIds: []
  });

  // Base list of users associated with this admin
  const allAdminAssociatedUsers = safeUsers.filter((u) => {
    const isSelf = (currentAdminId && String(u.id) === String(currentAdminId)) ||
                   (currentAdminUsername && u.username === currentAdminUsername);
    const isCreatedByThisAdmin = String(u.createdByAdminId) === String(currentAdminId) ||
                                 u.createdByAdminUsername === currentAdminUsername ||
                                 String(u.owner_id) === String(currentAdminId) ||
                                 (u.owner_username && u.owner_username === currentAdminUsername);
    return isSelf || isCreatedByThisAdmin;
  });

  // PENDING USERS: Strictly inactive accounts waiting for activation
  const pendingActivationUsers = allAdminAssociatedUsers.filter((u) => {
    const isSelf = (currentAdminId && String(u.id) === String(currentAdminId)) ||
                   (currentAdminUsername && u.username === currentAdminUsername);
    const isActive = u.is_active !== undefined ? u.is_active : true;
    return !isSelf && !isActive;
  });

  // MANAGED USERS: Strictly ACTIVE accounts (plus the admin themselves)
  const adminVisibleUsers = allAdminAssociatedUsers.filter((u) => {
    const isSelf = (currentAdminId && String(u.id) === String(currentAdminId)) ||
                   (currentAdminUsername && u.username === currentAdminUsername);
    const isActive = u.is_active !== undefined ? u.is_active : true;
    return isSelf || isActive;
  });

  const adminVisiblePlots = safePlots.filter((p) => {
    const isOwnerPlot = String(p.farmer) === String(currentAdminId) ||
                        p.farmer_username === currentAdminUsername ||
                        String(p.owner_id) === String(currentAdminId) ||
                        (p.owner_username && p.owner_username === currentAdminUsername);
   
    const belongsToVisibleUser = adminVisibleUsers.some(
      (u) => (p.farmer && String(u.id) === String(p.farmer)) || u.username === p.farmer_username
    );

    return isOwnerPlot || belongsToVisibleUser;
  });

  useEffect(() => {
    fetchPlotLatestReadings();
    fetchScopedAvailableSensors();
    if (activeSubTab === 'Logs') {
      fetchSoilLogsFromSupabase();
    }
  }, [activeSubTab, plots]);

  // Account-scoped available sensors fetcher to prevent cross-account sensor leaks & flooding
  const fetchScopedAvailableSensors = async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/soil_api_farmplot?select=*`,
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
        const allPlots = await response.json();
        if (Array.isArray(allPlots)) {
          const visibleUserIds = new Set(adminVisibleUsers.map(u => String(u.id)));
          const filtered = allPlots.filter(p => {
            const isMyPlot = String(p.farmer) === String(currentAdminId) || visibleUserIds.has(String(p.farmer));
            const isUnassigned = !p.sensor_id || p.sensor_id === 'N/A';
            return isMyPlot && isUnassigned;
          });
          setScopedAvailableSensors(filtered);
        }
      }
    } catch (err) {
      console.log('Error fetching scoped available sensors:', err);
    }
  };

  const fetchPlotLatestReadings = async () => {
    try {
      const plotsRes = await fetch(`${SUPABASE_URL}/rest/v1/soil_api_farmplot?select=sensor_id`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      const plotsData = await plotsRes.json();
      
      const takenSensorIds = new Set(
        (Array.isArray(plotsData) ? plotsData : [])
          .map(p => p.sensor_id)
          .filter(sId => sId && sId !== 'N/A' && sId !== null)
      );

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
          const phMap = {};
          records.forEach((rec) => {
            const sId = rec.sensor_id;
            const pId = rec.plot_id;

            if (rec && !takenSensorIds.has(sId)) {
              if (sId && !phMap[`sensor_${sId}`]) {
                phMap[`sensor_${sId}`] = rec;
              }
              if (pId && !phMap[`plot_${pId}`]) {
                phMap[`plot_${pId}`] = rec;
              }
            }
          });
          setPlotLatestPhMap(phMap);
        }
      }
    } catch (err) {
      console.log('Error fetching plot latest pH readings:', err);
    }
  };

  const fetchSoilLogsFromSupabase = async () => {
    setLoadingLogs(true);
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
        const data = await response.json();
        setSupabaseLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.log('Error fetching soil logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleOpenFolderModal = (folderName, logsList) => {
    setActiveFolderData({ name: folderName, logs: logsList });
    setIsFolderModalOpen(true);
  };

  // FULLY FUNCTIONAL SEARCH FILTER
  const filteredUsers = adminVisibleUsers.filter(u => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const username = (u.username || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const name = (u.name || `${u.first_name || ''} ${u.last_name || ''}`).toLowerCase();
    const role = (u.role || (u.is_staff || u.is_superuser ? 'admin' : 'farmer')).toLowerCase();
    const isActive = u.is_active !== undefined ? u.is_active : true;
    const statusStr = isActive ? 'active' : 'inactive';

    return (
      username.includes(query) ||
      name.includes(query) ||
      email.includes(query) ||
      role.includes(query) ||
      statusStr.includes(query)
    );
  });

  const totalPlots = adminVisiblePlots.length;
  const sensorsAssigned = adminVisiblePlots.filter(p => p.sensor_id && p.sensor_id !== 'N/A');

  const isPlotOnline = (p) => {
    const hasSensor = Boolean(p.sensor_id && p.sensor_id !== 'N/A');
    if (!hasSensor) return false;

    const liveRecord =
      plotLatestPhMap[`plot_${p.id}`] ||
      plotLatestPhMap[`sensor_${p.sensor_id}`];

    return Boolean(liveRecord || p.status === 'Online');
  };

  const onlineSensors = adminVisiblePlots.filter(isPlotOnline);
 
  const phAlertsCount = adminVisiblePlots.filter(p => {
    const liveRec =
      plotLatestPhMap[`plot_${p.id}`] ||
      plotLatestPhMap[`sensor_${p.sensor_id}`];
    const latestPh = liveRec?.ph_level ?? liveRec?.ph ?? (p.records && p.records.length > 0 ? p.records[0].ph_level : p.sensors?.ph);
    const phVal = parseFloat(latestPh);
    return !isNaN(phVal) && phVal < 5.5;
  }).length;

  // Group Supabase Telemetry Logs by Plot Name
  const groupedLogs = supabaseLogs.reduce((acc, log) => {
    const matchedPlot = safePlots.find(
      (p) =>
        (log.plot_id && String(p.id) === String(log.plot_id)) ||
        (log.sensor_id && String(p.sensor_id) === String(log.sensor_id))
    );

    const folderName = matchedPlot
      ? matchedPlot.name
      : (log.plot_id ? `Plot ID: ${log.plot_id}` : 'Unassigned Sensors');

    if (!acc[folderName]) {
      acc[folderName] = [];
    }
    acc[folderName].push(log);
    return acc;
  }, {});

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      name: '',
      email: '',
      phone: '',
      role: 'FARMER',
      assignedPlotIds: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    const fullName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
   
    const existingAssignedPlots = adminVisiblePlots
      .filter(p => (p.farmer && String(p.farmer) === String(user.id)) || p.farmer_username === user.username)
      .map(p => String(p.id));

    setFormData({
      username: user.username || '',
      password: '',
      name: fullName || user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || (user.is_staff || user.is_superuser ? 'ADMIN' : 'FARMER'),
      assignedPlotIds: existingAssignedPlots
    });
    setIsModalOpen(true);
  };

  const togglePlotAssignment = (plotId) => {
    const targetIdStr = String(plotId);
    setFormData(prev => {
      const exists = prev.assignedPlotIds.includes(targetIdStr);
      return {
        ...prev,
        assignedPlotIds: exists
          ? prev.assignedPlotIds.filter(id => id !== targetIdStr)
          : [...prev.assignedPlotIds, targetIdStr]
      };
    });
  };

  const handleSaveUser = async () => {
    if (!formData.username.trim()) {
      showAlert({ title: 'Validation Error', message: 'Username is required.', type: 'warning' });
      return;
    }
    if (!editingUser && !formData.password.trim()) {
      showAlert({ title: 'Validation Error', message: 'Password is required for new users.', type: 'warning' });
      return;
    }
    if (editingUser) {
      if (!onUpdateUser) {
        showAlert({ title: 'Error', message: 'User update handler is not connected.', type: 'danger' });
        return;
      }
      const updated = await onUpdateUser(editingUser.id, {
        username: formData.username.trim(), name: formData.name,
        email: formData.email, phone: formData.phone, role: formData.role,
      });
      if (!updated) return;
      if (onAssignPlots) {
        const assigned = await onAssignPlots(editingUser.id, formData.assignedPlotIds);
        if (!assigned) return;
      }
      showAlert({ title: 'Success', message: 'User information updated successfully.', type: 'success' });
    } else {
      if (!onAddUser) {
        showAlert({ title: 'Error', message: 'User registration handler is not connected.', type: 'danger' });
        return;
      }
      const created = await onAddUser({
        ...formData, createdByAdminId: currentAdminId,
        createdByAdminUsername: currentAdminUsername, owner_email: loggedInAdmin?.email || '',
      });
      if (!created) return;
    }
    await onRefreshData?.();
    setIsModalOpen(false);
  };

  const handleDeleteUser = (userId) => {
    showAlert({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user from the system?',
      type: 'danger',
      showCancel: true,
      confirmText: 'Delete',
      onConfirm: async () => {
        await onDeleteUser?.(userId);
        await onRefreshData?.();
        showAlert({ title: 'Deleted', message: 'User has been successfully removed.', type: 'success' });
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#122c22" />
     
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.topRow}>
            <View style={styles.brandGroup}>
              <View style={styles.shieldBadge}>
                <Ionicons name="shield-checkmark" size={24} color="#10b981" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Admin Panel</Text>
                <Text style={styles.headerSubtitle}>
                  JJMAP · @{displayAdminName}
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.appSwitchBtn}
                onPress={() => onSelectTab?.('Explore')}
                accessibilityRole="button"
                accessibilityLabel="Switch to Farmer App"
              >
                <Text style={styles.appSwitchText}>Farmer App</Text>
              </TouchableOpacity>
             
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={onLogout}
                accessibilityRole="button"
                accessibilityLabel="Log out"
              >
                <Ionicons name="log-out-outline" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Navigation Sub-Tabs */}
          <View style={styles.subTabRow}>
            {['Overview', 'Users', 'Logs'].map((tab) => {
              const isActive = activeSubTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.subTabItem, isActive && styles.subTabActive]}
                  onPress={() => setActiveSubTab(tab)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                    {tab === 'Users' && pendingActivationUsers.length > 0
                      ? `Users (${pendingActivationUsers.length} Pending)`
                      : tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* OVERVIEW SUB-TAB */}
        {activeSubTab === 'Overview' && (
          <>
            <View style={styles.metricRow}>
              <View style={styles.metricCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardLabel}>TOTAL PLOTS</Text>
                </View>
                <Text style={styles.cardValue}>{totalPlots}</Text>
                <Text style={styles.cardSubtext}>farm areas</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardLabel}>ONLINE SENSORS</Text>
                </View>
                <Text style={styles.cardValue}>{onlineSensors.length}/{sensorsAssigned.length}</Text>
                <Text style={styles.cardSubtext}>IoT active</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardLabel}>PH ALERTS</Text>
                </View>
                <Text style={styles.cardValue}>{phAlertsCount}</Text>
                <Text style={styles.cardSubtext}>acidic zones</Text>
              </View>
            </View>

            {/* Plot Overview Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeaderRow}>
                <Text style={styles.sectionTitle}>Plot Overview</Text>
                <TouchableOpacity
                  style={styles.refreshOverviewBtn}
                  onPress={() => {
                    fetchPlotLatestReadings();
                    fetchScopedAvailableSensors();
                    if (onRefreshData) onRefreshData();
                  }}
                >
                  <Ionicons name="refresh" size={14} color="#15803d" style={{ marginRight: 4 }} />
                  <Text style={styles.refreshOverviewText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {adminVisiblePlots.length === 0 ? (
                <Text style={styles.emptyText}>No farm plots available.</Text>
              ) : (
                adminVisiblePlots.map((plot) => {
                  const online = isPlotOnline(plot);

                  return (
                    <TouchableOpacity
                      key={plot.id}
                      style={styles.plotRow}
                      onPress={() => onSelectPlot?.(plot)}
                    >
                      <View style={styles.plotLeft}>
                        <Ionicons name="leaf-outline" size={20} color="#10b981" style={styles.cropIcon} />
                        <View>
                          <Text style={styles.plotTitle}>{plot.name}</Text>
                          <Text style={styles.plotSubtitle}>{plot.crop_type || plot.crop || 'Crop N/A'}</Text>
                        </View>
                      </View>

                      <View style={styles.plotRight}>
                        <View style={[styles.statusBadge, { backgroundColor: online ? '#dcfce7' : '#f1f5f9' }]}>
                          <View style={[styles.statusDot, { backgroundColor: online ? '#10b981' : '#94a3b8' }]} />
                          <Text style={[styles.statusBadgeText, { color: online ? '#15803d' : '#64748b' }]}>
                            {online ? 'ONLINE' : 'OFFLINE'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </>
        )}

        {/* USERS SUB-TAB */}
        {activeSubTab === 'Users' && (
          <View style={styles.usersSection}>
            {/* PENDING APPROVALS SECTION */}
            {pendingActivationUsers.length > 0 && (
              <View style={styles.pendingSectionCard}>
                <View style={styles.pendingHeaderRow}>
                  <Ionicons name="time-outline" size={20} color="#d97706" />
                  <Text style={styles.pendingHeaderTitle}>Pending Account Approvals ({pendingActivationUsers.length})</Text>
                </View>
                <Text style={styles.pendingSubText}>
                  Farmers registered under your account waiting for in-app approval:
                </Text>

                {pendingActivationUsers.map((pendingUser) => {
                  const pName = pendingUser.name || `${pendingUser.first_name || ''} ${pendingUser.last_name || ''}`.trim() || pendingUser.username;
                  return (
                    <View key={pendingUser.id} style={styles.pendingUserItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pendingUserName}>{pName} (@{pendingUser.username})</Text>
                        <Text style={styles.pendingUserEmail}>{pendingUser.email}</Text>
                      </View>
                     
                      {/* Action Buttons: Approve & Reject */}
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.approveBtn}
                          onPress={async () => {
                            const updated = await onUpdateUser?.(pendingUser.id, { is_active: true });
                            if (updated) {
                              showAlert({
                                title: 'Approved',
                                message: `User @${pendingUser.username} has been approved and activated successfully!`,
                                type: 'success'
                              });
                              await onRefreshData?.();
                            }
                          }}
                        >
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() => {
                            showAlert({
                              title: 'Reject Account',
                              message: `Are you sure you want to reject and delete pending account @${pendingUser.username}?`,
                              type: 'danger',
                              showCancel: true,
                              confirmText: 'Reject & Delete',
                              onConfirm: async () => {
                                const deleted = await onDeleteUser?.(pendingUser.id);
                                if (deleted !== false) {
                                  showAlert({
                                    title: 'Account Rejected',
                                    message: `Account @${pendingUser.username} has been rejected and removed.`,
                                    type: 'success'
                                  });
                                  await onRefreshData?.();
                                }
                              }
                            });
                          }}
                        >
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.usersHeaderRow}>
              <Text style={styles.registeredCountText}>Manage Users</Text>
              <TouchableOpacity style={styles.addUserBtn} onPress={handleOpenAddModal}>
                <Text style={styles.addUserBtnText}>+ Add User</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users (e.g., admin, farmer, active)..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {filteredUsers.length === 0 ? (
              <Text style={styles.emptyText}>No users found matching your search criteria.</Text>
            ) : (
              filteredUsers.map((user, idx) => {
                const displayName = user.name ||
                  (user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : user.username);
               
                const role = user.role || (user.is_staff || user.is_superuser ? 'ADMIN' : 'FARMER');
               
                const isCurrentAdmin =
                  (currentAdminId && String(user.id) === String(currentAdminId)) ||
                  (currentAdminUsername && user.username === currentAdminUsername);
               
                const isActive = user.is_active !== undefined ? user.is_active : true;

                const userPlots = adminVisiblePlots.filter(
                  p => (p.farmer && String(p.farmer) === String(user.id)) || p.farmer_username === user.username
                );

                return (
                  <View key={user.id || user.username || idx} style={styles.userCard}>
                    <View style={styles.userCardHeader}>
                      <View style={styles.userAvatarCircle}>
                        <Ionicons
                          name={role === 'ADMIN' ? 'shield-checkmark' : 'person'}
                          size={18}
                          color={role === 'ADMIN' ? '#4338ca' : '#15803d'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.userNameRow}>
                          <Text style={styles.userName}>{displayName}</Text>
                          {isCurrentAdmin && (
                            <View style={styles.youBadge}>
                              <Text style={styles.youText}>YOU</Text>
                            </View>
                          )}
                          <View style={[styles.roleBadge, { backgroundColor: role === 'ADMIN' ? '#e0e7ff' : '#dcfce7' }]}>
                            <Text style={[styles.roleBadgeText, { color: role === 'ADMIN' ? '#4338ca' : '#15803d' }]}>
                              {role}
                            </Text>
                          </View>
                          <View style={[styles.statusBadgeGreen, !isActive && { backgroundColor: '#fee2e2' }]}>
                            <Text style={[styles.statusBadgeGreenText, !isActive && { color: '#dc2626' }]}>
                              {isActive ? 'Active' : 'Inactive'}
                            </Text>
                          </View>
                        </View>
                        {user.username && (
                          <Text style={styles.userDetailText}>
                            <Ionicons name="person-outline" size={12} /> @{user.username}
                          </Text>
                        )}
                        {user.email ? <Text style={styles.userEmail}>{user.email}</Text> : null}
                        {user.phone ? (
                          <Text style={styles.userDetailText}>
                            <Ionicons name="call-outline" size={12} /> {user.phone}
                          </Text>
                        ) : null}
                       
                        <View style={styles.assignedPlotsContainer}>
                          <Text style={styles.assignedPlotsLabel}>Assigned Plots ({userPlots.length}):</Text>
                          {userPlots.length === 0 ? (
                            <Text style={styles.noPlotsText}>None assigned</Text>
                          ) : (
                            <View style={styles.plotTagRow}>
                              {userPlots.map(p => (
                                <View key={p.id} style={styles.plotTag}>
                                  <Text style={styles.plotTagText}>{p.name}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>

                      {!isCurrentAdmin && (
                        <TouchableOpacity onPress={() => handleOpenEditModal(user)} style={styles.editBtn}>
                          <Ionicons name="pencil" size={18} color="#64748b" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {!isCurrentAdmin && (
                      <View style={styles.userCardActions}>
                        <TouchableOpacity
                          style={styles.deactivateBtn}
                          onPress={async () => {
                            const newActiveState = !isActive;
                            const updated = await onUpdateUser?.(user.id, { is_active: newActiveState });
                            if (updated) await onRefreshData?.();
                          }}
                        >
                          <Text style={styles.deactivateText}>
                            <Ionicons name="person-outline" size={14} /> {isActive ? 'Deactivate' : 'Activate'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.roleToggleBtn}
                          onPress={async () => {
                            const newStaffState = role !== 'ADMIN';
                            const updated = await onUpdateUser?.(user.id, { is_staff: newStaffState });
                            if (updated) await onRefreshData?.();
                          }}
                        >
                          <Text style={styles.roleToggleText}>
                            <Ionicons name="shield-checkmark" size={14} /> Switch to {role === 'ADMIN' ? 'Farmer' : 'Admin'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deleteUserBtn}
                          onPress={() => handleDeleteUser(user.id)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* LOGS SUB-TAB PLOT FOLDERS */}
        {activeSubTab === 'Logs' && (
          <View style={styles.usersSection}>
            <View style={styles.usersHeaderRow}>
              <Text style={styles.registeredCountText}>Sensor Telemetry Logs</Text>
              <TouchableOpacity style={styles.addUserBtn} onPress={fetchSoilLogsFromSupabase}>
                <Ionicons name="refresh" size={12} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.addUserBtnText}>Refresh Logs</Text>
              </TouchableOpacity>
            </View>

            {loadingLogs ? (
              <ActivityIndicator size="large" color="#10b981" style={{ marginVertical: 30 }} />
            ) : Object.keys(groupedLogs).length === 0 ? (
              <Text style={styles.emptyText}>No sensor telemetry logs recorded yet in soil_records.</Text>
            ) : (
              Object.keys(groupedLogs).map((plotFolderName) => {
                const logsInFolder = groupedLogs[plotFolderName] || [];

                return (
                  <TouchableOpacity
                    key={plotFolderName}
                    style={styles.folderCard}
                    onPress={() => handleOpenFolderModal(plotFolderName, logsInFolder)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.folderHeaderLeft}>
                      <View style={styles.folderIconBadge}>
                        <Ionicons name="folder" size={24} color="#10b981" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.folderTitleText}>{plotFolderName}</Text>
                        <Text style={styles.folderSubtext}>{logsInFolder.length} Telemetry Records</Text>
                      </View>
                    </View>
                    <View style={styles.openFolderAction}>
                      <Text style={styles.openFolderText}>View Logs</Text>
                      <Ionicons name="chevron-forward" size={16} color="#10b981" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

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

      {/* POP-UP MODAL: PLOT TELEMETRY LOGS */}
      <Modal
        visible={isFolderModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsFolderModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.folderModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="folder-open" size={24} color="#10b981" />
                <Text style={styles.modalTitle}>{activeFolderData.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsFolderModalOpen(false)}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
              {activeFolderData.logs.length === 0 ? (
                <Text style={styles.emptyText}>No logs found in this folder.</Text>
              ) : (
                activeFolderData.logs.map((log, index) => {
                  const logTime = log.timestamp
                    ? new Date(log.timestamp).toLocaleString()
                    : 'Recent';

                  const phVal = log.ph_level ?? log.ph;
                  const moistVal = log.soil_moisture ?? log.moisture;
                  const tempVal = log.soil_temperature ?? log.temp;
                  const battVal = log.battery_percentage ?? log.battery;

                  const phSt = getPhStatus(phVal);
                  const moistSt = getMoistureStatus(moistVal);
                  const tempSt = getTempStatus(tempVal);
                  const battSt = getBatteryStatus(battVal);

                  return (
                    <View key={log.id || index} style={styles.logSubCard}>
                      <View style={styles.userCardHeader}>
                        <View style={[styles.userAvatarCircle, { backgroundColor: '#ecfdf5' }]}>
                          <Ionicons name="pulse" size={18} color="#10b981" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.userName}>Node ID: {log.sensor_id || 'N/A'}</Text>

                          <View style={styles.plotTagRow}>
                            <View style={[styles.plotTag, { backgroundColor: phSt.bg, borderColor: phSt.border }]}>
                              <Text style={[styles.plotTagText, { color: phSt.text }]}>
                                pH: {phVal ?? 'N/A'}
                              </Text>
                            </View>

                            <View style={[styles.plotTag, { backgroundColor: moistSt.bg, borderColor: moistSt.border }]}>
                              <Text style={[styles.plotTagText, { color: moistSt.text }]}>
                                Moisture: {moistVal !== undefined && moistVal !== null ? `${moistVal}%` : 'N/A'}
                              </Text>
                            </View>

                            <View style={[styles.plotTag, { backgroundColor: tempSt.bg, borderColor: tempSt.border }]}>
                              <Text style={[styles.plotTagText, { color: tempSt.text }]}>
                                Temp: {tempVal !== undefined && tempVal !== null ? `${tempVal}°C` : 'N/A'}
                              </Text>
                            </View>

                            <View style={[styles.plotTag, { backgroundColor: battSt.bg, borderColor: battSt.border }]}>
                              <Text style={[styles.plotTagText, { color: battSt.text }]}>
                                Battery: {battVal !== undefined && battVal !== null ? `${battVal}%` : 'N/A'}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.logTimeBottomRight}>{logTime}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSaveBtn, { marginTop: 16, alignSelf: 'stretch', alignItems: 'center' }]}
              onPress={() => setIsFolderModalOpen(false)}
            >
              <Text style={styles.modalSaveText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add / Edit User Modal */}
      <Modal visible={isModalOpen} transparent animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingUser ? 'Edit User' : 'Add New User'}</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Username *"
                placeholderTextColor="#94a3b8"
                value={formData.username}
                onChangeText={(txt) => setFormData({ ...formData, username: txt })}
              />

              {!editingUser && (
                <TextInput
                  style={styles.modalInput}
                  placeholder="Password *"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={true}
                  value={formData.password}
                  onChangeText={(txt) => setFormData({ ...formData, password: txt })}
                />
              )}

              <TextInput
                style={styles.modalInput}
                placeholder="Full Name"
                placeholderTextColor="#94a3b8"
                value={formData.name}
                onChangeText={(txt) => setFormData({ ...formData, name: txt })}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Email"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(txt) => setFormData({ ...formData, email: txt })}
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Phone Number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(txt) => setFormData({ ...formData, phone: txt })}
              />

              {editingUser && (
                <>
                  <Text style={styles.modalSectionLabel}>Assign Existing Plots:</Text>
                  {adminVisiblePlots.length === 0 ? (
                    <Text style={styles.emptyText}>No existing plots available to assign.</Text>
                  ) : (
                    <View style={styles.plotChecklist}>
                      {adminVisiblePlots.map((plot) => {
                        const isSelected = formData.assignedPlotIds.includes(String(plot.id));
                        return (
                          <TouchableOpacity
                            key={plot.id}
                            style={[styles.plotCheckItem, isSelected && styles.plotCheckItemSelected]}
                            onPress={() => togglePlotAssignment(plot.id)}
                          >
                            <Ionicons
                              name={isSelected ? 'checkbox-outline' : 'square-outline'}
                              size={20}
                              color={isSelected ? '#10b981' : '#94a3b8'}
                              style={styles.plotCheckIcon}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.plotCheckTitle}>{plot.name}</Text>
                              <Text style={styles.plotCheckSub}>{plot.crop_type || plot.crop || 'Crop N/A'}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsModalOpen(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveUser}>
                  <Text style={styles.modalSaveText}>Save User</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingBottom: 40 },
  headerContainer: { backgroundColor: '#122c22', paddingHorizontal: 20, paddingTop: 30, paddingBottom: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shieldBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1f4233', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
  headerSubtitle: { fontSize: 12, color: '#a7f3d0' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appSwitchBtn: { backgroundColor: '#1f4233', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  appSwitchText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ef444422', justifyContent: 'center', alignItems: 'center' },

  subTabRow: { flexDirection: 'row', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: '#1f4233', marginTop: 5 },
  subTabItem: { paddingVertical: 10, paddingHorizontal: 12 },
  subTabActive: { borderBottomWidth: 2, borderBottomColor: '#10b981' },
  subTabText: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  subTabTextActive: { color: '#10b981', fontWeight: 'bold' },

  usersSection: { padding: 16 },
  usersHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  registeredCountText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  addUserBtn: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center' },
  addUserBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16, height: 42 },
  searchIcon: { marginRight: 8, fontSize: 14 },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a' },

  pendingSectionCard: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 16, padding: 14, marginBottom: 16 },
  pendingHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  pendingHeaderTitle: { fontSize: 14, fontWeight: 'bold', color: '#b45309' },
  pendingSubText: { fontSize: 12, color: '#78350f', marginBottom: 10 },
  pendingUserItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#fef3c7' },
  pendingUserName: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  pendingUserEmail: { fontSize: 11, color: '#64748b' },
  approveBtn: { backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  approveBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  rejectBtn: { backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  rejectBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },

  userCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 12, elevation: 1, borderWidth: 1, borderColor: '#f1f5f9' },
  userCardHeader: { flexDirection: 'row', gap: 12 },
  userAvatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  userName: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
  youBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  youText: { fontSize: 9, fontWeight: 'bold', color: '#4338ca' },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  roleBadgeText: { fontSize: 9, fontWeight: 'bold' },
  statusBadgeGreen: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusBadgeGreenText: { fontSize: 9, fontWeight: 'bold', color: '#15803d' },
  userEmail: { fontSize: 12, color: '#64748b', marginTop: 2, marginBottom: 2 },
  userDetailText: { fontSize: 11, color: '#64748b', marginTop: 1 },
  editBtn: { padding: 4 },

  assignedPlotsContainer: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  assignedPlotsLabel: { fontSize: 11, fontWeight: 'bold', color: '#475569' },
  noPlotsText: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' },
  plotTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  plotTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  plotTagText: { fontSize: 10, fontWeight: '600' },

  userCardActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f8fafc' },
  deactivateBtn: { backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flex: 1, alignItems: 'center' },
  deactivateText: { fontSize: 11, color: '#c2410c', fontWeight: '600' },
  roleToggleBtn: { backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flex: 1, alignItems: 'center' },
  roleToggleText: { fontSize: 11, color: '#6366f1', fontWeight: '600' },
  deleteUserBtn: { backgroundColor: '#fef2f2', padding: 6, borderRadius: 8 },

  metricRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 16, gap: 8 },
  metricCard: { flex: 1, backgroundColor: '#ffffff', padding: 12, borderRadius: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardLabel: { fontSize: 9, fontWeight: 'bold', color: '#64748b' },
  cardValue: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  cardSubtext: { fontSize: 10, color: '#94a3b8', marginTop: 2 },

  sectionCard: { backgroundColor: '#ffffff', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, elevation: 2 },
  sectionCardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  refreshOverviewBtn: { flexDirection: 'row', alignItems: 'center' },
  refreshOverviewText: { fontSize: 13, color: '#10b981', fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  emptyText: { color: '#94a3b8', fontStyle: 'italic', fontSize: 12 },

  plotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  plotLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cropIcon: { fontSize: 24 },
  plotTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  plotSubtitle: { fontSize: 12, color: '#64748b' },
  plotRight: { alignItems: 'flex-end' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },

  folderCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  folderHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  folderIconBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#ecfdf5', justifyContent: 'center', alignItems: 'center' },
  folderTitleText: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
  folderSubtext: { fontSize: 11, color: '#64748b', marginTop: 2 },
  openFolderAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  openFolderText: { fontSize: 12, color: '#10b981', fontWeight: 'bold' },

  folderModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  closeModalBtn: { padding: 4 },
  logSubCard: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  logTimeBottomRight: { fontSize: 10, color: '#64748b', alignSelf: 'flex-end', marginTop: 6, fontStyle: 'italic' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  modalSectionLabel: { fontSize: 13, fontWeight: 'bold', color: '#334155', marginTop: 8, marginBottom: 6 },
  modalInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, marginBottom: 10, color: '#0f172a' },

  plotChecklist: { marginBottom: 12, maxHeight: 150 },
  plotCheckItem: { flexDirection: 'row', alignItems: 'center', padding: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginBottom: 6, backgroundColor: '#f8fafc' },
  plotCheckItemSelected: { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
  plotCheckIcon: { marginRight: 8, fontSize: 14 },
  plotCheckTitle: { fontSize: 12, fontWeight: 'bold', color: '#0f172a' },
  plotCheckSub: { fontSize: 10, color: '#64748b' },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  modalCancelBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#f1f5f9' },
  modalCancelText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  modalSaveBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#10b981' },
  modalSaveText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },

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