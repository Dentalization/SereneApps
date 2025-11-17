import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { Divider, Text, useTheme } from 'react-native-paper';
import AuthHero from './AuthHero';

const InfoScreenLayout = ({ heroProps, footerText, children }) => {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {heroProps && <AuthHero {...heroProps} />}
        {children}
        {footerText && (
          <>
            <Divider style={styles.footerDivider} />
            <Text
              variant="bodySmall"
              style={[styles.footer, { color: theme.colors.onSurfaceVariant }]}
            >
              {footerText}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingVertical: 24,
  },
  footerDivider: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  footer: {
    marginHorizontal: 16,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default InfoScreenLayout;
