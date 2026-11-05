// ProfileScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  Platform,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import {
  Feather,
  Ionicons,
  FontAwesome5,
} from '@expo/vector-icons';
import MobileFooter from '../components/MobileFooter';

const BASE_URL = 'http://10.103.176.28:8000/api';

export default function ProfileScreen({
  user,
  token,
  plots = [],
  onLogout,
  onUpdateUser,
  currentTab,
  onSelectTab,
}) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // ---------- EDIT PROFILE MODAL STATE ----------
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // ---------- CHANGE PASSWORD MODAL STATE ----------
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Calculate assigned plots for this user (matching AdminScreen assignment logic)
  const userPlots = (plots || []).filter((p) => {
    const isAssigned =
      (user?.id && String(p.farmer) === String(user.id)) ||
      (user?.username && p.farmer_username === user.username);
    return isAssigned;
  });
  const assignedPlotsCount = userPlots.length;

  // Open Edit Profile Modal with exact first_name & last_name from database
  const handleOpenEditProfile = () => {
    setFirstName(user?.first_name || '');
    setLastName(user?.last_name || '');
    setPhone(user?.phone || '');
    setIsEditProfileOpen(true);
  };

  // ---------- SAVE PROFILE CHANGES TO DATABASE ----------
  const handleSaveProfile = async () => {
    if (!firstName.trim()) {
      Alert.alert('Validation Error', 'First name is required.');
      return;
    }

    setSavingProfile(true);
    const updatedFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      name: updatedFullName,
      phone: phone.trim(),
    };

    try {
      if (token && user?.id) {
        const response = await fetch(`${BASE_URL}/users/${user.id}/`, {
          method: 'PATCH',
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Failed to update profile on backend.');
        }
      }

      if (onUpdateUser && user?.id) {
        onUpdateUser(user.id, payload);
      }

      Alert.alert('Success', 'Profile details updated successfully!');
      setIsEditProfileOpen(false);
    } catch (error) {
      console.warn('Update Profile Error:', error);
      Alert.alert('Error', 'Could not save profile changes. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ---------- CHANGE PASSWORD IN DATABASE ----------
  const handleChangePassword = async () => {
    if (!oldPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter your current password.');
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }

    setSavingPassword(true);

    try {
      if (token && user?.id) {
        const response = await fetch(`${BASE_URL}/users/${user.id}/`, {
          method: 'PATCH',
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            old_password: oldPassword,
            password: newPassword,
          }),
        });

        const errData = await response.json();

        if (!response.ok) {
          // Handle Django field error arrays cleanly without throwing an unhandled exception
          const errorMsg =
            (Array.isArray(errData.old_password) ? errData.old_password[0] : errData.old_password) ||
            (Array.isArray(errData.password) ? errData.password[0] : errData.password) ||
            errData.detail ||
            errData.error ||
            'Password update failed.';

          Alert.alert('Password Error', errorMsg);
          return;
        }
      }

      Alert.alert('Success', 'Your password has been changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangePasswordOpen(false);
    } catch (error) {
      console.warn('Network Error:', error);
      Alert.alert('Connection Error', 'Could not reach the server. Please try again.');
    } finally {
      setSavingPassword(false);
    }
  };

  // ---------- PRIVACY POLICY POPUP ----------
  const handleOpenPrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'JJMAP (Joint Soil Monitoring Application Platform) values your privacy.\n\n' +
        '1. Data Collection: We collect soil telemetry data (pH, moisture, temperature, NPK) and basic account info.\n' +
        '2. Usage: Your data is solely used to deliver real-time environmental alerts and soil monitoring.\n' +
        '3. Protection: Security protocols ensure your farm details remain confidential.\n\n' +
        'Contact support@jjmap.ph for questions.',
      [{ text: 'Close', style: 'cancel' }]
    );
  };

  const firstNameVal = user?.first_name || '';
  const lastNameVal = user?.last_name || '';
  const fullNameDisplay =
    firstNameVal || lastNameVal
      ? `${firstNameVal} ${lastNameVal}`.trim()
      : 'Not set';

  const userPhoneDisplay = phone || user?.phone || 'No phone added';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your account preferences</Text>
        </View>

        {/* Profile Card (Clickable to Edit) */}
        <View style={styles.profileCardWrapper}>
          <TouchableOpacity
            style={styles.profileCard}
            activeOpacity={0.8}
            onPress={handleOpenEditProfile}
          >
            <View style={styles.avatarCircle}>
              <Feather name="user" size={28} color="#15803d" />
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.nameEditRow}>
                <Text style={styles.userLabelText}>
                  User: <Text style={styles.userValueText}>@{user?.username || 'user'}</Text>
                </Text>
                <Feather name="edit-3" size={16} color="#16a34a" style={styles.editIcon} />
              </View>

              <Text style={styles.infoRowText}>
                FullName: <Text style={styles.infoValueText}>{fullNameDisplay}</Text>
              </Text>

              <Text style={styles.infoRowText}>
                Phone: <Text style={styles.infoValueText}>{userPhoneDisplay}</Text>
              </Text>

              <View style={styles.locationRow}>
                <Ionicons name="leaf-outline" size={14} color="#16a34a" />
                <Text style={styles.locationText}>
                  Plots Assigned: {assignedPlotsCount}
                </Text>
              </View>
            </View>

            {/* FARMER / ADMIN Badge at Lower Right Corner */}
            <View style={styles.roleBadgeBottomRight}>
              <Text style={styles.roleBadgeText}>
                {user?.role || (user?.is_staff ? 'ADMIN' : 'FARMER')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionsContainer}>
          {/* CONSOLIDATED SETTINGS SECTION */}
          <Text style={styles.sectionHeader}>SETTINGS</Text>
          <View style={styles.cardGroup}>
            {/* Push Notifications */}
            <View style={styles.rowItem}>
              <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="notifications-outline" size={20} color="#3b82f6" />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowTitle}>Notifications</Text>
                <Text style={styles.rowSubtitle}>Push alerts for soil critical levels</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#e2e8f0', true: '#22c55e' }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={styles.divider} />

            {/* Change Password */}
            <TouchableOpacity
              style={styles.rowItem}
              activeOpacity={0.7}
              onPress={() => setIsChangePasswordOpen(true)}
            >
              <View style={[styles.iconBox, { backgroundColor: '#fefce8' }]}>
                <Ionicons name="lock-closed-outline" size={20} color="#eab308" />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowTitle}>Change Password</Text>
                <Text style={styles.rowSubtitle}>Update account security password</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Privacy Policy */}
            <TouchableOpacity
              style={styles.rowItem}
              activeOpacity={0.7}
              onPress={handleOpenPrivacyPolicy}
            >
              <View style={[styles.iconBox, { backgroundColor: '#f0f3ff' }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#6366f1" />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowTitle}>Privacy Policy</Text>
                <Text style={styles.rowSubtitle}>View platform policy & terms</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* ABOUT SECTION */}
          <Text style={styles.sectionHeader}>ABOUT</Text>
          <View style={styles.aboutCard}>
            <View style={styles.aboutIconCircle}>
              <FontAwesome5 name="seedling" size={30} color="#ffffff" />
            </View>
            <Text style={styles.aboutTitle}>JJMAP v1.0</Text>
            <Text style={styles.aboutSubtitle}>
              Joint Soil Monitoring Application Platform
            </Text>
            <Text style={styles.aboutFooter}>
              USTP · Cagayan de Oro · © 2026
            </Text>
          </View>

          {/* LOGOUT BUTTON */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={onLogout}
            activeOpacity={0.7}
          >
            <Feather name="log-out" size={18} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ---------- EDIT PROFILE MODAL ---------- */}
      <Modal
        visible={isEditProfileOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditProfileOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="First Name"
              placeholderTextColor="#94a3b8"
              value={firstName}
              onChangeText={setFirstName}
            />

            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Last Name"
              placeholderTextColor="#94a3b8"
              value={lastName}
              onChangeText={setLastName}
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Phone Number (e.g., +639123456789)"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsEditProfileOpen(false)}
                disabled={savingProfile}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ---------- CHANGE PASSWORD MODAL ---------- */}
      <Modal
        visible={isChangePasswordOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsChangePasswordOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <Text style={styles.inputLabel}>Old Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter current password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
            />

            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter new password (min. 6 characters)"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Repeat new password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setIsChangePasswordOpen(false);
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={savingPassword}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleChangePassword}
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSaveText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Footer Navigation */}
      <MobileFooter currentTab={currentTab || 'Settings'} onSelectTab={onSelectTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fdf8',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  topHeader: {
    backgroundColor: '#236339',
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingHorizontal: 25,
    paddingBottom: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#dcfce7',
    marginTop: 4,
  },
  profileCardWrapper: {
    paddingHorizontal: 20,
    marginTop: -45,
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    paddingBottom: 22,
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarCircle: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
    paddingRight: 60,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  userLabelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
  },
  userValueText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  editIcon: {
    marginLeft: 6,
  },
  infoRowText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    marginTop: 2,
  },
  infoValueText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  locationText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
    marginLeft: 4,
  },
  roleBadgeBottomRight: {
    position: 'absolute',
    bottom: 14,
    right: 16,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  roleBadgeText: {
    fontSize: 11,
    color: '#15803d',
    fontWeight: 'bold',
  },
  sectionsContainer: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    marginTop: 15,
    marginBottom: 10,
    paddingLeft: 4,
  },
  cardGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rowTextContainer: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  aboutCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  aboutIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  aboutSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  aboutFooter: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 6,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    marginBottom: 10,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
    marginTop: 6,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 6,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  modalCancelText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#16a34a',
    minWidth: 100,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});