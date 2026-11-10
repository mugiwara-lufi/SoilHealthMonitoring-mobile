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
  KeyboardAvoidingView,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  Feather,
  Ionicons,
  FontAwesome5,
} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import MobileFooter from '../components/MobileFooter';

const BASE_URL = 'http://10.175.38.28:8000/api';
const SERVER_ROOT = 'http://10.175.38.28:8000';

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
  const [profileImage, setProfileImage] = useState(user?.profile_image || user?.avatar || null);
  const [savingProfile, setSavingProfile] = useState(false);

  // ---------- CHANGE PASSWORD MODAL STATE ----------
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // ---------- PRIVACY POLICY MODAL STATE ----------
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // ---------- CUSTOM CARD ALERT STATE ----------
  const [cardAlert, setCardAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
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
    setProfileImage(user?.profile_image || user?.avatar || null);
    setIsEditProfileOpen(true);
  };

  // ---------- PICK IMAGE FROM PHONE GALLERY ----------
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showAlert({
        title: 'Permission Required',
        message: 'Permission to access camera roll is required!',
        type: 'warning'
      });
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      setProfileImage(pickerResult.assets[0].uri);
    }
  };

  // ---------- SAVE PROFILE CHANGES TO DATABASE ----------
  const handleSaveProfile = async () => {
    if (!firstName.trim()) {
      showAlert({
        title: 'Validation Error',
        message: 'First name is required.',
        type: 'warning'
      });
      return;
    }

    setSavingProfile(true);
    const updatedFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
   
    const formData = new FormData();
    formData.append('first_name', firstName.trim());
    formData.append('last_name', lastName.trim());
    formData.append('name', updatedFullName);
    formData.append('phone', phone.trim());

    if (profileImage && !profileImage.startsWith('http') && profileImage.startsWith('file')) {
      const uriParts = profileImage.split('.');
      const fileType = uriParts[uriParts.length - 1];
      formData.append('profile_image', {
        uri: profileImage,
        name: `profile_${user?.id || 'avatar'}.${fileType}`,
        type: `image/${fileType}`,
      });
    }

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      name: updatedFullName,
      phone: phone.trim(),
      profile_image: profileImage,
    };

    try {
      if (token && user?.id) {
        const isMultipart = profileImage && !profileImage.startsWith('http') && profileImage.startsWith('file');
        const response = await fetch(`${BASE_URL}/users/${user.id}/`, {
          method: 'PATCH',
          headers: {
            Authorization: `Token ${token}`,
            ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
            Accept: 'application/json',
          },
          body: isMultipart ? formData : JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Failed to update profile on backend.');
        }
      }

      if (onUpdateUser && user?.id) {
        onUpdateUser(user.id, payload);
      }

      showAlert({
        title: 'Success',
        message: 'Profile details and picture updated successfully!',
        type: 'success'
      });
      setIsEditProfileOpen(false);
    } catch (error) {
      console.warn('Update Profile Error:', error);
      showAlert({
        title: 'Error',
        message: 'Could not save profile changes. Please try again.',
        type: 'danger'
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // ---------- CHANGE PASSWORD IN DATABASE ----------
  const handleChangePassword = async () => {
    if (!oldPassword.trim()) {
      showAlert({
        title: 'Validation Error',
        message: 'Please enter your current password.',
        type: 'warning'
      });
      return;
    }
    if (!newPassword.trim()) {
      showAlert({
        title: 'Validation Error',
        message: 'Please enter a new password.',
        type: 'warning'
      });
      return;
    }
    if (newPassword.length < 6) {
      showAlert({
        title: 'Validation Error',
        message: 'New password must be at least 6 characters long.',
        type: 'warning'
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert({
        title: 'Validation Error',
        message: 'New passwords do not match.',
        type: 'warning'
      });
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
          const errorMsg =
            (Array.isArray(errData.old_password) ? errData.old_password[0] : errData.old_password) ||
            (Array.isArray(errData.password) ? errData.password[0] : errData.password) ||
            errData.detail ||
            errData.error ||
            'Password update failed.';

          showAlert({
            title: 'Password Error',
            message: errorMsg,
            type: 'danger'
          });
          return;
        }
      }

      showAlert({
        title: 'Success',
        message: 'Your password has been changed successfully!',
        type: 'success'
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangePasswordOpen(false);
    } catch (error) {
      console.warn('Network Error:', error);
      showAlert({
        title: 'Connection Error',
        message: 'Could not reach the server. Please try again.',
        type: 'danger'
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const firstNameVal = user?.first_name || '';
  const lastNameVal = user?.last_name || '';
  const fullNameDisplay =
    firstNameVal || lastNameVal
      ? `${firstNameVal} ${lastNameVal}`.trim()
      : 'Not set';

  const userPhoneDisplay = phone || user?.phone || 'No phone added';
 
  const getAbsoluteImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('file:')) return url;
    return `${SERVER_ROOT}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const rawAvatar = profileImage || user?.profile_image || user?.avatar;
  const displayAvatar = getAbsoluteImageUrl(rawAvatar);

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
              {displayAvatar ? (
                <Image source={{ uri: displayAvatar }} style={styles.avatarImage} />
              ) : (
                <Feather name="user" size={28} color="#15803d" />
              )}
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
              onPress={() => setIsPrivacyModalOpen(true)}
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

      {/* ---------- CUSTOM DESIGNED CARD ALERT MODAL ---------- */}
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

      {/* ---------- CUSTOM CARD PRIVACY POLICY MODAL ---------- */}
      <Modal
        visible={isPrivacyModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPrivacyModalOpen(false)}
      >
        <View style={styles.cardAlertOverlay}>
          <View style={styles.privacyCardBox}>
            <View style={styles.privacyHeaderRow}>
              <Text style={styles.privacyModalTitle}>Privacy Policy</Text>
              <TouchableOpacity
                onPress={() => setIsPrivacyModalOpen(false)}
                style={styles.privacyCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.privacyHighlightBox}>
              <Text style={styles.privacyHighlightText}>
                JJMAP (Joint Soil Monitoring Application Platform) respects your privacy and is committed to protecting your personal data.
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.privacyScrollArea}>
              <View style={styles.privacySection}>
                <Text style={styles.privacySectionTitle}>1. Data Collection</Text>
                <Text style={styles.privacySectionBody}>
                  We collect soil data, sensor readings, and farm management information to provide our services.
                </Text>
              </View>

              <View style={styles.privacySection}>
                <Text style={styles.privacySectionTitle}>2. Data Usage</Text>
                <Text style={styles.privacySectionBody}>
                  Your data is used solely for soil monitoring, analysis, and providing farming recommendations.
                </Text>
              </View>

              <View style={styles.privacySection}>
                <Text style={styles.privacySectionTitle}>3. Data Security</Text>
                <Text style={styles.privacySectionBody}>
                  We implement industry-standard security measures to protect your information.
                </Text>
              </View>

              <View style={styles.privacySection}>
                <Text style={styles.privacySectionTitle}>4. Data Sharing</Text>
                <Text style={styles.privacySectionBody}>
                  We do not share your personal data with third parties without your explicit consent.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.privacyCloseButton}
              onPress={() => setIsPrivacyModalOpen(false)}
            >
              <Text style={styles.privacyCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ---------- EDIT PROFILE MODAL (WITH PICTURE UPLOAD) ---------- */}
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

            {/* Profile Picture Picker Circle */}
            <View style={{ alignItems: 'center', marginBottom: 15 }}>
              <TouchableOpacity onPress={handlePickImage} style={styles.modalAvatarContainer}>
                {displayAvatar ? (
                  <Image source={{ uri: displayAvatar }} style={styles.modalAvatarImage} />
                ) : (
                  <Feather name="user" size={36} color="#15803d" />
                )}
                <View style={styles.cameraBadge}>
                  <Feather name="camera" size={14} color="#ffffff" />
                </View>
              </TouchableOpacity>
              <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '600', marginTop: 4 }}>
                Tap to change profile picture
              </Text>
            </View>

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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  modalAvatarContainer: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#16a34a',
  },
  modalAvatarImage: {
    width: '100%',
    height: '100%',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 3,
    alignItems: 'center',
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

  // Custom Card Alert & Privacy Modal Styles
  cardAlertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardAlertBox: { backgroundColor: '#ffffff', borderRadius: 20, padding: 22, width: '100%', maxWidth: 340, alignItems: 'center', elevation: 5 },
  cardAlertIconBadge: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  cardAlertTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: 6 },
  cardAlertMessage: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  cardAlertActions: { flexDirection: 'row', gap: 10, width: '100%' },
  cardAlertCancelBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cardAlertCancelText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  cardAlertConfirmBtn: { flex: 1, backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cardAlertConfirmText: { fontSize: 13, fontWeight: 'bold', color: '#ffffff' },

  privacyCardBox: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    elevation: 6,
  },
  privacyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  privacyModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  privacyCloseBtn: {
    padding: 4,
  },
  privacyHighlightBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#dcfce7',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  privacyHighlightText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
    fontWeight: '500',
  },
  privacyScrollArea: {
    maxHeight: 280,
    marginBottom: 14,
  },
  privacySection: {
    marginBottom: 12,
  },
  privacySectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  privacySectionBody: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
  },
  privacyCloseButton: {
    backgroundColor: '#3f6212',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  privacyCloseButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
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