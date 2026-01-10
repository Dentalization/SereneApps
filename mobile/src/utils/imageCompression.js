import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';
// Use legacy API to avoid deprecated getInfoAsync warning until new File/Directory API is adopted
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Compress image to reduce file size and speed up upload
 * @param {string} uri - Image URI
 * @param {object} options - Compression options
 * @returns {Promise<{uri: string, width: number, height: number, size: number}>}
 */
export const compressImage = async (uri, options = {}) => {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    format = ImageManipulator.SaveFormat.JPEG,
  } = options;

  try {
    // Get original image info
    const fileInfo = await FileSystem.getInfoAsync(uri);
    const originalSize = fileInfo.size || 0;

    // Get original dimensions to avoid upscaling small images
    const getDimensions = () => new Promise(resolve => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        () => resolve({ width: null, height: null })
      );
    });

    const { width: originalWidth, height: originalHeight } = await getDimensions();
    const hasDimensions = Boolean(originalWidth && originalHeight);
    const widthRatio = hasDimensions ? maxWidth / originalWidth : 1;
    const heightRatio = hasDimensions ? maxHeight / originalHeight : 1;
    const scaleRatio = hasDimensions ? Math.min(widthRatio, heightRatio, 1) : 1; // Never upscale
    const shouldResize = hasDimensions && scaleRatio < 1;

    const resizeAction = shouldResize
      ? [{
          resize: {
            width: Math.round(originalWidth * scaleRatio),
            height: Math.round(originalHeight * scaleRatio),
          },
        }]
      : [];

    if (__DEV__) {
      console.log(`📸 Original image: ${(originalSize / 1024).toFixed(2)} KB`);
      if (hasDimensions) {
        console.log(`📏 Original dimensions: ${originalWidth}x${originalHeight}`);
      }
    }

    // Compress and resize
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      resizeAction,
      { compress: quality, format }
    );

    // Get compressed image info
    const compressedInfo = await FileSystem.getInfoAsync(manipResult.uri);
    const compressedSize = compressedInfo.size || 0;

    if (__DEV__) {
      if (originalSize > 0) {
        const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        const trend = reduction >= 0 ? 'smaller' : 'larger';
        console.log(
          `✅ Compressed image: ${(compressedSize / 1024).toFixed(2)} KB (${reduction}% ${trend})`
        );
      } else {
        console.log(`✅ Compressed image: ${(compressedSize / 1024).toFixed(2)} KB`);
      }
    }

    return {
      uri: manipResult.uri,
      width: manipResult.width,
      height: manipResult.height,
      size: compressedSize,
      originalSize,
    };
  } catch (error) {
    console.error('❌ Image compression failed:', error);
    // Return original if compression fails
    return { uri, size: 0, originalSize: 0 };
  }
};

/**
 * Compress multiple images
 * @param {string[]} uris - Array of image URIs
 * @param {object} options - Compression options
 * @returns {Promise<Array>}
 */
export const compressImages = async (uris, options = {}) => {
  const results = await Promise.all(
    uris.map(uri => compressImage(uri, options))
  );
  
  if (__DEV__) {
    const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalCompressed = results.reduce((sum, r) => sum + r.size, 0);
    if (totalOriginal > 0) {
      const totalReduction = ((totalOriginal - totalCompressed) / totalOriginal * 100).toFixed(1);
      const trend = totalReduction >= 0 ? 'smaller' : 'larger';
      console.log(
        `📦 Total compression: ${(totalOriginal / 1024).toFixed(2)} KB → ${(totalCompressed / 1024).toFixed(2)} KB (${totalReduction}% ${trend})`
      );
    } else {
      console.log(
        `📦 Total compression: ${(totalCompressed / 1024).toFixed(2)} KB (original size unavailable)`
      );
    }
  }
  
  return results;
};

/**
 * Check if image needs compression
 * @param {string} uri - Image URI
 * @param {number} maxSize - Max size in bytes (default 500KB)
 * @returns {Promise<boolean>}
 */
export const needsCompression = async (uri, maxSize = 500 * 1024) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return (fileInfo.size || 0) > maxSize;
  } catch (error) {
    return false;
  }
};
