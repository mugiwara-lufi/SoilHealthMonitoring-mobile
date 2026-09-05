import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function MobileFooter({ currentTab = 'Farm', onSelectTab }) {
  const navItems = [
    {
      id: 'Farm',
      label: 'Farm',
      iconName: 'home',
    },
    {
      id: 'Map',
      label: 'Map',
      iconName: 'map',
    },
    {
      id: 'History',
      label: 'History',
      iconName: 'clock',
    },
    {
      id: 'Settings',
      label: 'Settings',
      iconName: 'settings',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const color = isActive ? '#15803d' : '#64748b';

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.tabItem}
              onPress={() => onSelectTab && onSelectTab(item.id)}
              activeOpacity={0.7}
            >
              <Feather name={item.iconName} size={22} color={color} />
              <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '400',
  },
  activeTabLabel: {
    color: '#15803d',
    fontWeight: '600',
  },
});