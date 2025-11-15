import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import EmptyState from '../../../components/shared/EmptyState';

const HistoryScreen = ({ navigation }) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <EmptyState
        icon="history"
        title="Belum Ada Riwayat"
        description="Riwayat diagnosis AI Anda akan muncul di sini"
        action={
          <Button
            mode="contained"
            onPress={() => navigation.navigate('AIHome')}
            icon="camera"
          >
            Mulai Scan
          </Button>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default HistoryScreen;
