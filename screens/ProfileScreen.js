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
} from 'react-native';
import {
  Feather,
  Ionicons,
  MaterialIcons,
  FontAwesome5,
} from '@expo/vector-icons';
import MobileFooter from '../components/MobileFooter';

export default function ProfileScreen({ user, onLogout, currentTab, onSelectTab }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Green Banner */}
        <View style={styles.topHeader}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your preferences</Text>
        </View>

        {/* Profile Card Overlay */}
        <View style={styles.profileCardWrapper}>
          <View style={styles.profileCard}>
            <View style={styles.avatarCircle}>
              <Feather name="user" size={28} color="#15803d" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{user?.name || 'Admin'}</Text>
              <Text style={styles.userEmail}>
                {user?.email || 'admin@jjmap.ph'}
              </Text>
              <View style={styles.roleTagRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>
                    {user?.role || 'Admin'}
                  </Text>
                </View>
                <Text style={styles.farmSubText}>
                  · JJMAP Research Farm
                </Text>
              </View>
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={14} color="#ef4444" />
                <Text style={styles.locationText}>
                  Lapasan, Cagayan de Oro City
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionsContainer}>
          {/* GENERAL SECTION */}
          <Text style={styles.sectionHeader}>GENERAL</Text>
          <View style={styles.cardGroup}>
            {/* Notifications */}
            <View style={styles.rowItem}>
              <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="notifications-outline" size={20} color="#3b82f6" />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowTitle}>Notifications</Text>
                <Text style={styles.rowSubtitle}>Push notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#e2e8f0', true: '#22c55e' }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={styles.divider} />

            {/* Dark Mode */}
            <View style={styles.rowItem}>
              <View style={[styles.iconBox, { backgroundColor: '#fae8ff' }]}>
                <Ionicons name="moon-outline" size={20} color="#a855f7" />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowTitle}>Dark Mode</Text>
                <Text style={styles.rowSubtitle}>Enable dark mode</Text>
              </View>
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
                trackColor={{ false: '#e2e8f0', true: '#22c55e' }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={styles.divider} />

            {/* Language */}
            <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
              <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="globe-outline" size={20} color="#16a34a" />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowTitle}>Language</Text>
                <Text style={styles.rowSubtitle}>English</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* SECURITY & PRIVACY SECTION */}
          <Text style={styles.sectionHeader}>SECURITY & PRIVACY</Text>
          <View style={styles.cardGroup}>
            {/* Change Password */}
            <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
              <View style={[styles.iconBox, { backgroundColor: '#fefce8' }]}>
                <Ionicons name="lock-closed-outline" size={20} color="#eab308" />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowTitle}>Change Password</Text>
                <Text style={styles.rowSubtitle}>Update your password</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Privacy Policy */}
            <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
              <View style={[styles.iconBox, { backgroundColor: '#f0f3ff' }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#6366f1" />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowTitle}>Privacy Policy</Text>
                <Text style={styles.rowSubtitle}>View our policy</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  roleTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  roleBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '600',
  },
  farmSubText: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 4,
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
});