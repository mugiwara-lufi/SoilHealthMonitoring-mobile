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
  ScrollView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function LoginScreen({ onLogin, onNavigateRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

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

            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="sprout" size={42} color="#15803d" />
            </View>

            <Text style={styles.brandTitle}>JJMAP</Text>
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
                <View style={styles.inputContainer}>
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
                <View style={styles.inputContainer}>
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
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
  },
  brandSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dcfce7',
    marginTop: 4,
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