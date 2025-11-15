import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from 'react-native-paper';

const SkeletonLoader = ({ width = '100%', height = 60, borderRadius = 8, style }) => {
  const theme = useTheme();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.surfaceVariant,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const SkeletonCard = ({ style }) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface },
        theme.shadows.sm,
        style,
      ]}
    >
      <SkeletonLoader width={60} height={60} borderRadius={8} />
      <View style={styles.content}>
        <SkeletonLoader width="70%" height={16} borderRadius={4} />
        <SkeletonLoader width="50%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
        <SkeletonLoader width="40%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
};

export const SkeletonList = ({ count = 3, style }) => {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} style={{ marginBottom: 12 }} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
  },
  content: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
});

export default SkeletonLoader;
