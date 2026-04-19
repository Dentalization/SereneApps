import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getTypeMeta, formatNotificationTime, withOpacity } from '../utils/notificationUtils';
import { colors as THEME_COLORS } from '../../../theme/colors';
import { typography as TYPOGRAPHY } from '../../../theme/dimensions';

const COLORS = THEME_COLORS;

const NotificationItem = ({ notification, onPress }) => {
  const theme = useTheme();
  const typeMeta = getTypeMeta(notification.type);
  const isRead = notification.read;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.container,
        { backgroundColor: isRead ? COLORS.surfaceElevated : withOpacity(typeMeta.color, 0.05) },
        !isRead && styles.unreadBorder
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Notifikasi: ${notification.title}. ${notification.message}`}
    >
      <View style={[styles.iconContainer, { backgroundColor: withOpacity(typeMeta.color, 0.1) }]}>
        <MaterialCommunityIcons name={typeMeta.icon} size={24} color={typeMeta.color} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: COLORS.textPrimary }]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={[styles.time, { color: COLORS.textMuted }]}>
            {formatNotificationTime(notification.timestamp)}
          </Text>
        </View>
        <Text style={[styles.message, { color: COLORS.textSecondary }]} numberOfLines={2}>
          {notification.message}
        </Text>
      </View>

      {!isRead && (
        <View style={[styles.unreadDot, { backgroundColor: typeMeta.color }]} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  unreadBorder: {
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 11,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 12,
  },
});

export default NotificationItem;
