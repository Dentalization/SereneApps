import { useEffect, useMemo, useRef, useState } from 'react';
import { PY_API_BASE } from '../../../../config/api';

function buildConversionSocketUrl() {
    const apiUrl = new URL(PY_API_BASE, window.location.origin);
    apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    apiUrl.pathname = `${apiUrl.pathname.replace(/\/$/, '')}/ws/conversion-status`;
    apiUrl.search = '';
    return apiUrl.toString();
}

export default function useConversionSocket() {
    const socketUrl = useMemo(buildConversionSocketUrl, []);
    const [latestEvent, setLatestEvent] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const reconnectTimerRef = useRef(null);
    const socketRef = useRef(null);
    const attemptRef = useRef(0);
    const stoppedRef = useRef(false);

    useEffect(() => {
        stoppedRef.current = false;

        const connect = () => {
            if (stoppedRef.current) return;

            setConnectionStatus('connecting');
            const socket = new WebSocket(socketUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                attemptRef.current = 0;
                setConnectionStatus('connected');
            };

            socket.onmessage = (event) => {
                try {
                    setLatestEvent(JSON.parse(event.data));
                } catch (parseError) {
                    console.warn('[useConversionSocket] Invalid socket payload:', parseError);
                }
            };

            const scheduleReconnect = () => {
                if (stoppedRef.current) return;
                setConnectionStatus('disconnected');
                const attempt = attemptRef.current;
                const delay = Math.min(30000, 1000 * (2 ** attempt));
                attemptRef.current = Math.min(attempt + 1, 5);
                reconnectTimerRef.current = window.setTimeout(connect, delay);
            };

            socket.onerror = () => {
                setConnectionStatus('error');
            };

            socket.onclose = scheduleReconnect;
        };

        connect();

        return () => {
            stoppedRef.current = true;
            if (reconnectTimerRef.current) {
                window.clearTimeout(reconnectTimerRef.current);
            }
            socketRef.current?.close();
        };
    }, [socketUrl]);

    return { latestEvent, connectionStatus };
}
