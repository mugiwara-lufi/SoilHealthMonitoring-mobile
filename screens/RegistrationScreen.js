// RegistrationScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = 'http://10.175.38.28:8000/api';

export default function RegistrationScreen({ onRegister, onBackToLogin, defaultRole = 'user' }) {
  const isAdminRole = defaultRole === 'admin';

  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    owner_email: ''
  });

  const [secureText, setSecureText] = useState(true);

  // Verification & Modal States
  const [showModal, setShowModal] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');
  const [isOwnerLinking, setIsOwnerLinking] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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

  // Step 1: Submit Form & Initiate Registration
  const handleInitiateRegistration = async () => {
    if (
      !formData.username.trim() ||
      !formData.first_name.trim() ||
      !formData.last_name.trim() ||
      !formData.email.trim() ||
      !formData.password.trim()
    ) {
      showAlert({
        title: 'Validation Error',
        message: 'Please fill in all mandatory fields (*).',
        type: 'warning'
      });
      return;
    }

    if (formData.password.length < 6) {
      showAlert({
        title: 'Weak Password',
        message: 'Password must be at least 6 characters long.',
        type: 'warning'
      });
      return;
    }

    if (formData.password !== formData.confirm_password) {
      showAlert({
        title: 'Password Mismatch',
        message: 'Passwords do not match.',
        type: 'warning'
      });
      return;
    }

    setIsSendingCode(true);

    try {
      const response = await fetch(`${API_BASE_URL}/send-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          password: formData.password,
          owner_email: isAdminRole ? '' : formData.owner_email,
          role: isAdminRole ? 'admin' : 'user'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process registration.');
      }

      setTargetEmail(data.target_email);
      setIsOwnerLinking(Boolean(data.is_owner_linking));
      setIsSendingCode(false);
      setShowModal(true);
    } catch (err) {
      setIsSendingCode(false);
      showAlert({
        title: 'Registration Error',
        message: err.message || 'Server connection failed.',
        type: 'danger'
      });
    }
  };

  // Submit standard OTP verification code (for independent users or admins)
  const handleVerifyOtpSubmit = async () => {
    if (!otpInput.trim() || otpInput.trim().length !== 6) {
      showAlert({
        title: 'Validation Error',
        message: 'Please enter a valid 6-digit code.',
        type: 'warning'
      });
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch(`${API_BASE_URL}/verify-register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          password: formData.password,
          owner_email: isAdminRole ? '' : formData.owner_email,
          is_staff: isAdminRole,
          otp: otpInput.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed.');
      }

      setIsVerifying(false);
      setShowModal(false);

      if (onRegister) {
        onRegister(data);
      }
    } catch (err) {
      setIsVerifying(false);
      showAlert({
        title: 'Verification Failed',
        message: err.message,
        type: 'danger'
      });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.headerCurve}>
          <TouchableOpacity style={styles.backBtn} onPress={onBackToLogin}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerIconCircle}>
            <Ionicons name={isAdminRole ? "shield-checkmark-outline" : "leaf-outline"} size={32} color="#15803d" />
          </View>
          <Text style={styles.headerTitle}>
            {isAdminRole ? 'Create Farm Owner Account' : 'Create Farmer Account'}
          </Text>
          <Text style={styles.headerSub}>JJMAP Soil Health Monitor</Text>
        </View>

        <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.inputLabel}>Username *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="johndoe123"
              placeholderTextColor="#94a3b8"
              value={formData.username}
              onChangeText={t => setFormData({ ...formData, username: t })}
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.inputLabel}>First Name *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="text-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="John"
              placeholderTextColor="#94a3b8"
              value={formData.first_name}
              onChangeText={t => setFormData({ ...formData, first_name: t })}
            />
          </View>

          <Text style={styles.inputLabel}>Last Name *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="text-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Doe"
              placeholderTextColor="#94a3b8"
              value={formData.last_name}
              onChangeText={t => setFormData({ ...formData, last_name: t })}
            />
          </View>

          <Text style={styles.inputLabel}>Email Address *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="your.email@example.com"
              placeholderTextColor="#94a3b8"
              value={formData.email}
              onChangeText={t => setFormData({ ...formData, email: t })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {!isAdminRole && (
            <>
              <Text style={styles.inputLabel}>Farm Owner's Email (Optional)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="business-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="owner@farm.com"
                  placeholderTextColor="#94a3b8"
                  value={formData.owner_email}
                  onChangeText={t => setFormData({ ...formData, owner_email: t })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <Text style={styles.helperText}>
                Linking to a Farm Owner will place your account under their review queue for in-app activation.
              </Text>
            </>
          )}

          <Text style={styles.inputLabel}>Password *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor="#94a3b8"
              value={formData.password}
              onChangeText={t => setFormData({ ...formData, password: t })}
              secureTextEntry={secureText}
            />
            <TouchableOpacity onPress={() => setSecureText(!secureText)}>
              <Ionicons name={secureText ? "eye-outline" : "eye-off-outline"} size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Confirm Password *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor="#94a3b8"
              value={formData.confirm_password}
              onChangeText={t => setFormData({ ...formData, confirm_password: t })}
              secureTextEntry={secureText}
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleInitiateRegistration}
            disabled={isSendingCode}
          >
            {isSendingCode ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitText}>
                {formData.owner_email.trim() && !isAdminRole ? 'Submit for Owner Approval' : 'Send Verification Code'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.footerLink} onPress={onBackToLogin}>
            <Text style={styles.footerText}>
              Already have an account? <Text style={{ color: '#15803d', fontWeight: 'bold' }}>Login</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

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

      {/* VERIFICATION / PENDING MODAL */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={handleCloseModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.otpHeaderIcon}>
              <Ionicons
                name={isOwnerLinking ? 'time-outline' : 'mail-unread-outline'}
                size={36}
                color="#15803d"
              />
            </View>

            {isOwnerLinking ? (
              // FARMER LINKED TO OWNER: PENDING APPROVAL NOTICE
              <>
                <Text style={styles.modalTitle}>Pending Farm Owner Approval</Text>
                <Text style={styles.modalSubtext}>
                  Your account has been successfully registered and linked to{' '}
                  <Text style={styles.emailHighlight}>{targetEmail}</Text>.
                </Text>

                <View style={styles.waitingBox}>
                  <Ionicons name="shield-checkmark-outline" size={32} color="#d97706" style={{ marginBottom: 8 }} />
                  <Text style={styles.waitingText}>
                    Please notify your Farm Owner to log into their Admin dashboard and approve your account activation.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.verifyBtn}
                  onPress={() => {
                    setShowModal(false);
                    onBackToLogin();
                  }}
                >
                  <Text style={styles.verifyBtnText}>Back to Login</Text>
                </TouchableOpacity>
              </>
            ) : (
              // STANDARD OTP SCREEN FOR INDEPENDENT USERS / ADMINS
              <>
                <Text style={styles.modalTitle}>Email Verification</Text>
                <Text style={styles.modalSubtext}>
                  Enter the 6-digit code sent to your email{' '}
                  <Text style={styles.emailHighlight}>{targetEmail}</Text>.
                </Text>

                <TextInput
                  style={styles.otpInput}
                  placeholder="000000"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otpInput}
                  onChangeText={setOtpInput}
                />

                <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyOtpSubmit} disabled={isVerifying}>
                  {isVerifying ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.verifyBtnText}>Verify & Complete Registration</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleCloseModal}>
                  <Text style={styles.cancelModalText}>Cancel / Edit Details</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4fbf7' },
  headerCurve: {
    backgroundColor: '#15803d',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingVertical: 35,
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  backBtn: { position: 'absolute', top: 20, left: 20, padding: 10 },
  headerIconCircle: { backgroundColor: '#cff4cd', padding: 15, borderRadius: 50, marginBottom: 12 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  headerSub: { color: '#cff4cd', fontSize: 14 },
  formContainer: { paddingHorizontal: 25, paddingTop: 30, paddingBottom: 50 },
  inputLabel: { fontSize: 14, color: '#334155', marginBottom: 6, fontWeight: '600' },
  helperText: { fontSize: 12, color: '#64748b', marginTop: -12, marginBottom: 20, marginLeft: 5 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 15 : 12,
    marginBottom: 20
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#0f172a' },
  submitButton: { backgroundColor: '#15803d', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footerLink: { marginTop: 25, alignItems: 'center' },
  footerText: { color: '#64748b', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    elevation: 5
  },
  otpHeaderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: 8 },
  modalSubtext: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emailHighlight: { color: '#15803d', fontWeight: 'bold' },
  waitingBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20
  },
  waitingText: { fontSize: 13, color: '#78350f', textAlign: 'center', lineHeight: 18 },
  otpInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    width: '100%',
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
    textAlign: 'center',
    color: '#0f172a',
    marginBottom: 20
  },
  verifyBtn: {
    backgroundColor: '#15803d',
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16
  },
  verifyBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  cancelModalText: { fontSize: 13, color: '#64748b' },

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