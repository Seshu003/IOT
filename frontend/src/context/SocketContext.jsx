import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext({
  isConnected: false,
  telemetryData: {},
  alerts: []
});

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [telemetryData, setTelemetryData] = useState({});
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token') || import.meta.env.VITE_API_TOKEN || (import.meta.env.MODE === 'development' ? 'demo-token' : '');
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('⚡ Socket.IO client connected to IoT telemetry gateway');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('⚡ Socket.IO client disconnected');
      setIsConnected(false);
    });

    socket.on('telemetry:update', (data) => {
      const { machineId, sensorType, value, unit, timestamp, machineStatus } = data;
      setTelemetryData((prev) => {
        const existing = prev[machineId] || {
          machineId,
          status: machineStatus || 'active',
          values: {},
          history: {}
        };

        const sensorValues = { ...existing.values, [sensorType]: value };
        const currentHist = existing.history[sensorType] || [];
        const updatedHist = [...currentHist.slice(-20), value];

        return {
          ...prev,
          [machineId]: {
            ...existing,
            status: machineStatus || existing.status,
            lastSeen: timestamp,
            values: sensorValues,
            history: {
              ...existing.history,
              [sensorType]: updatedHist
            }
          }
        };
      });
    });

    socket.on('alert:created', (newAlert) => {
      setAlerts((prev) => [newAlert, ...prev.slice(0, 49)]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ isConnected, telemetryData, alerts }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
