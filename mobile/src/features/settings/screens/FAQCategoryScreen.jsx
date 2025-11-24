import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, List, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InfoScreenLayout from '../components/InfoScreenLayout';
import SettingsSection from '../components/SettingsSection';
import { faqCategories } from '../data/faqData';

const FAQCategoryScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { categoryId } = route.params || {};

  const category = useMemo(
    () => faqCategories.find((item) => item.id === categoryId) || faqCategories[0],
    [categoryId]
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      
      {/* PERBAIKAN: Hapus padding top manual. Biarkan layout full screen (immersive). */}
      <View style={{ flex: 1 }}>
        <InfoScreenLayout
          heroProps={{
            title: category.title,
            subtitle: category.description,
            badgeLabel: `${category.articles} artikel panduan`,
            badgeIcon: category.icon,
            highlights: [
              { icon: 'book-open-page-variant', label: 'Artikel', value: `${category.articles}` },
              { icon: 'clock-check', label: 'Waktu baca', value: '±2 menit' },
            ],
          }}
          footerText="Masih belum terjawab? Chat dengan tim Care kapan saja."
        >
          <SettingsSection
            title="FAQ TERKAIT"
            description="Kembangkan pengetahuan Anda dengan panduan berikut."
          >
            {category.faqs.map((faq) => (
              <List.Accordion
                key={faq.question}
                title={faq.question}
                titleStyle={styles.accordionTitle}
                right={(props) => <List.Icon {...props} icon="chevron-down" />}
              >
                <Text
                  style={[styles.answer, { color: theme.colors.onSurfaceVariant }]}
                >
                  {faq.answer}
                </Text>
              </List.Accordion>
            ))}
          </SettingsSection>

          <View style={styles.tipBox}>
            <Text variant="labelLarge" style={{ marginBottom: 6 }}>
              Tips Serene
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Kami menambahkan artikel baru setiap minggu berdasarkan pertanyaan yang
              Anda kirim. Pastikan aplikasi Anda selalu terbaru untuk merasakan
              peningkatan pengalaman.
            </Text>
          </View>
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
  accordionTitle: {
    fontWeight: '600',
  },
  answer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  tipBox: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(98,16,159,0.08)',
  },
});

export default FAQCategoryScreen;