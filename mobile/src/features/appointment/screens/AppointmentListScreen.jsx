import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import EmptyState from '../../../components/shared/EmptyState';

const AppointmentListScreen = ({ navigation }) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <EmptyState
        icon="calendar-blank"
        title="Belum Ada Janji Temu"
        description="Buat janji temu pertama Anda dengan dokter gigi terpercaya"
        action={
          <Button
            mode="contained"
            onPress={() => navigation.navigate('ClinicSearch')}
            icon="calendar-plus"
          >
            Buat Janji Temu
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

export default AppointmentListScreen;
