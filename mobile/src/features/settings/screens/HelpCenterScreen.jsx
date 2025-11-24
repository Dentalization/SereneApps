import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Button, List, Text, useTheme, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InfoScreenLayout from '../components/InfoScreenLayout';
import SettingsSection from '../components/SettingsSection';
import { faqCategories, popularFaqs } from '../data/faqData';

const HelpCenterScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const featuredCategories = faqCategories.slice(0, 3);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      
      {/* PERBAIKAN: Hapus padding top manual. Biarkan layout full screen (immersive). */}
      <View style={{ flex: 1 }}>
        <InfoScreenLayout
          heroProps={{
            title: 'Pusat Bantuan Serene',
            subtitle:
              'Panduan self-service untuk menyelesaikan kebutuhan pasien dalam hitungan menit.',
            badgeLabel: 'Layanan langsung 24/7',
            badgeIcon: 'headset',
            highlights: [
              { icon: 'clock-fast', label: 'Respons', value: '< 5 menit' },
              { icon: 'account-group', label: 'Agen', value: '50+ personel' },
            ],
          }}
          footerText="Masih butuh bantuan? Pilih Hubungi Care untuk berbicara dengan agen."
        >
          <SettingsSection
            title="KATEGORI FAQ"
            description="Mulai dari menu di bawah atau lihat semua kategori."
            action={
              <Button
                compact
                mode="text"
                onPress={() => navigation.navigate('FAQCategories')}
              >
                Lihat semua
              </Button>
            }
          >
            <View style={styles.categoryGrid}>
              {featuredCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    theme?.shadows?.sm,
                    { backgroundColor: theme.colors.surface },
                  ]}
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate('FAQCategory', { categoryId: category.id })
                  }
                >
                  <View style={styles.categoryIconWrapper}>
                    <List.Icon icon={category.icon} color={theme.colors.primary} />
                  </View>
                  <Text variant="titleSmall" style={styles.categoryTitle}>
                    {category.title}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                    numberOfLines={2}
                  >
                    {category.description}
                  </Text>
                  <Text variant="labelSmall" style={styles.categoryMeta}>
                    {category.articles} artikel panduan
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingsSection>

          <SettingsSection title="PERTANYAAN POPULER">
            {popularFaqs.map((item) => (
              <List.Accordion
                key={item.question}
                title={item.question}
                titleStyle={styles.accordionTitle}
                right={(props) => <List.Icon {...props} icon="chevron-down" />}
              >
                <Text
                  style={[styles.answer, { color: theme.colors.onSurfaceVariant }]}
                >
                  {item.answer}
                </Text>
              </List.Accordion>
            ))}
          </SettingsSection>
        </InfoScreenLayout>
      </View>

      {/* Floating Back Button - Posisinya sudah benar */}
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
    marginBottom: 4,
  },
  categoryCard: {
    flexBasis: '48%',
    borderRadius: 16,
    padding: 12,
  },
  categoryIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(98,16,159,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryTitle: {
    marginBottom: 4,
    fontWeight: '600',
  },
  categoryMeta: {
    marginTop: 6,
    color: '#62109F',
  },
  accordionTitle: {
    fontWeight: '600',
  },
  answer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default HelpCenterScreen;