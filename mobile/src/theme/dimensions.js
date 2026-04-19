import { Platform } from 'react-native';

export const fontFamilies = {
  regular: Platform.select({ ios: 'System', android: 'sans-serif' }),
  medium: Platform.select({ ios: 'System', android: 'sans-serif-medium' }),
  bold: Platform.select({ ios: 'System', android: 'sans-serif-bold' }),
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    fontFamily: fontFamilies.bold,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    fontFamily: fontFamilies.bold,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    fontFamily: fontFamilies.medium,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    fontFamily: fontFamilies.medium,
  },
  h5: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    fontFamily: fontFamilies.medium,
  },
  body1: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    fontFamily: fontFamilies.regular,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    fontFamily: fontFamilies.regular,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    fontFamily: fontFamilies.regular,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    textTransform: 'none',
    fontFamily: fontFamilies.medium,
  },
  overline: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 16,
    textTransform: 'uppercase',
    fontFamily: fontFamilies.medium,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};
