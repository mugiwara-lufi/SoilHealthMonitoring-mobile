import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.emoji}>🌱</Text>
        <Text style={styles.title}>SoilHealth Monitor</Text>
        <Text style={styles.subtitle}>Please sign in to continue</Text>
        
        <TextInput 
          style={styles.input} 
          placeholder="Enter your name" 
          placeholderTextColor="#94a3b8"
          value={username} 
          onChangeText={setUsername} // Updates state on every keystroke
        />
        
        <TouchableOpacity 
          style={[styles.button, { opacity: username.length > 0 ? 1 : 0.6 }]} 
          onPress={() => username.trim() && onLogin(username)}
          disabled={!username.trim()}
        >
          <Text style={styles.buttonText}>Login to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, justifyContent: 'center', padding: 30 },
  emoji: { fontSize: 60, textAlign: 'center', marginBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#1b5e20' },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 40 },
  input: { 
    backgroundColor: '#f8fafc',
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    padding: 18, 
    borderRadius: 12, 
    fontSize: 16,
    marginBottom: 20 
  },
  button: { 
    backgroundColor: '#1b5e20', 
    padding: 18, 
    borderRadius: 12, 
    alignItems: 'center',
    elevation: 2
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});