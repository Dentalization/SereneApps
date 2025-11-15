import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Portal, Modal, Text, Button, useTheme } from 'react-native-paper';

const AuthGuard = ({ visible, onDismiss, onOTPLogin, onFullLogin, requiresFullAccount = false }) => {
  const theme = useTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
          {requiresFullAccount ? 'Akun Diperlukan' : 'Login Diperlukan'}
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          {requiresFullAccount
            ? 'Silakan lengkapi registrasi untuk melanjutkan pembayaran dan menyimpan data Anda.'
            : 'Silakan verifikasi nomor telepon Anda untuk melanjutkan booking janji temu.'}
        </Text>

        <View style={styles.actions}>
          {requiresFullAccount ? (
            <>
              <Button mode="contained" onPress={onFullLogin} style={styles.button}>
                Daftar / Login
              </Button>
              <Button mode="text" onPress={onDismiss} style={styles.button}>
                Nanti
              </Button>
            </>
          ) : (
            <>
              <Button mode="contained" onPress={onOTPLogin} style={styles.button}>
                Verifikasi dengan OTP
              </Button>
              <Button mode="outlined" onPress={onFullLogin} style={styles.button}>
                Login dengan Akun
              </Button>
              <Button mode="text" onPress={onDismiss} style={styles.button}>
                Nanti
              </Button>
            </>
          )}
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 16,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    gap: 12,
  },
  button: {
    width: '100%',
  },
});

export default AuthGuard;
