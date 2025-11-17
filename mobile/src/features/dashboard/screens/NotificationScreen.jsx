import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SAMPLE_NOTIFICATIONS, NOTIFICATION_TYPE_META } from '../data/notifications';
import { formatNotificationTime, withOpacity } from '../utils/notificationUtils';

const typeFilters = [{ key: 'all', label: 'All' }].concat(
  Object.entries(NOTIFICATION_TYPE_META).map(([key, meta]) => ({ key, label: meta.label }))
);

const getMetaLabel = (item) => {
  if (item.meta?.clinicName) return item.meta.clinicName;
  if (item.meta?.startsAt)
    return new Date(item.meta.startsAt).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  if (item.meta?.orderId) return `Order ${item.meta.orderId}`;
  if (item.meta?.invoiceId) return `Invoice ${item.meta.invoiceId}`;
  if (item.meta?.scanId) return `Scan ${item.meta.scanId}`;
  if (item.meta?.productId) return `Item ${item.meta.productId}`;
  return null;
};

const NotificationScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const initialData = useMemo(
    () =>
      route.params?.notifications?.length
        ? route.params.notifications
        : SAMPLE_NOTIFICATIONS,
    [route.params?.notifications]
  );
  const [notifications, setNotifications] = useState(initialData);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setNotifications(initialData);
  }, [initialData]);

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? notifications
        : notifications.filter((n) => n.type === filter),
    [filter, notifications]
  );

  const sortedNotifications = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [filtered]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const detailRoutes = {
    appointment: 'NotificationAppointmentDetail',
    payment: 'NotificationPaymentDetail',
    shop: 'NotificationShopDetail',
    ai: 'NotificationAIDetail',
    system: 'NotificationSystemDetail',
  };

  const handlePress = useCallback(
    (item) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
      const routeName = detailRoutes[item.type] || detailRoutes.system;
      navigation.navigate(routeName, { notification: item });
    },
    [navigation]
  );

  const renderFilter = (option) => {
    const isActive = filter === option.key;
    const count =
      option.key === 'all'
        ? notifications.length
        : notifications.filter((n) => n.type === option.key).length;
    return (
      <TouchableOpacity
        key={option.key}
        onPress={() => setFilter(option.key)}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 20,
          marginRight: 8,
          backgroundColor: isActive ? theme.colors.primary : '#F1F5F9',
        }}
      >
        <Text
          style={{
            color: isActive ? 'white' : '#475569',
            fontWeight: '600',
            fontSize: 13,
          }}
        >
          {option.label} ({count})
        </Text>
      </TouchableOpacity>
    );
  };

  const renderNotification = (item) => {
    const typeMeta = NOTIFICATION_TYPE_META[item.type] || NOTIFICATION_TYPE_META.system;
    const gradientColors = item.read
      ? ['#FFFFFF', '#FFFFFF']
      : [withOpacity(typeMeta.color, 0.25), '#FFFFFF'];
    const metaLabel = getMetaLabel(item);
    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => handlePress(item)}
        activeOpacity={0.9}
        style={{
          marginBottom: 18,
          shadowColor: '#94A3B8',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.12,
          shadowRadius: 18,
          elevation: 5,
        }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24,
            padding: 18,
            borderWidth: 1,
            borderColor: withOpacity(typeMeta.color, 0.15),
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: withOpacity(typeMeta.color, 0.15),
                borderWidth: 1,
                borderColor: withOpacity(typeMeta.color, 0.35),
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 14,
              }}
            >
              <MaterialCommunityIcons
                name={typeMeta.icon}
                size={24}
                color={typeMeta.color}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: typeMeta.color,
                  letterSpacing: 0.4,
                }}
              >
                {typeMeta.label}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: '#94A3B8',
                  fontWeight: '600',
                  marginTop: 2,
                }}
              >
                {formatNotificationTime(item.timestamp)}
              </Text>
            </View>
            {!item.read && (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: typeMeta.color,
                }}
              />
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#0F172A' }}>
              {item.title}
            </Text>
            {item.meta?.status ? (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor:
                    item.meta.status.toLowerCase() === 'failed'
                      ? withOpacity('#F87171', 0.25)
                      : withOpacity(typeMeta.color, 0.2),
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color:
                      item.meta.status.toLowerCase() === 'failed'
                        ? '#B91C1C'
                        : typeMeta.color,
                  }}
                >
                  {item.meta.status}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            style={{ fontSize: 14, color: '#475569', lineHeight: 20 }}
          >
            {item.message}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 18,
            }}
          >
            {metaLabel ? (
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: withOpacity(typeMeta.color, 0.12),
                  borderWidth: 1,
                  borderColor: withOpacity(typeMeta.color, 0.3),
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: typeMeta.color,
                  }}
                >
                  {metaLabel}
                </Text>
              </View>
            ) : (
              <View />
            )}
            <View style={{ flex: 1 }} />
            {item.cta ? (
              <TouchableOpacity
                onPress={() => handlePress(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderRadius: 24,
                  backgroundColor: typeMeta.color,
                  shadowColor: typeMeta.color,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    color: 'white',
                    fontWeight: '700',
                    fontSize: 13,
                    marginRight: 6,
                    letterSpacing: 0.3,
                  }}
                >
                  {item.cta.label}
                </Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={18}
                  color="white"
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.primary}
      />
      <View
        style={{
          backgroundColor: theme.colors.primary,
          paddingTop: 48,
          paddingBottom: 24,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              color="white"
              size={22}
            />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: 'white', fontSize: 22, fontWeight: '700' }}
            >
              Notifications
            </Text>
            <Text
              style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}
            >
              {unreadCount} unread • stay on top of your care
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleMarkAllRead}
            style={{ paddingHorizontal: 12, paddingVertical: 6 }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 16 }}
        >
          {typeFilters.map(renderFilter)}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {sortedNotifications.map(renderNotification)}
        {sortedNotifications.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <MaterialCommunityIcons
              name="bell-off"
              size={48}
              color="#CBD5F5"
            />
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                marginTop: 12,
                color: '#0F172A',
              }}
            >
              No notifications
            </Text>
            <Text style={{ color: '#475569', marginTop: 4 }}>
              You are all caught up. We will alert you when something changes.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

export default NotificationScreen;
