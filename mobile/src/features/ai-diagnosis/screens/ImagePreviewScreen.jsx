import React from 'react';
import { View, StyleSheet, Image, ScrollView, Dimensions } from 'react-native';
import { Text, Button, useTheme, IconButton } from 'react-native-paper';

const { width } = Dimensions.get('window');

const ImagePreviewScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const { images } = route.params;
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const handleAnalyze = () => {
    navigation.navigate('Analysis', { images });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Main Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: images[selectedIndex].uri }}
          style={styles.mainImage}
          resizeMode="contain"
        />
      </View>

      {/* Thumbnails */}
      {images.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnails}>
          {images.map((image, index) => (
            <View key={index} style={styles.thumbnailContainer}>
              <Image
                source={{ uri: image.uri }}
                style={[
                  styles.thumbnail,
                  selectedIndex === index && styles.thumbnailSelected,
                ]}
                onTouchEnd={() => setSelectedIndex(index)}
              />
              <IconButton
                icon="close-circle"
                size={20}
                iconColor={theme.colors.error}
                style={styles.removeButton}
                onPress={() => {
                  // Handle remove image
                }}
              />
            </View>
          ))}
        </ScrollView>
      )}

      {/* Info */}
      <View style={styles.info}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {images.length} foto dipilih • Kualitas: Baik
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          Ambil Ulang
        </Button>
        <Button
          mode="contained"
          onPress={handleAnalyze}
          style={[styles.button, styles.analyzeButton]}
          icon="brain"
        >
          Analisis
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  mainImage: {
    width: width,
    height: '100%',
  },
  thumbnails: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  thumbnailContainer: {
    marginRight: 8,
    position: 'relative',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailSelected: {
    borderColor: '#00BFA6',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    margin: 0,
  },
  info: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
  },
  analyzeButton: {
    flex: 2,
  },
});

export default ImagePreviewScreen;
