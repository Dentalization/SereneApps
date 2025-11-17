import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Animated, View, PanResponder } from 'react-native';
import { Portal, Text, IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const STATUS_CONFIG = (theme) => ({
  success: {
    icon: 'check-circle',
    label: 'Berhasil',
    gradient: theme.gradients?.secondary || ['#00BFA6', '#5DF2D6'],
    iconColor: '#FFFFFF',
  },
  error: {
    icon: 'alert-circle',
    label: 'Butuh perhatian',
    gradient: theme.gradients?.error || ['#F44336', '#FF7961'],
    iconColor: '#FFFFFF',
  },
  warning: {
    icon: 'alert',
    label: 'Perlu dicek',
    gradient: theme.gradients?.warning || ['#FF9800', '#FFD54F'],
    iconColor: '#3B2E00',
  },
  info: {
    icon: 'information',
    label: 'Informasi',
    gradient: theme.gradients?.primary || ['#62109F', '#982BEA'],
    iconColor: '#FFFFFF',
  },
});

const ValidationToast = ({ visible, message, onDismiss, status = 'info' }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // animasi muncul/hilang (opacity, slide dari atas, scale)
  const animation = useRef(new Animated.Value(0)).current;
  // animasi swipe
  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeY = useRef(new Animated.Value(0)).current;
  const gestureDirection = useRef(null); // 'horizontal' | 'vertical'

  const config = STATUS_CONFIG(theme)[status] || STATUS_CONFIG(theme).info;

  // Animasi show/hide
  useEffect(() => {
    if (visible) {
      swipeX.setValue(0);
      swipeY.setValue(0);
      gestureDirection.current = null;
    }

    Animated.timing(animation, {
      toValue: visible ? 1 : 0,
      duration: visible ? 240 : 180,
      useNativeDriver: true,
    }).start();
  }, [visible, animation, swipeX, swipeY]);

  // Auto-hide 5 detik
  useEffect(() => {
    if (!visible || !onDismiss) return undefined;
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // mulai ambil gesture kalau gerakan cukup besar
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6,

        onPanResponderGrant: () => {
          gestureDirection.current = null;
          swipeX.setValue(0);
          swipeY.setValue(0);
        },

        onPanResponderMove: (_, gesture) => {
          // lock axis berdasarkan gerakan dominan di awal
          if (!gestureDirection.current) {
            if (Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
              gestureDirection.current = 'horizontal';
            } else {
              gestureDirection.current = 'vertical';
            }
          }

          if (gestureDirection.current === 'horizontal') {
            swipeX.setValue(gesture.dx);
            swipeY.setValue(0);
          } else if (gestureDirection.current === 'vertical') {
            swipeY.setValue(gesture.dy);
            swipeX.setValue(0);
          }
        },

        onPanResponderRelease: (_, gesture) => {
          const direction = gestureDirection.current;
          const isHorizontal = direction === 'horizontal';
          const isVertical = direction === 'vertical';

          let shouldDismiss = false;
          let dismissAnim = null;

          if (isHorizontal && Math.abs(gesture.dx) > 80) {
            // swipe kiri/kanan
            const dir = gesture.dx > 0 ? 1 : -1;
            shouldDismiss = true;
            dismissAnim = Animated.parallel([
              Animated.timing(swipeX, {
                toValue: dir * 400,
                duration: 220,
                useNativeDriver: true,
              }),
              Animated.timing(animation, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
            ]);
          } else if (isVertical && gesture.dy < -60) {
            // swipe ke atas
            shouldDismiss = true;
            dismissAnim = Animated.parallel([
              Animated.timing(swipeY, {
                toValue: -220,
                duration: 220,
                useNativeDriver: true,
              }),
              Animated.timing(animation, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
            ]);
          }

          if (shouldDismiss && dismissAnim) {
            dismissAnim.start(() => {
              swipeX.setValue(0);
              swipeY.setValue(0);
              gestureDirection.current = null;
              onDismiss?.();
            });
          } else {
            // balikin ke posisi awal
            Animated.parallel([
              Animated.spring(swipeX, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 8,
                speed: 18,
              }),
              Animated.spring(swipeY, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 8,
                speed: 18,
              }),
            ]).start(() => {
              gestureDirection.current = null;
            });
          }
        },
      }),
    [animation, swipeX, swipeY, onDismiss]
  );

  const scale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  return (
    <Portal>
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[
          styles.container,
          {
            top: insets.top + 8,
            opacity: animation,
            transform: [
              {
                translateY: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-40, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View
          style={{
            transform: [{ translateX: swipeX }, { translateY: swipeY }, { scale }],
          }}
          {...panResponder.panHandlers}
        >
          <LinearGradient
            colors={config.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.card, theme?.shadows?.lg]}
          >
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name={config.icon} size={18} color={config.iconColor} />
            </View>
            <View style={styles.textGroup}>
              <Text variant="labelSmall" style={[styles.label, { color: config.iconColor }]}>
                {config.label}
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.message, { color: '#FFFFFF' }]}
                numberOfLines={2}
              >
                {message}
              </Text>
            </View>
            {onDismiss && (
              <IconButton
                icon="close"
                size={16}
                onPress={onDismiss}
                iconColor={config.iconColor}
                style={styles.closeButton}
              />
            )}
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 99,
    paddingHorizontal: 12,
  },
  card: {
    alignSelf: 'stretch',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textGroup: {
    flex: 1,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 1,
    opacity: 0.85,
  },
  message: {
    color: '#FFFFFF',
  },
  closeButton: {
    marginLeft: 4,
    marginRight: -4,
  },
});

export default ValidationToast;
