import React, { useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { List, Searchbar, Text, useTheme, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SettingsSection from '../components/SettingsSection';
import InfoScreenLayout from '../components/InfoScreenLayout';
import { faqCategories } from '../data/faqData';

const FAQCategoriesScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = React.useState('');

  useLayoutEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' },
    });
  }, [navigation]);

  const filtered = faqCategories.filter((category) =>
    category.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Geser seluruh layout (hero card + content) sedikit ke bawah */}
      <View style={{ flex: 1, paddingTop: 30 + insets.top }}>
        <InfoScreenLayout
          heroProps={{
            title: 'Kategori FAQ Serene',
            subtitle: 'Telusuri panduan detail untuk setiap fitur Serene.',
            badgeLabel: `${faqCategories.length} kategori aktif`,
            badgeIcon: 'view-grid',
            highlights: [
              { icon: 'account-question', label: 'FAQ', value: '35+' },
              { icon: 'clock-fast', label: 'Update', value: 'Mingguan' },
            ],
          }}
        >
          <View style={styles.searchWrapper}>
            <Searchbar
              placeholder="Cari kategori..."
              value={query}
              onChangeText={setQuery}
              style={styles.searchbar}
            />
          </View>

          <SettingsSection title="SEMUA KATEGORI">
            {filtered.map((category) => (
              <List.Item
                key={category.id}
                title={category.title}
                description={`${category.description} • ${category.articles} artikel`}
                left={(props) => <List.Icon {...props} icon={category.icon} />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => navigation.navigate('FAQCategory', { categoryId: category.id })}
              />
            ))}
            {filtered.length === 0 && (
              <Text style={{ padding: 16, color: theme.colors.onSurfaceVariant }}>
                Tidak ada kategori yang cocok dengan pencarian Anda.
              </Text>
            )}
          </SettingsSection>
        </InfoScreenLayout>
      </View>

      {/* Back button di luar content, inline style satu baris */}
      <View style={{ position: 'absolute', left: 16, top: insets.top + 8, zIndex: 999, elevation: 999 }}>
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
  searchWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchbar: {
    borderRadius: 16,
  },
});

export default FAQCategoriesScreen;
