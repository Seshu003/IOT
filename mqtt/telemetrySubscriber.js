const mqtt = require('mqtt');
const db = require('../config/db');

let mqttClient = null;
const latestMachineState = {};

const THRESHOLDS = {
  vibration: { max: 7.5, severity: 'Critical', msg: 'Severe vibration threshold breach' },
  temperature: { max: 85.0, severity: 'Critical', msg: 'High motor/compressor thermal breach' },
  current: { max: 40.0, severity: 'Warning', msg: 'Abnormal motor current draw detected' },
  pressure: { max: 130.0, severity: 'Critical', msg: 'Excessive line pressure detected' },
  flow: { max: 360.0, severity: 'Warning', msg: 'High flow rate alert' },
  rpm: { max: 1800, severity: 'Warning', msg: 'RPM overspeed warning' }
};

function startTelemetrySubscriber(brokerUrl = 'mqtt://localhost:1883', io = null) {
  mqttClient = mqtt.connect(brokerUrl);

  mqttClient.on('connect', () => {
    console.log('📥 Telemetry Subscriber connected to MQTT Broker. Subscribing to telemetry streams...');
    mqttClient.subscribe('company/+/site/+/line/+/machine/+/sensor/+');
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      const { machineId, sensorType, value, unit, timestamp, siteId, lineId } = payload;

      // 1. Update in-memory latest state cache
      if (!latestMachineState[machineId]) {
        latestMachineState[machineId] = {
          machineId,
          siteId,
          lineId,
          status: 'active',
          lastSeen: timestamp,
          sensors: {}
        };
      }

      latestMachineState[machineId].sensors[sensorType] = { value, unit, timestamp };
      latestMachineState[machineId].lastSeen = timestamp;

      // 2. Persist to PostgreSQL if available
      if (db.isPgAvailable()) {
        db.query(
          `INSERT INTO telemetry_readings (machine_id, sensor_type, value, unit, timestamp)
           VALUES ($1, $2, $3, $4, $5);`,
          [machineId, sensorType, value, unit, timestamp]
        ).catch(() => {});
      }

      // 3. Evaluate Alert Engine Thresholds
      const rule = THRESHOLDS[sensorType];
      if (rule && value >= rule.max) {
        latestMachineState[machineId].status = rule.severity === 'Critical' ? 'critical' : 'degraded';

        const alertData = {
          id: `alt_${machineId}_${sensorType}_${Date.now()}`,
          machineId,
          severity: rule.severity,
          type: 'Threshold_High',
          message: `${rule.msg}: ${value} ${unit}`,
          status: 'active',
          created_at: new Date().toISOString()
        };

        if (db.isPgAvailable()) {
          await db.query(
            `INSERT INTO alerts (id, machine_id, severity, type, message, status)
             VALUES ($1, $2, $3, $4, $5, 'active')
             ON CONFLICT (id) DO NOTHING;`,
            [alertData.id, alertData.machineId, alertData.severity, alertData.type, alertData.message]
          ).catch(() => {});
        }

        if (io) {
          io.emit('alert:created', alertData);
        }
      }

      // 4. Emit live Socket.IO update to frontend React client
      if (io) {
        io.emit('telemetry:update', {
          machineId,
          siteId,
          lineId,
          sensorType,
          value,
          unit,
          timestamp,
          machineStatus: latestMachineState[machineId].status
        });
      }
    } catch (err) {
      // Ignore malformed packet parsing
    }
  });

  mqttClient.on('error', (err) => {
    console.warn('Telemetry Subscriber MQTT error:', err.message);
  });
}

function getLatestMachineState() {
  return latestMachineState;
}

module.exports = {
  startTelemetrySubscriber,
  getLatestMachineState
};
