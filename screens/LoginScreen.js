// screens/LoginScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Must match BASE_URL in App.js (the /api prefix is included here).
const API_BASE_URL = 'http://52.63.40.11/api';

export default function LoginScreen({ onLogin, onNavigateRegister, loginError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Forgot-password modal state.
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetStage, setResetStage] = useState('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  const handleLoginSubmit = () => {
    if (isFormValid && onLogin) {
      onLogin(email.trim(), password.trim());
    }
  };

  const handleSelectRole = (roleType) => {
    setShowRoleModal(false);
    if (onNavigateRegister) {
      onNavigateRegister(roleType);
    }
  };

  const openForgotPassword = () => {
    setResetEmail(email.includes('@') ? email.trim() : '');
    setResetOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setResetStage('email');
    setResetError('');
    setResetMessage('');
    setShowForgotModal(true);
  };

  const closeForgotPassword = () => {
    if (resetLoading) return;
    setShowForgotModal(false);
    setResetError('');
    setResetMessage('');
  };

  const sendResetRequest = async (endpoint, payload) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.detail || 'Request failed. Please try again.');
    }
    return data;
  };

  const handleSendResetOtp = async () => {
    const normalizedEmail = resetEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setResetError('Please enter a valid email address.');
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetMessage('');
    try {
      const data = await sendResetRequest('/password-reset/send-otp/', {
        email: normalizedEmail,
      });
      setResetEmail(normalizedEmail);
      setResetStage('otp');
      setResetMessage(data.message || 'If an account exists for this email, a verification code has been sent.');
    } catch (error) {
      setResetError(error.message || 'Unable to send the verification code.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyResetOtp = async () => {
    if (!/^\d{6}$/.test(resetOtp.trim())) {
      setResetError('Enter the 6-digit verification code.');
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetMessage('');
    try {
      const data = await sendResetRequest('/password-reset/verify-otp/', {
        email: resetEmail.trim().toLowerCase(),
        otp: resetOtp.trim(),
      });
      setResetToken(data.reset_token || '');
      setResetStage('password');
      setResetMessage('Email verified. You can now create a new password.');
    } catch (error) {
      setResetError(error.message || 'The verification code is invalid or expired.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSaveNewPassword = async () => {
    if (newPassword.length < 8) {
      setResetError('Your new password must contain at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('The passwords do not match.');
      return;
    }
    if (!resetToken) {
      setResetError('Your password reset session has expired. Please start again.');
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetMessage('');
    try {
      const data = await sendResetRequest('/password-reset/confirm/', {
        email: resetEmail.trim().toLowerCase(),
        reset_token: resetToken,
        new_password: newPassword,
      });
      setResetStage('done');
      setResetMessage(data.message || 'Your password has been changed. Please log in again.');
      setPassword('');
    } catch (error) {
      setResetError(error.message || 'Unable to update your password.');
    } finally {
      setResetLoading(false);
    }
  };

  const restartPasswordReset = () => {
    setResetStage('email');
    setResetOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
    setResetMessage('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f5132" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Banner Header */}
          <View style={styles.heroBanner}>
            <View style={styles.ambientCircle1} />
            <View style={styles.ambientCircle2} />

            <View style={styles.logoCircle}>
              <Image
                source={require('../assets/jjmap_logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <Image
              source={require('../assets/jjmap_text.png')}
              style={styles.brandTextImage}
              resizeMode="contain"
            />
            <Text style={styles.brandSubtitle}>Soil Health Monitor</Text>
            <Text style={styles.brandDescription}>
              Joint Soil Monitoring Application Platform
            </Text>
          </View>

          {/* Login Form Card */}
          <View style={styles.formWrapper}>
            <View style={styles.formCard}>
              {/* Username / Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username or Email</Text>
                <View style={[styles.inputContainer, loginError && styles.errorInputBorder]}>
                  <Ionicons name="person-outline" size={20} color="#15803d" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your username or email"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[styles.inputContainer, loginError && styles.errorInputBorder]}>
                  <Ionicons name="lock-closed-outline" size={20} color="#15803d" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIconBtn}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
                {/* Inline Error Message */}
                {loginError ? (
                  <Text style={styles.errorText}>Invalid Credentials. Check your username and password.</Text>
                ) : null}
              </View>

              {/* Submit Login Button */}
              <TouchableOpacity
                onPress={handleLoginSubmit}
                disabled={!isFormValid}
                activeOpacity={0.8}
                style={[
                  styles.loginBtn,
                  !isFormValid && styles.disabledBtn
                ]}
              >
                <Text style={styles.loginBtnText}>Login to Dashboard</Text>
                <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              {/* Forgot Password link */}
              <TouchableOpacity
                onPress={openForgotPassword}
                activeOpacity={0.7}
                style={styles.forgotPasswordRow}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Sign Up Redirect */}
              <View style={styles.signUpRow}>
                <Text style={styles.signUpPrompt}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => setShowRoleModal(true)}>
                  <Text style={styles.signUpLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footerInfo}>
              <Text style={styles.footerText}>USTP · Cagayan de Oro · 2026</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeForgotPassword}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.forgotModalContent}>
            <View style={styles.modalBadge}>
              <Ionicons
                name={resetStage === 'done' ? 'checkmark-circle-outline' : 'lock-closed-outline'}
                size={26}
                color="#15803d"
              />
            </View>

            <Text style={styles.modalTitle}>
              {resetStage === 'email' ? 'Forgot Password?' :
                resetStage === 'otp' ? 'Verify Your Email' :
                resetStage === 'password' ? 'Create New Password' : 'Password Updated'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {resetStage === 'email'
                ? 'Enter the email address registered to your JJMAP account.'
                : resetStage === 'otp'
                  ? `Enter the 6-digit code sent to ${resetEmail}.`
                  : resetStage === 'password'
                    ? 'Choose a new password for your account.'
                    : 'Your password has been changed successfully. You can now log in with your new password.'}
            </Text>

            {resetStage === 'email' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color="#15803d" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    placeholder="Enter your registered email"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>
              </View>
            )}

            {resetStage === 'otp' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>6-Digit OTP</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="keypad-outline" size={20} color="#15803d" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={resetOtp}
                    onChangeText={(value) => setResetOtp(value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter verification code"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                <TouchableOpacity onPress={handleSendResetOtp} disabled={resetLoading}>
                  <Text style={styles.resetSecondaryLink}>Resend code</Text>
                </TouchableOpacity>
              </View>
            )}

            {resetStage === 'password' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#15803d" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="At least 8 characters"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#15803d" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter your new password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </>
            )}

            {!!resetError && <Text style={styles.resetErrorText}>{resetError}</Text>}
            {!!resetMessage && resetStage !== 'done' && (
              <Text style={styles.resetMessageText}>{resetMessage}</Text>
            )}

            {resetStage === 'email' ? (
              <TouchableOpacity
                style={[styles.loginBtn, resetLoading && styles.disabledBtn]}
                onPress={handleSendResetOtp}
                disabled={resetLoading}
              >
                <Text style={styles.loginBtnText}>{resetLoading ? 'Sending...' : 'Send OTP'}</Text>
              </TouchableOpacity>
            ) : resetStage === 'otp' ? (
              <TouchableOpacity
                style={[styles.loginBtn, resetLoading && styles.disabledBtn]}
                onPress={handleVerifyResetOtp}
                disabled={resetLoading}
              >
                <Text style={styles.loginBtnText}>{resetLoading ? 'Verifying...' : 'Verify OTP'}</Text>
              </TouchableOpacity>
            ) : resetStage === 'password' ? (
              <TouchableOpacity
                style={[styles.loginBtn, resetLoading && styles.disabledBtn]}
                onPress={handleSaveNewPassword}
                disabled={resetLoading}
              >
                <Text style={styles.loginBtnText}>{resetLoading ? 'Updating...' : 'Update Password'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={() => {
                  closeForgotPassword();
                  restartPasswordReset();
                }}
              >
                <Text style={styles.loginBtnText}>Back to Login</Text>
              </TouchableOpacity>
            )}

            {resetStage !== 'done' && (
              <TouchableOpacity
                onPress={resetStage === 'email' ? closeForgotPassword : restartPasswordReset}
                disabled={resetLoading}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>
                  {resetStage === 'email' ? 'Cancel' : 'Start Over'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Account Type Selection Modal */}
      <Modal
        visible={showRoleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalBadge}>
              <Ionicons name="person-add-outline" size={26} color="#15803d" />
            </View>

            <Text style={styles.modalTitle}>Choose Account Type</Text>
            <Text style={styles.modalSubtitle}>
              Select your primary role to proceed with registration
            </Text>

            {/* Admin Selection */}
            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => handleSelectRole('AdminRegister')}
              activeOpacity={0.8}
            >
              <View style={styles.roleIconBox}>
                <Ionicons name="shield-checkmark-outline" size={24} color="#15803d" />
              </View>
              <View style={styles.roleTextContainer}>
                <Text style={styles.roleTitle}>Farm Owner / Admin</Text>
                <Text style={styles.roleDesc}>Manage farms, invite farmers, and oversee plots.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            {/* Farmer Selection */}
            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => handleSelectRole('FarmerRegister')}
              activeOpacity={0.8}
            >
              <View style={styles.roleIconBox}>
                <Ionicons name="leaf-outline" size={24} color="#15803d" />
              </View>
              <View style={styles.roleTextContainer}>
                <Text style={styles.roleTitle}>Farmer</Text>
                <Text style={styles.roleDesc}>Inherit plots and monitor live soil telemetry.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              pressRetentionOffset={20}
              onPress={() => setShowRoleModal(false)}
              style={styles.modalCancelBtn}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#f1f5f9',
  },
  heroBanner: {
    backgroundColor: '#15803d',
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    position: 'relative',
    overflow: 'hidden',
  },
  ambientCircle1: {
    position: 'absolute',
    top: -30,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  ambientCircle2: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoCircle: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -30,
    overflow: 'hidden',
  },
  logoImage: {
    width: '78%',
    height: '78%',
  },
  brandTextImage: {
    width: 250,
    height: 100,
    marginBottom: -10,
  },
  brandSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dcfce7',
    marginTop: 2,
  },
  brandDescription: {
    fontSize: 11,
    color: '#bbf7d0',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  formWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -30,
    paddingBottom: 30,
    justifyContent: 'space-between',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    elevation: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 14,
  },
  errorInputBorder: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  eyeIconBtn: {
    padding: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  loginBtn: {
    height: 52,
    backgroundColor: '#16a34a',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 2,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  forgotPasswordRow: {
    alignItems: 'flex-end',
    marginTop: 12,
    paddingVertical: 2,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
  },
  resetSecondaryLink: {
    alignSelf: 'flex-end',
    color: '#15803d',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
  resetErrorText: {
    color: '#dc2626',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  resetMessageText: {
    color: '#15803d',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  signUpPrompt: {
    fontSize: 13,
    color: '#64748b',
  },
  signUpLink: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#15803d',
  },
  footerInfo: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  forgotModalContent: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    elevation: 10,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
  },
  modalBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  roleCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  roleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  roleDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  modalCancelBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
});