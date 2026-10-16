import React, { useState } from 'react';
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
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';

export default function AdminScreen({ 
  plots = [], 
  users = [],
  logs = [],
  currentAdminId,
  currentAdminUsername,
  onSelectPlot, 
  onOpenProfile,
  currentTab,
  onSelectTab,
  onLogout,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onRestartDevice
}) {
  const [activeSubTab, setActiveSubTab] = useState('Overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Find logged in admin object safely
  const safeUsers = users || [];
  const safePlots = plots || [];
  const safeLogs = logs || [];

  const loggedInAdmin = safeUsers.find(
    (u) => 
      (currentAdminId && u.id === currentAdminId) || 
      (currentAdminUsername && u.username === currentAdminUsername)
  );

  const displayAdminName = 
    currentAdminUsername || 
    loggedInAdmin?.username || 
    'Admin';

  // Modal State for Add/Edit User
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

  // Filter Users: ONLY show users created by THIS specific admin (plus the admin's own profile)
  const adminVisibleUsers = safeUsers.filter((u) => {
    const isSelf = (currentAdminId && u.id === currentAdminId) || 
                   (currentAdminUsername && u.username === currentAdminUsername);
    const isCreatedByThisAdmin = u.createdByAdminId === currentAdminId || 
                                 u.createdByAdminUsername === currentAdminUsername;
    return isSelf || isCreatedByThisAdmin;
  });

  // Safe search filter on the visible users list (removed farmName check)
  const filteredUsers = adminVisibleUsers.filter(u => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const username = (u.username || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const name = (u.name || `${u.first_name || ''} ${u.last_name || ''}`).toLowerCase();

    return username.includes(query) || name.includes(query) || email.includes(query);
  });

  // Dynamic calculations based on live backend plots
  const totalPlots = safePlots.length;
  const sensorsAssigned = safePlots.filter(p => p.sensor_id && p.sensor_id !== 'N/A');
  const onlineSensors = safePlots.filter(p => p.status === 'Online');
  
  const phAlertsCount = safePlots.filter(p => {
    const latestPh = p.records && p.records.length > 0 ? p.records[0].ph_level : p.sensors?.ph;
    const phVal = parseFloat(latestPh);
    return !isNaN(phVal) && phVal < 5.5;
  }).length;

  // Modal handlers
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
    
    // Find plot IDs currently assigned to this user
    const existingAssignedPlots = safePlots
      .filter(p => p.farmer === user.id || p.farmer_username === user.username)
      .map(p => p.id);

    setFormData({
      username: user.username || '',
      password: '', // Hidden/empty on edit unless updating
      name: fullName || user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || (user.is_staff || user.is_superuser ? 'ADMIN' : 'FARMER'),
      assignedPlotIds: existingAssignedPlots
    });
    setIsModalOpen(true);
  };

  const togglePlotAssignment = (plotId) => {
    setFormData(prev => {
      const exists = prev.assignedPlotIds.includes(plotId);
      return {
        ...prev,
        assignedPlotIds: exists 
          ? prev.assignedPlotIds.filter(id => id !== plotId)
          : [...prev.assignedPlotIds, plotId]
      };
    });
  };

  const handleSaveUser = () => {
    if (!formData.username.trim()) {
      Alert.alert('Validation Error', 'Username is required.');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      Alert.alert('Validation Error', 'Password is required for new users.');
      return;
    }

    if (editingUser) {
      const selectedPlots = safePlots.filter(p => formData.assignedPlotIds.includes(p.id));
      onUpdateUser?.(editingUser.id, {
        ...formData,
        assignedPlots: selectedPlots
      });
    } else {
      const newUser = {
        ...formData,
        is_active: true,
        is_staff: formData.role === 'ADMIN',
        createdByAdminId: currentAdminId,
        createdByAdminUsername: currentAdminUsername,
        assignedPlots: [] // Plots assigned only during edit phase
      };

      onAddUser?.(newUser);
    }

    setIsModalOpen(false);
  };

  const handleDeleteUser = (userId) => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to delete this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => onDeleteUser?.(userId)
        }
      ]
    );
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
                <Text style={styles.shieldIcon}>🛡️</Text>
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
                <Text style={styles.logoutIcon}>🚪</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Navigation Sub-Tabs */}
          <View style={styles.subTabRow}>
            {['Overview', 'Users', 'Devices', 'Logs'].map((tab) => {
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
                    {tab}
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
                <Text style={styles.cardSubtext}>LoRa active</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardLabel}>PH ALERTS</Text>
                </View>
                <Text style={styles.cardValue}>{phAlertsCount}</Text>
                <Text style={styles.cardSubtext}>acidic zones</Text>
              </View>
            </View>

            {/* Network Status */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>LoRa Network Status</Text>
              {safePlots.length === 0 ? (
                <Text style={styles.emptyText}>No devices connected.</Text>
              ) : (
                safePlots.map((plot, index) => (
                  <View key={plot.id || index} style={styles.networkRow}>
                    <View style={styles.networkInfo}>
                      <View style={[styles.statusDot, { backgroundColor: plot.status === 'Online' ? '#10b981' : '#64748b' }]} />
                      <Text style={styles.networkName}>
                        JJMAP({plot.sensor_id && plot.sensor_id !== 'N/A' ? plot.sensor_id : 'No Sensor'})
                      </Text>
                    </View>

                    <View style={styles.networkMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: plot.status === 'Online' ? '#dcfce7' : '#f1f5f9' }]}>
                        <Text style={[styles.statusBadgeText, { color: plot.status === 'Online' ? '#15803d' : '#64748b' }]}>
                          {plot.status === 'Online' ? 'online' : 'offline'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Plot Overview */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Plot Overview</Text>
              {safePlots.length === 0 ? (
                <Text style={styles.emptyText}>No farm plots available.</Text>
              ) : (
                safePlots.map((plot) => {
                  const latestPh = plot.records && plot.records.length > 0 
                    ? plot.records[0].ph_level 
                    : (plot.sensors?.ph ?? 'N/A');
                  const isAcidic = !isNaN(parseFloat(latestPh)) && parseFloat(latestPh) < 5.5;

                  return (
                    <TouchableOpacity 
                      key={plot.id} 
                      style={styles.plotRow}
                      onPress={() => onSelectPlot?.(plot)}
                    >
                      <View style={styles.plotLeft}>
                        <Text style={styles.cropIcon}>{plot.icon || '🌱'}</Text>
                        <View>
                          <Text style={styles.plotTitle}>{plot.name}</Text>
                          <Text style={styles.plotSubtitle}>{plot.crop_type || plot.crop || 'Crop N/A'}</Text>
                        </View>
                      </View>

                      <View style={styles.plotRight}>
                        <Text style={[
                          styles.phText, 
                          { color: isAcidic ? '#ef4444' : '#15803d' }
                        ]}>
                          pH {latestPh}
                        </Text>
                        <Text style={styles.deviceStatusText}>
                          {plot.sensor_id && plot.sensor_id !== 'N/A' 
                            ? (plot.status === 'Online' ? 'online' : 'offline') 
                            : 'no device'}
                        </Text>
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
            <View style={styles.usersHeaderRow}>
              <Text style={styles.registeredCountText}>{adminVisibleUsers.length} managed users</Text>
              <TouchableOpacity style={styles.addUserBtn} onPress={handleOpenAddModal}>
                <Text style={styles.addUserBtnText}>+ Add User</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {filteredUsers.length === 0 ? (
              <Text style={styles.emptyText}>No users created by you found.</Text>
            ) : (
              filteredUsers.map((user, idx) => {
                const displayName = user.name || 
                  (user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : user.username);
                
                const role = user.role || (user.is_staff || user.is_superuser ? 'ADMIN' : 'FARMER');
                
                const isCurrentAdmin = 
                  (currentAdminId && user.id === currentAdminId) || 
                  (currentAdminUsername && user.username === currentAdminUsername);
                
                const isActive = user.is_active !== undefined ? user.is_active : user.status !== 'Inactive';

                // Find assigned plots for this user
                const userPlots = safePlots.filter(p => p.farmer === user.id || p.farmer_username === user.username);

                return (
                  <View key={user.id || user.username || idx} style={styles.userCard}>
                    <View style={styles.userCardHeader}>
                      <View style={styles.userAvatarCircle}>
                        <Text style={{ fontSize: 18 }}>{role === 'ADMIN' ? '🛡️' : '🧑‍🌾'}</Text>
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
                        {user.username && <Text style={styles.userDetailText}>👤 @{user.username}</Text>}
                        {user.email ? <Text style={styles.userEmail}>{user.email}</Text> : null}
                        {user.phone ? <Text style={styles.userDetailText}>📞 {user.phone}</Text> : null}
                        
                        {/* Assigned Plots Preview */}
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
                          <Text style={{ fontSize: 14 }}>✏</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {!isCurrentAdmin && (
                      <View style={styles.userCardActions}>
                        <TouchableOpacity 
                          style={styles.deactivateBtn} 
                          onPress={() => onUpdateUser?.(user.id, { is_active: !isActive })}
                        >
                          <Text style={styles.deactivateText}>
                            👤 {isActive ? 'Deactivate' : 'Activate'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.roleToggleBtn} 
                          onPress={() => onUpdateUser?.(user.id, { is_staff: role !== 'ADMIN' })}
                        >
                          <Text style={styles.roleToggleText}>
                            🛡️ Switch to {role === 'ADMIN' ? 'Farmer' : 'Admin'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.deleteUserBtn} 
                          onPress={() => handleDeleteUser(user.id)}
                        >
                          <Text style={{ fontSize: 14 }}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* DEVICES SUB-TAB */}
        {activeSubTab === 'Devices' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionTitle}>Connected Hardware & IoT Nodes</Text>
            {sensorsAssigned.length === 0 ? (
              <Text style={styles.emptyText}>No registered devices or hardware assigned.</Text>
            ) : (
              sensorsAssigned.map((plot, idx) => (
                <View key={plot.sensor_id || idx} style={styles.deviceCard}>
                  <View style={styles.deviceCardHeader}>
                    <View style={styles.deviceIconCircle}>
                      <Text style={{ fontSize: 16 }}>📟</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deviceName}>
                        Node ID: {plot.sensor_id}
                      </Text>
                      <Text style={styles.deviceSub}>Assigned Plot: {plot.name}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: plot.status === 'Online' ? '#dcfce7' : '#f1f5f9' }]}>
                      <Text style={[styles.statusBadgeText, { color: plot.status === 'Online' ? '#15803d' : '#64748b' }]}>
                        {plot.status === 'Online' ? 'Online' : 'Offline'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.deviceMetaRow}>
                    <Text style={styles.deviceMetaText}>Type: LoRa Soil Node</Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.restartDeviceBtn}
                    onPress={() => {
                      Alert.alert('Restart Node', `Send restart command to node ${plot.sensor_id}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Restart', onPress: () => onRestartDevice?.(plot.sensor_id) }
                      ]);
                    }}
                  >
                    <Text style={styles.restartDeviceText}>🔄 Restart Sensor Node</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

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

              {/* Existing Plots Assignment Checklist - Visible ONLY when editing */}
              {editingUser && (
                <>
                  <Text style={styles.modalSectionLabel}>Assign Existing Plots:</Text>
                  {safePlots.length === 0 ? (
                    <Text style={styles.emptyText}>No existing plots available to assign.</Text>
                  ) : (
                    <View style={styles.plotChecklist}>
                      {safePlots.map((plot) => {
                        const isSelected = formData.assignedPlotIds.includes(plot.id);
                        return (
                          <TouchableOpacity
                            key={plot.id}
                            style={[styles.plotCheckItem, isSelected && styles.plotCheckItemSelected]}
                            onPress={() => togglePlotAssignment(plot.id)}
                          >
                            <Text style={styles.plotCheckIcon}>{isSelected ? '☑' : '⏹️'}</Text>
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
  shieldIcon: { fontSize: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
  headerSubtitle: { fontSize: 12, color: '#a7f3d0' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appSwitchBtn: { backgroundColor: '#1f4233', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  appSwitchText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ef444422', justifyContent: 'center', alignItems: 'center' },
  logoutIcon: { fontSize: 16 },

  subTabRow: { flexDirection: 'row', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: '#1f4233', marginTop: 5 },
  subTabItem: { paddingVertical: 10, paddingHorizontal: 12 },
  subTabActive: { borderBottomWidth: 2, borderBottomColor: '#10b981' },
  subTabText: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  subTabTextActive: { color: '#10b981', fontWeight: 'bold' },

  usersSection: { padding: 16 },
  usersHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  registeredCountText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  addUserBtn: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  addUserBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16, height: 42 },
  searchIcon: { marginRight: 8, fontSize: 14 },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a' },

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
  plotTag: { backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#a7f3d0' },
  plotTagText: { fontSize: 10, color: '#047857', fontWeight: '500' },

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
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  emptyText: { color: '#94a3b8', fontStyle: 'italic', fontSize: 12 },
  networkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  networkInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  networkName: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  networkMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },

  plotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  plotLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cropIcon: { fontSize: 24 },
  plotTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  plotSubtitle: { fontSize: 12, color: '#64748b' },
  plotRight: { alignItems: 'flex-end' },
  phText: { fontSize: 13, fontWeight: 'bold' },
  deviceStatusText: { fontSize: 11, color: '#94a3b8' },

  tabSection: { padding: 16 },
  deviceCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  deviceCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deviceIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  deviceName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  deviceSub: { fontSize: 12, color: '#64748b' },
  deviceMetaRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  deviceMetaText: { fontSize: 11, color: '#64748b' },
  restartDeviceBtn: { marginTop: 12, backgroundColor: '#f1f5f9', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  restartDeviceText: { fontSize: 12, fontWeight: '600', color: '#334155' },

  logCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  logType: { fontSize: 11, fontWeight: 'bold', color: '#3b82f6' },
  logTime: { fontSize: 10, color: '#94a3b8' },
  logMessage: { fontSize: 13, color: '#1e293b' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
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
  modalSaveText: { color: '#ffffff', fontSize: 13, fontWeight: '600' }
});