import React, { useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  List,
  Text,
  TextInput,
  useTheme,
  IconButton,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InfoScreenLayout from '../components/InfoScreenLayout';
import SettingsSection from '../components/SettingsSection';

const ContactSupportScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' },
    });
  }, [navigation]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Geser hero + konten sedikit ke bawah */}
      <View style={{ flex: 1, paddingTop: 30 + insets.top }}>
        <InfoScreenLayout
          heroProps={{
            title: 'Hubungi care@serene.id',
            subtitle:
              'Tim Care Concierge siap membantu kebutuhan klinis dan teknis Anda kapan saja.',
            badgeLabel: 'Response time < 5 menit',
            badgeIcon: 'email-fast',
            highlights: [
              { icon: 'clock-outline', label: 'Operasional', value: '24/7' },
              { icon: 'map-marker', label: 'Coverage', value: 'Global' },
            ],
          }}
          footerText="Anda juga dapat menghubungi WhatsApp resmi +62812-3456-7890."
        >
          <SettingsSection
            title="KONTAK LANGSUNG"
            description="Pilih kanal komunikasi favorit Anda."
          >
            <List.Item
              title="Email Care"
              description="care@serene.id"
              left={(props) => <List.Icon {...props} icon="email" />}
              right={() => <Chip icon="clock-fast">5 menit</Chip>}
            />
            <List.Item
              title="WhatsApp"
              description="+62 812-3456-7890"
              left={(props) => <List.Icon {...props} icon="whatsapp" />}
              right={() => <Chip icon="message-text-outline">Chat</Chip>}
            />
            <List.Item
              title="Telepon darurat"
              description="021-3000-0000 (24 jam)"
              left={(props) => <List.Icon {...props} icon="phone" />}
              right={() => <Chip icon="headset">Hotline</Chip>}
            />
          </SettingsSection>

          <SettingsSection
            title="KIRIM PESAN CEPAT"
            description="Kami balas melalui email dalam hitungan menit."
          >
            <TextInput mode="outlined" label="Subjek" style={styles.input} />
            <TextInput
              mode="outlined"
              label="Pesan"
              multiline
              numberOfLines={5}
              style={styles.input}
            />
            <Button mode="contained" icon="send" style={styles.sendButton}>
              Kirim ke care@serene.id
            </Button>
          </SettingsSection>

          <SettingsSection
            title="WAKTU RESPON"
            description="Ikuti status tiket Anda."
          >
            <View style={styles.timelineRow}>
              <Text
                style={[
                  styles.timelineLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Prioritas
              </Text>
              <Text style={styles.timelineValue}>Klinis mendesak</Text>
              <Text style={styles.timelineEta}>⏱ 2 menit</Text>
            </View>
            <View style={styles.timelineRow}>
              <Text
                style={[
                  styles.timelineLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Standar
              </Text>
              <Text style={styles.timelineValue}>Janji & billing</Text>
              <Text style={styles.timelineEta}>⏱ 5 menit</Text>
            </View>
            <View style={styles.timelineRow}>
              <Text
                style={[
                  styles.timelineLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Non-urgent
              </Text>
              <Text style={styles.timelineValue}>Saran fitur</Text>
              <Text style={styles.timelineEta}>⏱ 30 menit</Text>
            </View>
          </SettingsSection>
        </InfoScreenLayout>
      </View>

      {/* Back button overlay konsisten dengan screen lain */}
      <View
        style={{
          position: 'absolute',
          left: 16,
          top: insets.top + 8,
          zIndex: 999,
          elevation: 999,
        }}
      >
        <IconButton
          icon="arrow-left"
          iconColor="white"
          size={24}
          onPress={() => navigation.goBack()}
          style={{ margin: 0 }}
          containerColor="rgba(0,0,0,0.3)"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  input: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sendButton: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  timelineLabel: {
    width: 80,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timelineValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  timelineEta: {
    fontSize: 13,
  },
});

export default ContactSupportScreen;
