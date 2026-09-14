import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') || import.meta.env.VITE_API_TOKEN || (import.meta.env.MODE === 'development' ? 'demo-token' : '');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getMachines = () => api.get('/iot/machines');
export const getHierarchy = () => api.get('/iot/hierarchy');
export const getLatestTelemetry = () => api.get('/iot/telemetry/latest');
export const getTelemetryHistory = (machineId, sensorType) => 
  api.get(`/iot/telemetry/history/${machineId}`, { params: { sensorType } });
export const getAlerts = () => api.get('/iot/alerts');
export const getWorkOrders = () => api.get('/iot/work-orders');

export const getHardwareStatus = () => api.get('/iot/hardware/status');
export const toggleSimulator = (enabled) => api.post('/iot/simulator/toggle', { enabled });

export default api;
