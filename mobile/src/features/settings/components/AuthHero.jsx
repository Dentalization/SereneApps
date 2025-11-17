import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const AuthHero = ({
  title,
  subtitle,
  badgeLabel,
  badgeIcon = 'shield-check',
  highlights = [],
}) => {
  const theme = useTheme();

  return (
    <LinearGradient
      colors={theme?.gradients?.primary || [theme.colors.primary, theme.colors.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      {badgeLabel && (
        <View style={styles.badge}>
          <MaterialCommunityIcons
            name={badgeIcon}
            size={16}
            color={theme.colors.onPrimary}
          />
          <Text variant="labelSmall" style={styles.badgeText}>
            {badgeLabel}
          </Text>
        </View>
      )}

      <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onPrimary }]}>
        {title}
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.subtitle, { color: theme.colors.onPrimary, opacity: 0.9 }]}
      >
        {subtitle}
      </Text>

      {highlights.length > 0 && (
        <View style={styles.highlightRow}>
          {highlights.map((item, index) => (
            <View
              key={item.label}
              style={[styles.highlightCard, index !== highlights.length - 1 && styles.highlightSpacing]}
            >
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={18}
                  color={theme.colors.onPrimary}
                />
              </View>
              <Text
                variant="labelSmall"
                style={[styles.highlightLabel, { color: theme.colors.onPrimary, opacity: 0.8 }]}
              >
                {item.label}
              </Text>
              <Text variant="titleMedium" style={{ color: theme.colors.onPrimary }}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  hero: {
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  title: {
    marginBottom: 4,
    fontWeight: '700',
  },
  subtitle: {
    marginBottom: 20,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  highlightCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 12,
  },
  highlightSpacing: {
    marginRight: 12,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  highlightLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
});

export default AuthHero;
