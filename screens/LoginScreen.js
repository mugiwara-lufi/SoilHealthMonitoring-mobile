import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView
} from 'react-native';
// If you are using Expo, you can use Ionicons and FontAwesome5
// from @expo/vector-icons. If you are not using Expo, you will need to
// install and link react-native-vector-icons.
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'; 

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <View style={styles.inner}>
          
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.iconCircle}>
              <FontAwesome5 name="seedling" size={50} color="#15803d" />
            </View>
            <Text style={styles.title}>JJMAP</Text>
            <Text style={styles.subtitle}>Soil Health Monitor</Text>
            <Text style={styles.platformSub}>Joint Soil Monitoring Application Platform</Text>
          </View>
          
          {/* Email Field */}
          <Text style={styles.inputLabel}>Email Address</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Enter your email" 
              placeholderTextColor="#94a3b8"
              value={email} 
              onChangeText={setEmail} 
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Field */}
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Enter your password" 
              placeholderTextColor="#94a3b8"
              value={password} 
              onChangeText={setPassword}
              secureTextEntry={secureTextEntry}
            />
            <TouchableOpacity onPress={() => setSecureTextEntry(!secureTextEntry)}>
                <Ionicons name={secureTextEntry ? "eye-outline" : "eye-off-outline"} size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          
          {/* Login Button */}
          <TouchableOpacity 
            style={[styles.button, { opacity: isFormValid ? 1 : 0.7 }]} 
            onPress={() => isFormValid && onLogin(email, password)} 
            disabled={!isFormValid}
          >
            <Text style={styles.buttonText}>Login to Dashboard</Text>
          </TouchableOpacity>

          {/* Demo Credentials */}
          <View style={styles.demoBox}>
            <Text style={styles.demoText}>
              Demo: <Text style={styles.demoBold}>admin@jjmap.ph</Text> · password: <Text style={styles.demoBold}>admin123</Text>
            </Text>
          </View>

          {/* Sign Up Link */}
          <View style={styles.signupTextContainer}>
            <Text style={styles.noAccountText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => {/* Handle Sign Up Navigation */}}>
                <Text style={styles.signupText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerContainer}>
            <Text style={styles.footerText}>USTP · Cagayan de Oro · 2026</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfdfd' },
  keyboardView: { flex: 1 },
  inner: { 
    flex: 1, 
    paddingHorizontal: 25, 
    justifyContent: 'flex-start',
    paddingTop: 30
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  iconCircle: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 70,
    marginTop: 20,
    marginBottom: 20,
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  title: { fontSize: 36, fontWeight: 'bold', color: '#15803d', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 20, fontWeight: '600', color: '#15803d', textAlign: 'center', marginBottom: 5 },
  platformSub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 30 },
  inputLabel: {
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
    fontWeight: '500',
    paddingLeft: 5
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    paddingVertical: Platform.OS === 'ios' ? 18 : 14, 
    paddingHorizontal: 18,
    borderRadius: 15, 
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: { 
    flex: 1,
    fontSize: 16,
    color: '#000'
  },
  button: { 
    backgroundColor: '#15803d', 
    padding: 20, 
    borderRadius: 15, 
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  demoBox: {
    backgroundColor: '#e6f6eb',
    borderWidth: 1,
    borderColor: '#a3e6b1',
    borderRadius: 15,
    padding: 15,
    marginBottom: 30,
    alignItems: 'center'
  },
  demoText: {
    fontSize: 13,
    color: '#15803d',
    textAlign: 'center',
  },
  demoBold: {
    fontWeight: '600',
  },
  signupTextContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40
  },
  noAccountText: {
    color: '#64748b',
    fontSize: 16
  },
  signupText: {
    color: '#15803d',
    fontSize: 16,
    fontWeight: '600'
  },
  footerContainer: {
    width: '100%',
    paddingBottom: Platform.OS === 'ios' ? 10 : 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  }
});