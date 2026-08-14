const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { startMqttBroker } = require('./mqtt/broker');
const { startTelemetrySubscriber } = require('./mqtt/telemetrySubscriber');
const { startSimulator } = require('./simulator/deviceSimulator');
const iotRoutes = require('./iotRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const MQTT_PORT = process.env.MQTT_PORT || 1883;

// Middleware
app.use(cors({ origin: '*' }));
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
    origin: '*',
    methods: ['GET', 'POST']
  }
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
