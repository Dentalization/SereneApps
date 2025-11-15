import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Searchbar, Chip, Card, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SkeletonList } from '../../../components/shared/SkeletonLoader';
import EmptyState from '../../../components/shared/EmptyState';

const ClinicSearchScreen = ({ navigation }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [selectedFilter, setSelectedFilter] = React.useState('all');

  const filters = [
    { key: 'all', label: 'Semua' },
    { key: 'nearby', label: 'Terdekat' },
    { key: 'highest_rated', label: 'Rating Tertinggi' },
    { key: 'available', label: 'Tersedia Hari Ini' },
  ];

  // Mock clinics data
  const clinics = [
    {
      id: 1,
      name: 'Klinik Gigi SereneAI Sudirman',
      address: 'Jl. Sudirman No. 123, Jakarta Pusat',
      distance: '1.2 km',
      rating: 4.8,
      reviews: 245,
      availableDentists: 5,
    },
    {
      id: 2,
      name: 'Dental Care Menteng',
      address: 'Jl. Menteng Raya No. 45, Jakarta Pusat',
      distance: '2.5 km',
      rating: 4.6,
      reviews: 189,
      availableDentists: 3,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search */}
      <View style={styles.searchSection}>
        <Searchbar
          placeholder="Cari klinik atau lokasi..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        <View style={styles.filters}>
          {filters.map((filter) => (
            <Chip
              key={filter.key}
              selected={selectedFilter === filter.key}
              onPress={() => setSelectedFilter(filter.key)}
              style={styles.filterChip}
            >
              {filter.label}
            </Chip>
          ))}
        </View>
      </ScrollView>

      {/* Clinics List */}
      <ScrollView style={styles.list}>
        {clinics.map((clinic) => (
          <Card
            key={clinic.id}
            style={[styles.clinicCard, theme.shadows.sm]}
            onPress={() => navigation.navigate('ClinicDetail', { clinicId: clinic.id })}
          >
            <Card.Content>
              <Text variant="titleMedium">{clinic.name}</Text>
              <View style={styles.clinicInfo}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={16}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                  {clinic.address}
                </Text>
              </View>
              <View style={styles.clinicMeta}>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="star" size={16} color="#FFB300" />
                  <Text variant="bodySmall">{clinic.rating}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    ({clinic.reviews})
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons
                    name="doctor"
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text variant="bodySmall">{clinic.availableDentists} Dokter</Text>
                </View>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons
                    name="map-marker-distance"
                    size={16}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text variant="bodySmall">{clinic.distance}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    padding: 16,
  },
  searchbar: {
    elevation: 0,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    height: 36,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  clinicCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  clinicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  clinicMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

export default ClinicSearchScreen;
