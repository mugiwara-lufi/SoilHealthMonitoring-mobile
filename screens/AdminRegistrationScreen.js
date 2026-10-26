import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AdminRegistrationScreen({ onRegister, onBackToLogin }) {
  const [formData, setFormData] = useState({ username: '', first_name: '', last_name: '', email: '', password: '', confirm_password: '' });
  const [secureText, setSecureText] = useState(true);

  const handleSubmit = () => {
    if (formData.password !== formData.confirm_password) {
      alert("Passwords do not match");
      return;
    }
    // Admin essentially registers standardly; Django backend defaults is_staff logic or manual promotion later if strict
    onRegister({ ...formData, owner_email: '' }); 
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        
        {/* Header Shape */}
        <View style={styles.headerCurve}>
          <TouchableOpacity style={styles.backBtn} onPress={onBackToLogin}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerIconCircle}>
            <Ionicons name="leaf-outline" size={32} color="#15803d" />
          </View>
          <Text style={styles.headerTitle}>Create Admin Account</Text>
          <Text style={styles.headerSub}>Join JJMAP Soil Health Monitor</Text>
        </View>

        <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.inputLabel}>Username *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="johndoe123" value={formData.username} onChangeText={t => setFormData({...formData, username: t})} autoCapitalize="none" />
          </View>

          <Text style={styles.inputLabel}>First Name *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="text-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="John" value={formData.first_name} onChangeText={t => setFormData({...formData, first_name: t})} />
          </View>

          <Text style={styles.inputLabel}>Last Name *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="text-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Doe" value={formData.last_name} onChangeText={t => setFormData({...formData, last_name: t})} />
          </View>

          <Text style={styles.inputLabel}>Email Address *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="your.email@example.com" value={formData.email} onChangeText={t => setFormData({...formData, email: t})} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <Text style={styles.inputLabel}>Password *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="At least 6 characters" value={formData.password} onChangeText={t => setFormData({...formData, password: t})} secureTextEntry={secureText} />
            <TouchableOpacity onPress={() => setSecureText(!secureText)}>
              <Ionicons name={secureText ? "eye-outline" : "eye-off-outline"} size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Confirm Password *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Re-enter your password" value={formData.confirm_password} onChangeText={t => setFormData({...formData, confirm_password: t})} secureTextEntry={secureText} />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.footerLink} onPress={onBackToLogin}>
            <Text style={styles.footerText}>Already have an account? <Text style={{ color: '#15803d', fontWeight: 'bold' }}>Login</Text></Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4fbf7' },
  headerCurve: { backgroundColor: '#15803d', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingVertical: 40, paddingHorizontal: 20, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 20, left: 20, padding: 10 },
  headerIconCircle: { backgroundColor: '#cff4cd', padding: 15, borderRadius: 50, marginBottom: 15 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  headerSub: { color: '#cff4cd', fontSize: 14 },
  formContainer: { paddingHorizontal: 25, paddingTop: 30, paddingBottom: 50 },
  inputLabel: { fontSize: 14, color: '#334155', marginBottom: 6, fontWeight: '600' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 15 : 12, marginBottom: 20 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#0f172a' },
  submitButton: { backgroundColor: '#15803d', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footerLink: { marginTop: 25, alignItems: 'center' },
  footerText: { color: '#64748b', fontSize: 14 }
});