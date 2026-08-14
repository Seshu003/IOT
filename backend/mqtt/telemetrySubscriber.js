const mqtt = require('mqtt');
const db = require('../config/db');

let mqttClient = null;
const latestMachineState = {};
const hardwareStats = {
  totalHardwarePackets: 0,
  lastPacketTimestamp: null,
  activeHardwareMachines: new Set()
};

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
    mqttClient.subscribe([
      'company/+/site/+/line/+/machine/+/sensor/+',
      'iot/+/+',
      'iot/hardware/+'
    ]);
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      const isHardware = payload.source === 'hardware' || topic.startsWith('iot/hardware/') || payload.isHardware === true;

      if (isHardware) {
        hardwareStats.totalHardwarePackets++;
        hardwareStats.lastPacketTimestamp = new Date().toISOString();
      }

      // Handle multi-sensor batch payload (e.g. { machineId: 'mach_001', sensors: { vibration: 3.2, temperature: 45 } })
      if (payload.sensors && typeof payload.sensors === 'object') {
        const { machineId, siteId, lineId, timestamp = new Date().toISOString() } = payload;
        if (isHardware && machineId) hardwareStats.activeHardwareMachines.add(machineId);

        for (const [sensorType, val] of Object.entries(payload.sensors)) {
          const numVal = typeof val === 'object' ? val.value : parseFloat(val);
          const unitVal = typeof val === 'object' ? val.unit : getUnitForSensor(sensorType);
          processTelemetryPoint({
            machineId,
            siteId: siteId || 'site_alpha',
            lineId: lineId || 'line_motor_1',
            sensorType,
            value: numVal,
            unit: unitVal,
            timestamp,
            isHardware,
            io
          });
        }
        return;
      }

      // Handle standard single-sensor packet ({ machineId, sensorType, value, unit, timestamp })
      let { machineId, sensorType, value, unit, timestamp, siteId, lineId } = payload;

      // Extract machineId and sensorType from topic if not in payload (e.g., iot/mach_001/vibration)
      const topicParts = topic.split('/');
      if (!machineId && topicParts.length >= 3) {
        machineId = topicParts[topicParts.length - 2];
      }
      if (!sensorType && topicParts.length >= 1) {
        sensorType = topicParts[topicParts.length - 1];
      }

      if (!machineId || !sensorType) return;
      if (isHardware) hardwareStats.activeHardwareMachines.add(machineId);

      processTelemetryPoint({
        machineId,
        siteId: siteId || 'site_alpha',
        lineId: lineId || 'line_motor_1',
        sensorType,
        value: parseFloat(value),
        unit: unit || getUnitForSensor(sensorType),
        timestamp: timestamp || new Date().toISOString(),
        isHardware,
        io
      });
    } catch (err) {
      // Ignore malformed packet parsing
    }
  });

  mqttClient.on('error', (err) => {
    console.warn('Telemetry Subscriber MQTT error:', err.message);
  });
}

function processTelemetryPoint({ machineId, siteId, lineId, sensorType, value, unit, timestamp, isHardware, io }) {
  if (!machineId || isNaN(value)) return;

  // 1. Update in-memory state cache
  if (!latestMachineState[machineId]) {
    latestMachineState[machineId] = {
      machineId,
      siteId,
      lineId,
      status: 'active',
      lastSeen: timestamp,
      source: isHardware ? 'hardware' : 'simulator',
      sensors: {}
    };
  }

  latestMachineState[machineId].sensors[sensorType] = { value, unit, timestamp };
  latestMachineState[machineId].lastSeen = timestamp;
  if (isHardware) {
    latestMachineState[machineId].source = 'hardware';
  }

  // 2. Persist to PostgreSQL if available
  if (db.isPgAvailable()) {
    db.query(
      `INSERT INTO telemetry_readings (machine_id, sensor_type, value, unit, timestamp)
       VALUES ($1, $2, $3, $4, $5);`,
      [machineId, sensorType, value, unit, timestamp]
    ).catch(() => {});
  }

  // 3. Evaluate Thresholds
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
      db.query(
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

  // 4. Emit live Socket.IO update to React client
  if (io) {
    io.emit('telemetry:update', {
      machineId,
      siteId,
      lineId,
      sensorType,
      value,
      unit,
      timestamp,
      source: isHardware ? 'hardware' : 'simulator',
      machineStatus: latestMachineState[machineId].status
    });
  }
}

function getUnitForSensor(sensorType) {
  switch (sensorType) {
    case 'temperature': return '°C';
    case 'vibration': return 'mm/s';
    case 'current': return 'A';
    case 'pressure': return 'PSI';
    case 'flow': return 'GPM';
    case 'rpm': return 'RPM';
    default: return '';
  }
}

function getLatestMachineState() {
  return latestMachineState;
}

function getHardwareStats() {
  return {
    totalHardwarePackets: hardwareStats.totalHardwarePackets,
    lastPacketTimestamp: hardwareStats.lastPacketTimestamp,
    activeHardwareMachines: Array.from(hardwareStats.activeHardwareMachines)
  };
}

module.exports = {
  startTelemetrySubscriber,
  getLatestMachineState,
  getHardwareStats
};
