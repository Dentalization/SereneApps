import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

const SettingsSection = ({
  title,
  description,
  children,
  style,
  cardStyle,
  action,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      {(title || description || action) && (
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            {title && (
              <Text
                variant="labelMedium"
                style={[styles.title, { color: theme.colors.onSurfaceVariant }]}
              >
                {title}
              </Text>
            )}
            {description && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, opacity: 0.8 }}
              >
                {description}
              </Text>
            )}
          </View>
          {action}
        </View>
      )}

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }, cardStyle]}>
        <View style={styles.cardInner}>{children}</View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    letterSpacing: 1,
    marginBottom: 4,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
  },
  cardInner: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    paddingVertical: 4,
  },
});

export default SettingsSection;
