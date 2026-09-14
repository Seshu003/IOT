const os = require('os');
const express = require('express');
const router = express.Router();
const db = require('./config/db');
const { getLatestMachineState, getHardwareStats } = require('./mqtt/telemetrySubscriber');
const { setSimulatorEnabled, isSimulatorEnabled } = require('./simulator/deviceSimulator');
const { authenticateToken } = require('./middleware/auth');

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return '127.0.0.1';
}

// GET /api/iot/hardware/status
router.get('/hardware/status', authenticateToken, (req, res) => {
  res.json({
    hardwareStats: getHardwareStats(),
    simulatorEnabled: isSimulatorEnabled(),
    localIp: getLocalIpAddress(),
    mqttPort: 1883
  });
});

// POST /api/iot/simulator/toggle
router.post('/simulator/toggle', authenticateToken, (req, res) => {
  const { enabled } = req.body;
  const newState = setSimulatorEnabled(enabled);
  res.json({ simulatorEnabled: newState });
});

// GET /api/iot/machines
router.get('/machines', authenticateToken, async (req, res) => {
  try {
    if (db.isPgAvailable()) {
      const result = await db.query('SELECT * FROM machines ORDER BY id ASC');
      return res.json({ machines: result.rows });
    }
    return res.json({ machines: generateFallbackMachines() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/iot/hierarchy
router.get('/hierarchy', authenticateToken, async (req, res) => {
  try {
    if (db.isPgAvailable()) {
      const companies = (await db.query('SELECT * FROM companies')).rows;
      const sites = (await db.query('SELECT * FROM sites')).rows;
      const lines = (await db.query('SELECT * FROM lines')).rows;
      const machines = (await db.query('SELECT * FROM machines')).rows;
      const gateways = (await db.query('SELECT * FROM gateways')).rows;
      return res.json({ companies, sites, lines, machines, gateways });
    }

    // Demo fallback hierarchy data
    return res.json({
      companies: [{ id: 'cmp_apex', name: 'Bharat Industrial Systems' }],
      sites: [
        { id: 'site_alpha', name: 'Pune Integrated Works', location: 'Pune, Maharashtra' },
        { id: 'site_beta', name: 'Jamshedpur Steel Works', location: 'Jamshedpur, Jharkhand' }
      ],
      lines: [
        { id: 'line_motor_1', site_id: 'site_alpha', name: 'Bharat Motor Assembly Line' },
        { id: 'line_pump_2', site_id: 'site_alpha', name: 'Godavari Pumping Station' },
        { id: 'line_comp_3', site_id: 'site_beta', name: 'Himalaya Compression Unit' },
        { id: 'line_conv_4', site_id: 'site_beta', name: 'Ganga Assembly Line' }
      ],
      machines: generateFallbackMachines()
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/iot/telemetry/latest
router.get('/telemetry/latest', authenticateToken, (req, res) => {
  const latestState = getLatestMachineState();
  res.json({ latestState });
});

// GET /api/iot/telemetry/history/:machineId
router.get('/telemetry/history/:machineId', authenticateToken, async (req, res) => {
  const { machineId } = req.params;
  const { sensorType } = req.query;

  try {
    if (db.isPgAvailable()) {
      let queryText = 'SELECT * FROM telemetry_readings WHERE machine_id = $1';
      const params = [machineId];
      if (sensorType) {
        queryText += ' AND sensor_type = $2';
        params.push(sensorType);
      }
      queryText += ' ORDER BY timestamp DESC LIMIT 50';

      const result = await db.query(queryText, params);
      return res.json({ history: result.rows });
    }

    // Fallback historical trend points
    return res.json({ history: generateFallbackHistory(machineId, sensorType) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/iot/alerts
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    if (db.isPgAvailable()) {
      const result = await db.query('SELECT a.*, m.name as machine_name FROM alerts a JOIN machines m ON a.machine_id = m.id ORDER BY a.created_at DESC LIMIT 100');
      return res.json({ alerts: result.rows });
    }
    return res.json({
      alerts: [
        {
          id: 'alt_sample_01',
          machine_id: 'mach_001',
          machine_name: 'Bharat Electric Drive Motor #1',
          severity: 'Warning',
          type: 'Threshold_High',
          message: 'Vibration level exceeded baseline tolerance (7.8 mm/s)',
          status: 'active',
          created_at: new Date().toISOString()
        }
      ]
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/iot/work-orders
router.get('/work-orders', authenticateToken, async (req, res) => {
  try {
    if (db.isPgAvailable()) {
      const result = await db.query(
        `SELECT w.*, m.name as machine_name, u.name as assigned_name
         FROM work_orders w
         LEFT JOIN machines m ON w.machine_id = m.id
         LEFT JOIN users u ON w.assigned_to = u.id
         ORDER BY w.created_at DESC`
      );
      return res.json({ workOrders: result.rows });
    }
    return res.json({
      workOrders: [
        {
          id: 'wo_sample_01',
          alert_id: 'alt_sample_01',
          machine_id: 'mach_001',
          machine_name: 'Bharat Electric Drive Motor #1',
          assigned_to: 'usr_technician_1',
          assigned_name: 'Ravi Kulkarni (Senior Technician)',
          priority: 'High',
          status: 'In_Progress',
          root_cause: 'Bearing wear on primary shaft',
          corrective_action: 'Replacing drive bearing assembly and lubricating housing',
          downtime_minutes: 45,
          created_at: new Date().toISOString()
        }
      ]
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

function generateFallbackMachines() {
  const list = [];
  const types = [
    { type: 'motor', name: 'Bharat Electric Drive Motor', lineId: 'line_motor_1' },
    { type: 'pump', name: 'Godavari Process Pump', lineId: 'line_pump_2' },
    { type: 'compressor', name: 'Himalaya Air Compressor', lineId: 'line_comp_3' },
    { type: 'conveyor', name: 'Ganga Assembly Conveyor', lineId: 'line_conv_4' },
    { type: 'robot', name: 'Arjun Welding Robot', lineId: 'line_robot_5' },
    { type: 'furnace', name: 'Bharat Induction Furnace', lineId: 'line_furnace_6' },
    { type: 'cnc', name: 'Vikram Precision CNC Mill', lineId: 'line_cnc_7' },
    { type: 'blower', name: 'Monsoon Plant Blower', lineId: 'line_blower_8' }
  ];

  let c = 1;
  for (const t of types) {
    for (let i = 1; i <= 4; i++) {
      list.push({
        id: `mach_${String(c).padStart(3, '0')}`,
        line_id: t.lineId,
        name: `${t.name} #${i}`,
        type: t.type,
        status: c === 1 ? 'degraded' : c === 17 ? 'critical' : 'active'
      });
      c++;
    }
  }
  return list;
}

function generateFallbackHistory(machineId, sensorType = 'vibration') {
  const points = [];
  const now = Date.now();
  for (let i = 20; i >= 0; i--) {
    points.push({
      id: i,
      machine_id: machineId,
      sensor_type: sensorType,
      value: Math.round((2.0 + Math.random() * 2.5) * 100) / 100,
      unit: sensorType === 'temperature' ? '°C' : 'mm/s',
      timestamp: new Date(now - i * 5000).toISOString()
    });
  }
  return points;
}

module.exports = router;
