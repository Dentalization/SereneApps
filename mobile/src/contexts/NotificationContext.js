import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../services/api';
import {
  getNotifications as apiGetNotifications,
  markNotificationAsRead as apiMarkNotificationAsRead,
  markAllNotificationsAsRead as apiMarkAllNotificationsAsRead
} from '../services/notificationService';

const NotificationContext = createContext(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

const NOTIFICATION_TYPE_META = {
  appointment: { label: 'Janji Temu', icon: 'calendar-clock', color: '#6366F1' },
  payment: { label: 'Pembayaran', icon: 'wallet', color: '#10B981' },
  ai: { label: 'AI Diagnosis', icon: 'brain', color: '#8B5CF6' },
  shop: { label: 'Toko Gigi', icon: 'cart', color: '#F59E0B' },
  system: { label: 'Sistem', icon: 'bell', color: '#6B7280' }
};

function getMobileNotificationType(type) {
  if (!type) return 'system';
  const t = type.toLowerCase();
  if (t.startsWith('appointment_')) return 'appointment';
  if (t === 'chat_invite') return 'appointment';
  if (t.startsWith('treatment_plan_')) return 'appointment';
  if (t.startsWith('payment_') || t.includes('payment')) return 'payment';
  if (t.startsWith('ai_')) return 'ai';
  if (t.startsWith('shop_')) return 'shop';
  return 'system';
}

function getMobileNotificationCTA(type, data) {
  const apptId = data?.appointmentId || '';
  const planId = data?.treatmentPlanId || '';
  const invoiceId = data?.invoiceId || '';

  switch (type) {
    case 'appointment_confirmed':
    case 'appointment_rescheduled':
    case 'appointment_reminder':
      return {
        label: 'Lihat detail',
        route: {
          name: 'AppointmentTab',
          params: { screen: 'BookingConfirm', params: { appointmentId: apptId } },
        }
      };
    case 'chat_invite':
      return {
        label: 'Mulai Chat',
        route: {
          name: 'PatientTeledentistry',
          params: { appointmentId: apptId }
        }
      };
    case 'treatment_plan_sent':
      return {
        label: 'Tinjau Rencana',
        route: {
          name: 'TreatmentPlan',
          params: { treatmentPlanId: planId, invoiceId }
        }
      };
    case 'treatment_plan_approved':
    case 'treatment_plan_rejected':
      return {
        label: 'Lihat Rencana',
        route: {
          name: 'TreatmentPlan',
          params: { treatmentPlanId: planId }
        }
      };
    default:
      return null;
  }
}

function mapDatabaseNotification(dbNotif) {
  const type = getMobileNotificationType(dbNotif.type);
  const cta = getMobileNotificationCTA(dbNotif.type, dbNotif.data);

  return {
    id: dbNotif.id.toString(),
    type,
    title: dbNotif.title,
    message: dbNotif.message,
    timestamp: dbNotif.created_at,
    read: dbNotif.is_read,
    meta: dbNotif.data || {},
    cta
  };
}

export const NotificationProvider = ({ children }) => {
  const user = useSelector((state) => state?.auth?.user);
  const accessToken = useSelector((state) => state?.auth?.accessToken);
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  const fetchNotifications = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiGetNotifications({ limit: 100 });
      if (res && res.success && res.data?.notifications) {
        const mapped = res.data.notifications.map(mapDatabaseNotification);
        setNotifications(mapped);
      }
    } catch (err) {
      console.error('[NotificationContext Mobile] Failed to load notifications:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Fetch initial on mount / user change
  useEffect(() => {
    if (user && accessToken) {
      fetchNotifications(true);
    } else {
      setNotifications([]);
    }
  }, [user, accessToken, fetchNotifications]);

  // Connect socket
  useEffect(() => {
    if (!user || !accessToken) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    console.log('🔌 Connecting mobile notification socket to:', API_BASE_URL);
    const newSocket = io(API_BASE_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('🔌 Mobile notification socket connected');
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Mobile notification socket disconnected');
    });

    newSocket.on('notification:new', (newNotif) => {
      console.log('🔔 Received mobile new realtime notification:', newNotif);
      
      const mapped = mapDatabaseNotification(newNotif);
      setNotifications((prev) => {
        // Prevent duplicate addition
        if (prev.some((n) => n.id === mapped.id)) return prev;
        return [mapped, ...prev];
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, accessToken]);

  const markAsRead = useCallback(async (id) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      await apiMarkNotificationAsRead(id);
    } catch (err) {
      console.error('[NotificationContext Mobile] Failed to mark read:', err);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await apiMarkAllNotificationsAsRead();
    } catch (err) {
      console.error('[NotificationContext Mobile] Failed to mark all read:', err);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
