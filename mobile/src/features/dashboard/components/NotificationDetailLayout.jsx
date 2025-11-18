import React from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatNotificationTime, getTypeMeta } from '../utils/notificationUtils';

const NotificationDetailLayout = ({ notification, sections = [], ctaLabel, onCTAPress, heroExtras, footer }) => {
  const theme = useTheme();
  const navigation = useNavigation();
  const typeMeta = getTypeMeta(notification?.type);
  const cta = notification?.cta;
  const showCTA = ctaLabel || cta?.label;

  if (!notification) {
    return (
      <View style={styles.fallbackWrapper}>
        <MaterialCommunityIcons name="bell-off" size={48} color="#CBD5E1" />
        <Text style={{ fontSize: 16, fontWeight: '600', marginTop: 12, color: '#0F172A' }}>
          Notifikasi tidak ditemukan
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            marginTop: 24,
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 24,
            backgroundColor: theme.colors.primary,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
            Kembali
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCTA = () => {
    if (onCTAPress) {
      onCTAPress();
      return;
    }
    if (cta?.route?.name) {
      navigation.navigate(cta.route.name, cta.route.params);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={typeMeta.color} />
      <LinearGradient
        colors={[typeMeta.color, theme.colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{typeMeta.label}</Text>
            <Text style={styles.heroSubtitle}>{formatNotificationTime(notification.timestamp)}</Text>
          </View>
          {!notification.read && <View style={styles.heroBadge} />}
        </View>
        <View style={styles.heroInfoRow}>
          <View style={styles.heroIconWrapper}>
            <MaterialCommunityIcons name={typeMeta.icon} size={28} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailTitle}>{notification.title}</Text>
            <Text style={styles.detailMessage}>{notification.message}</Text>
          </View>
        </View>
        {heroExtras}
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: showCTA ? 160 : 40 }}>
        {sections.map((section) => (
          <View
            key={section.title}
            style={[
              styles.card,
              { backgroundColor: theme.colors.surface },
              theme?.shadows?.md,
            ]}
          >
            <Text style={styles.cardTitle}>{section.title}</Text>
            {section.rows.map((row, index) => (
              <View key={`${section.title}-${index}`} style={styles.row}>
                {row.label ? (
                  <Text style={[styles.rowLabel, { color: theme.colors.onSurfaceVariant }]}>
                    {row.label}
                  </Text>
                ) : null}
                <Text style={styles.rowValue}>{row.value}</Text>
                {row.meta && (
                  <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>
                    {row.meta}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ))}
        {footer}
      </ScrollView>

      {showCTA ? (
        <View style={styles.ctaWrapper}>
          <TouchableOpacity
            onPress={handleCTA}
            style={[
              styles.ctaButton,
              {
                backgroundColor: typeMeta.color,
                shadowColor: typeMeta.color,
              },
            ]}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>{ctaLabel || cta?.label}</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FACC15',
  },
  heroTitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  heroInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  heroIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  detailMessage: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    color: '#0F172A',
    letterSpacing: 0.6,
  },
  row: {
    marginBottom: 12,
  },
  rowLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  rowMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  ctaWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    gap: 10,
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  fallbackWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});

export default NotificationDetailLayout;
