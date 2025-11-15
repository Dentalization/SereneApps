import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

const ClinicDetailScreen = ({ route }) => {
  const theme = useTheme();
  const { clinicId } = route.params;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="titleLarge">Clinic Detail Screen</Text>
        <Text>Clinic ID: {clinicId}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
});

export default ClinicDetailScreen;
