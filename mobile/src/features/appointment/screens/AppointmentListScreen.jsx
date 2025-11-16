import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import EmptyState from '../../../components/shared/EmptyState';
import { getAppointmentsByStatus, APPOINTMENTS } from '../data/appointments';

const AppointmentListScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [tab, setTab] = useState('upcoming');

  const appointments = useMemo(() => getAppointmentsByStatus(tab), [tab]);
  const upcomingCount = getAppointmentsByStatus('upcoming').length;
  const completedCount = getAppointmentsByStatus('completed').length;

  useFocusEffect(
    React.useCallback(() => {
      const isDark = theme.dark;
      const surface = isDark
        ? theme.colors.elevation?.level2 || '#121212'
        : theme.colors.surface || '#FFFFFF';
      const borderTop = isDark
        ? 'rgba(255,255,255,0.06)'
        : theme.colors.outlineVariant || 'rgba(0,0,0,0.06)';

      navigation.getParent()?.setOptions({
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          paddingTop: 12,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: borderTop,
          elevation: isDark ? 0 : 12,
          shadowColor: isDark ? 'transparent' : '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0 : 0.06,
          shadowRadius: isDark ? 0 : 12,
        },
      });
    }, [navigation, theme])
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* HEADER (ANCHOR) */}
      <LinearGradient
        colors={[theme.colors.primary, '#7F1DFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: 20,
          paddingTop: 52,
          paddingBottom: 32,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Janji temu Anda</Text>
            <Text style={{ color: 'white', fontSize: 26, fontWeight: '700', marginTop: 4 }}>
              Kelola jadwal
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
              {upcomingCount} upcoming · {completedCount} completed
            </Text>
          </View>
          <Button
            icon="calendar-plus"
            mode="contained"
            onPress={() => navigation.navigate('ClinicSearch')}
            labelStyle={{ fontWeight: '700' }}
            style={{ borderRadius: 16 }}
          >
            Buat janji
          </Button>
        </View>
      </LinearGradient>

      {/* WRAPPER UNTUK TABS + SCROLLABLE LIST */}
      <View style={{ flex: 1, marginTop: -24 }}>
        {/* STATUS TABS (ANCHOR) */}
        <View style={{ paddingHorizontal: 20 }}>
          <StatusTabs value={tab} onChange={setTab} />
        </View>

        {/* HANYA APPOINTMENT CARD YANG SCROLLABLE */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        >
          {appointments.length === 0 ? (
            <EmptyState
              icon="calendar-blank"
              title="Belum Ada Janji Temu"
              description="Buat janji temu pertama Anda dengan dokter gigi terpercaya"
              action={
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('ClinicSearch')}
                  icon="calendar-plus"
                >
                  Buat Janji Temu
                </Button>
              }
            />
          ) : (
            appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onJoin={() =>
                  navigation.navigate('BookingConfirm', { appointmentId: appointment.id })
                }
                onReschedule={() =>
                  navigation.navigate('BookingSlot', {
                    dentistId: appointment.dentist.id,
                    appointmentId: appointment.id,
                  })
                }
              />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const StatusTabs = ({ value, onChange }) => {
  const tabs = [
    { key: 'upcoming', label: 'Upcoming', count: getAppointmentsByStatus('upcoming').length },
    { key: 'completed', label: 'Completed', count: getAppointmentsByStatus('completed').length },
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 18,
        padding: 4,
        marginBottom: 20,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 4,
      }}
    >
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 14,
              backgroundColor: active ? '#EEF2FF' : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontWeight: '700',
                color: active ? '#4C1D95' : '#64748B',
              }}
            >
              {tab.label}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: active ? '#4C1D95' : '#94A3B8',
              }}
            >
              {tab.count} bookings
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const AppointmentCard = ({ appointment, onJoin, onReschedule }) => {
  const starts = new Date(appointment.startsAt);
  const dateText = starts.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const timeText = starts.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const typeColor = appointment.type === 'virtual' ? '#2563EB' : '#0EA5E9';
  const canJoin = appointment.type === 'virtual' && appointment.actions?.canJoinCall;
  const showPrimary = appointment.status === 'upcoming';

  return (
    <View
      style={{
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#EEF2FF',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: '#0F172A',
            }}
          >
            {dateText}
          </Text>
          <Text style={{ color: '#94A3B8' }}>{timeText} WIB</Text>
        </View>
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: `${typeColor}1A`,
          }}
        >
          <Text
            style={{
              color: typeColor,
              fontWeight: '700',
              fontSize: 12,
            }}
          >
            {appointment.type === 'virtual' ? 'Virtual' : 'Onsite'}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: '#EEF2FF',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <MaterialCommunityIcons name="tooth-outline" size={28} color="#6366F1" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontWeight: '700',
              color: '#0F172A',
            }}
          >
            {appointment.dentist.name}
          </Text>
          <Text
            style={{
              color: '#64748B',
              fontSize: 12,
            }}
          >
            {appointment.clinic.name}
          </Text>
        </View>
      </View>

      <View
        style={{
          marginTop: 14,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <MaterialCommunityIcons
          name="message-text-outline"
          size={16}
          color="#A5B4FC"
        />
        <Text
          style={{
            marginLeft: 6,
            color: '#475569',
          }}
        >
          {appointment.reason}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          marginTop: 18,
        }}
      >
        {showPrimary ? (
          <Button
            mode="contained"
            icon={canJoin ? 'video' : 'calendar-edit'}
            style={{ flex: 1, marginRight: 10 }}
            onPress={canJoin ? onJoin : onReschedule}
          >
            {canJoin ? 'Join Call' : 'Reschedule'}
          </Button>
        ) : (
          <Button
            mode="contained"
            style={{ flex: 1, marginRight: 10 }}
            onPress={onReschedule}
          >
            Book again
          </Button>
        )}
        {showPrimary ? (
          <Button mode="outlined" style={{ flex: 1 }}>
            Cancel
          </Button>
        ) : null}
      </View>
    </View>
  );
};

export default AppointmentListScreen;
