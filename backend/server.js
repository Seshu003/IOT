const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { startMqttBroker } = require('./mqtt/broker');
const { startTelemetrySubscriber } = require('./mqtt/telemetrySubscriber');
const { startSimulator } = require('./simulator/deviceSimulator');
const iotRoutes = require('./iotRoutes');
const { getConfiguredToken, isValidBearerToken } = require('./middleware/auth');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const MQTT_PORT = Number(process.env.MQTT_PORT || 1883);
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((origin) => origin.trim());

// Middleware
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Routes
app.use('/api/iot', iotRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'IoT Industrial Telemetry Engine',
    timestamp: new Date().toISOString()
  });
});

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.IO Server
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

io.use((socket, next) => {
  const configuredToken = getConfiguredToken();
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (isValidBearerToken('Bearer', token, configuredToken)) return next();
  return next(new Error('A valid bearer token is required'));
});

io.on('connection', (socket) => {
  console.log(`🔌 Client connected to Socket.IO live stream [id=${socket.id}]`);
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected from Socket.IO [id=${socket.id}]`);
  });
});

// Start MQTT Broker & Telemetry Subscriptions
startMqttBroker(MQTT_PORT);
startTelemetrySubscriber(`mqtt://localhost:${MQTT_PORT}`, io);
startSimulator(`mqtt://localhost:${MQTT_PORT}`, 32);

// Listen on HTTP Port
server.listen(PORT, () => {
  console.log(`🚀 IoT Industrial Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket / Socket.IO live telemetry ready on ws://localhost:${PORT}`);
  console.log(`📠 MQTT Telemetry Broker listening on mqtt://localhost:${MQTT_PORT}`);
});
