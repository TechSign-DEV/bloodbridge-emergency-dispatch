import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext.jsx';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

/** Opens an authenticated socket and keeps event callbacks current without reconnecting on each render. */
export default function useSocketEvents(handlers) {
  const { token } = useAuth();
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    const eventNames = Object.keys(handlersRef.current || {});
    const listeners = eventNames.map((eventName) => {
      const listener = (payload) => handlersRef.current?.[eventName]?.(payload);
      socket.on(eventName, listener);
      return [eventName, listener];
    });
    socket.on('connect_error', (error) => console.warn('BloodBridge live updates unavailable:', error.message));
    return () => {
      for (const [eventName, listener] of listeners) socket.off(eventName, listener);
      socket.disconnect();
    };
  }, [token]);
}
