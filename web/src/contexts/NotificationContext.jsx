import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { getAccessToken } from '../utils/auth/tokenStorage';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import {
  getNotifications as apiGetNotifications,
  markNotificationAsRead as apiMarkNotificationAsRead,
  markAllNotificationsAsRead as apiMarkAllNotificationsAsRead
} from '../services/dentistPortalService';

const NotificationContext = createContext(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

function parseNotificationTime(createdAtStr) {
  const date = new Date(createdAtStr);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let timeframe = 'Earlier';
  if (date.toDateString() === now.toDateString()) {
    timeframe = 'Today';
  } else if (diffDays <= 7) {
    timeframe = 'Last 7 Days';
  }
  
  const hourMin = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) + ' WIB';
  let timestamp = hourMin;
  if (timeframe !== 'Today') {
    const day = date.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    timestamp = `${day} ${month} · ${hourMin}`;
  }
  
  return { timeframe, timestamp };
}

function getCategory(type) {
  if (!type) return 'default';
  const t = type.toLowerCase();
  if (t.startsWith('appointment_')) return 'appointments';
  if (t === 'chat_invite') return 'teledentistry';
  if (t.startsWith('treatment_plan_')) return 'clinical';
  if (t.startsWith('ai_')) return 'clinical';
  return 'default';
}

function getTag(type) {
  switch (type) {
    case 'appointment_confirmed': return 'Schedule';
    case 'appointment_cancelled': return 'Cancelled';
    case 'appointment_rescheduled': return 'Reschedule';
    case 'appointment_reminder': return 'Reminder';
    case 'chat_invite': return 'Virtual Care';
    case 'treatment_plan_sent': return 'Treatment Plan';
    case 'treatment_plan_approved': return 'Approved';
    case 'treatment_plan_rejected': return 'Rejected';
    default: return 'System';
  }
}

function getSeverity(type) {
  switch (type) {
    case 'appointment_cancelled':
    case 'appointment_payment_failed':
      return 'high';
    case 'appointment_reminder':
    case 'chat_invite':
      return 'medium';
    default:
      return 'low';
  }
}

function getActions(type, data) {
  switch (type) {
    case 'appointment_confirmed':
    case 'appointment_rescheduled':
    case 'appointment_reminder':
      return [{ label: 'Review Jadwal', href: `/dentist-portal/schedule` }];
    case 'chat_invite':
      return [{ label: 'Buka Konsultasi', href: `/dentist-portal/teledentistry` }];
    case 'treatment_plan_sent':
    case 'treatment_plan_approved':
    case 'treatment_plan_rejected':
      if (data?.patient?.id) {
        return [{ label: 'Tinjau Treatment', href: `/dentist-portal/patient-emr/${data.patient.id}` }];
      }
      return [{ label: 'Tinjau Treatment', href: `/dentist-portal/patient` }];
    default:
      return [];
  }
}

function mapDatabaseNotification(dbNotif) {
  const { timeframe, timestamp } = parseNotificationTime(dbNotif.created_at);
  return {
    id: dbNotif.id,
    category: getCategory(dbNotif.type),
    title: dbNotif.title,
    description: dbNotif.message,
    timeframe,
    timestamp,
    tag: getTag(dbNotif.type),
    meta: dbNotif.data?.clinicName || dbNotif.data?.startsAt ? 
      `${dbNotif.data?.clinicName || ''} ${dbNotif.data?.startsAt ? '• ' + new Date(dbNotif.data.startsAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}`.trim() : null,
    severity: getSeverity(dbNotif.type),
    actions: getActions(dbNotif.type, dbNotif.data),
    read: dbNotif.is_read,
    rawCreatedAt: dbNotif.created_at
  };
}

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
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
      console.error('[NotificationContext] Failed to load notifications:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Fetch initial on mount / user change
  useEffect(() => {
    if (user) {
      fetchNotifications(true);
    } else {
      setNotifications([]);
    }
  }, [user, fetchNotifications]);

  // Connect socket
  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const token = getAccessToken();
    const socketUrl = import.meta.env.VITE_AUTH_API_BASE_URL || 'http://localhost:4000';
    
    console.log('🔌 Connecting notification socket to:', socketUrl);
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('🔌 Notification socket connected');
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Notification socket disconnected');
    });

    newSocket.on('notification:new', (newNotif) => {
      console.log('🔔 Received new realtime notification:', newNotif);
      
      const mapped = mapDatabaseNotification(newNotif);
      setNotifications((prev) => {
        // Prevent duplicate addition
        if (prev.some((n) => n.id === mapped.id)) return prev;
        return [mapped, ...prev];
      });

      // Play sound
      try {
        const chime = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
        chime.play().catch(() => {});
      } catch (err) {}

      // Browser toast
      toast.info(newNotif.message || newNotif.title || 'Notifikasi Baru');
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, toast]);

  const markAsRead = useCallback(async (id) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      await apiMarkNotificationAsRead(id);
    } catch (err) {
      console.error('[NotificationContext] Failed to mark read:', err);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await apiMarkAllNotificationsAsRead();
    } catch (err) {
      console.error('[NotificationContext] Failed to mark all read:', err);
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
    markAllAsRead,
    socket
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
