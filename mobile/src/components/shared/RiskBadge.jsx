import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const RiskBadge = ({ level, label, size = 'medium', style }) => {
  const theme = useTheme();

  const getRiskConfig = () => {
    const configs = {
      critical: {
        color: theme.medicalAlert.critical.badge,
        backgroundColor: theme.medicalAlert.critical.background,
        textColor: theme.medicalAlert.critical.text,
        icon: 'alert-circle',
        label: label || 'Kritis',
      },
      high: {
        color: theme.medicalAlert.high.badge,
        backgroundColor: theme.medicalAlert.high.background,
        textColor: theme.medicalAlert.high.text,
        icon: 'alert',
        label: label || 'Tinggi',
      },
      medium: {
        color: theme.medicalAlert.medium.badge,
        backgroundColor: theme.medicalAlert.medium.background,
        textColor: theme.medicalAlert.medium.text,
        icon: 'alert-circle-outline',
        label: label || 'Sedang',
      },
      low: {
        color: theme.medicalAlert.low.badge,
        backgroundColor: theme.medicalAlert.low.background,
        textColor: theme.medicalAlert.low.text,
        icon: 'check-circle',
        label: label || 'Rendah',
      },
      healthy: {
        color: theme.colors.success,
        backgroundColor: theme.colors.successContainer,
        textColor: theme.semantic.success.dark,
        icon: 'check-circle',
        label: label || 'Sehat',
      },
    };

    return configs[level] || configs.low;
  };

  const config = getRiskConfig();

  return (
    <Chip
      icon={() => (
        <MaterialCommunityIcons
          name={config.icon}
          size={size === 'small' ? 14 : 16}
          color={config.textColor}
        />
      )}
      textStyle={[
        styles.chipText,
        { color: config.textColor },
        size === 'small' && styles.smallText,
      ]}
      style={[
        styles.chip,
        { backgroundColor: config.backgroundColor },
        size === 'small' && styles.smallChip,
        style,
      ]}
    >
      {config.label}
    </Chip>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
  },
  smallChip: {
    height: 24,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  smallText: {
    fontSize: 10,
  },
});

export default RiskBadge;
