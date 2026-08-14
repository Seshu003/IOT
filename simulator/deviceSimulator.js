const mqtt = require('mqtt');

let client = null;
let simulationInterval = null;

// Baseline values per machine type
// Baseline values per machine type for all 8 industrial equipment categories
const BASELINES = {
  motor: {
    vibration: { base: 2.2, noise: 0.4, spikeProb: 0.05, spikeVal: 8.2, unit: 'mm/s' },
    temperature: { base: 45.0, noise: 1.2, spikeProb: 0.03, spikeVal: 92.0, unit: '°C' },
    current: { base: 18.5, noise: 1.0, spikeProb: 0.04, spikeVal: 42.0, unit: 'A' },
    rpm: { base: 1750, noise: 15, spikeProb: 0.02, spikeVal: 2400, unit: 'RPM' }
  },
  pump: {
    vibration: { base: 1.8, noise: 0.3, spikeProb: 0.04, spikeVal: 7.4, unit: 'mm/s' },
    temperature: { base: 54.0, noise: 1.5, spikeProb: 0.03, spikeVal: 88.0, unit: '°C' },
    pressure: { base: 65.0, noise: 3.0, spikeProb: 0.05, spikeVal: 135.0, unit: 'PSI' },
    flow: { base: 320.0, noise: 8.0, spikeProb: 0.03, spikeVal: 480.0, unit: 'GPM' }
  },
  compressor: {
    vibration: { base: 2.5, noise: 0.5, spikeProb: 0.04, spikeVal: 8.5, unit: 'mm/s' },
    temperature: { base: 68.0, noise: 2.0, spikeProb: 0.04, spikeVal: 98.0, unit: '°C' },
    pressure: { base: 120.0, noise: 4.0, spikeProb: 0.05, spikeVal: 175.0, unit: 'PSI' }
  },
  conveyor: {
    vibration: { base: 1.1, noise: 0.2, spikeProb: 0.03, spikeVal: 5.8, unit: 'mm/s' },
    temperature: { base: 42.0, noise: 1.0, spikeProb: 0.02, spikeVal: 75.0, unit: '°C' },
    rpm: { base: 850, noise: 20, spikeProb: 0.02, spikeVal: 1950, unit: 'RPM' },
    current: { base: 14.0, noise: 0.8, spikeProb: 0.04, spikeVal: 34.0, unit: 'A' }
  },
  robot: {
    vibration: { base: 0.9, noise: 0.15, spikeProb: 0.03, spikeVal: 4.2, unit: 'mm/s' },
    temperature: { base: 52.0, noise: 1.1, spikeProb: 0.03, spikeVal: 86.0, unit: '°C' },
    current: { base: 28.5, noise: 1.5, spikeProb: 0.04, spikeVal: 55.0, unit: 'A' },
    rpm: { base: 3400, noise: 40, spikeProb: 0.02, spikeVal: 4800, unit: 'RPM' }
  },
  furnace: {
    vibration: { base: 3.4, noise: 0.6, spikeProb: 0.05, spikeVal: 9.1, unit: 'mm/s' },
    temperature: { base: 380.0, noise: 6.0, spikeProb: 0.04, spikeVal: 520.0, unit: '°C' },
    pressure: { base: 32.0, noise: 2.0, spikeProb: 0.04, spikeVal: 68.0, unit: 'PSI' },
    current: { base: 145.0, noise: 5.0, spikeProb: 0.03, spikeVal: 210.0, unit: 'A' },
    flow: { base: 620.0, noise: 15.0, spikeProb: 0.03, spikeVal: 900.0, unit: 'GPM' }
  },
  cnc: {
    vibration: { base: 0.6, noise: 0.1, spikeProb: 0.03, spikeVal: 3.5, unit: 'mm/s' },
    temperature: { base: 46.5, noise: 0.8, spikeProb: 0.03, spikeVal: 82.0, unit: '°C' },
    rpm: { base: 10500, noise: 120, spikeProb: 0.02, spikeVal: 14200, unit: 'RPM' },
    pressure: { base: 95.0, noise: 3.5, spikeProb: 0.04, spikeVal: 150.0, unit: 'PSI' },
    current: { base: 22.0, noise: 1.2, spikeProb: 0.03, spikeVal: 48.0, unit: 'A' }
  },
  blower: {
    vibration: { base: 2.1, noise: 0.35, spikeProb: 0.04, spikeVal: 7.8, unit: 'mm/s' },
    temperature: { base: 58.0, noise: 1.6, spikeProb: 0.03, spikeVal: 94.0, unit: '°C' },
    rpm: { base: 2650, noise: 30, spikeProb: 0.02, spikeVal: 3800, unit: 'RPM' },
    pressure: { base: 45.0, noise: 2.5, spikeProb: 0.04, spikeVal: 85.0, unit: 'PSI' },
    flow: { base: 1250.0, noise: 35.0, spikeProb: 0.03, spikeVal: 1850.0, unit: 'CFM' }
  }
};

function startSimulator(brokerUrl = 'mqtt://localhost:1883', machineCount = 32) {
  client = mqtt.connect(brokerUrl);

  client.on('connect', () => {
    console.log(`🤖 IoT Virtual Simulator connected to ${brokerUrl}. Generating unique telemetry for ${machineCount} machines...`);

    // Stream telemetry every 3 seconds
    simulationInterval = setInterval(() => {
      publishTelemetryBatch(machineCount);
    }, 3000);
  });

  client.on('error', (err) => {
    console.warn('Simulator MQTT connection error:', err.message);
  });
}

function publishTelemetryBatch(machineCount) {
  if (!client || !client.connected) return;

  const machineTypes = ['motor', 'pump', 'compressor', 'conveyor', 'robot', 'furnace', 'cnc', 'blower'];

  for (let i = 1; i <= machineCount; i++) {
    const mId = `mach_${String(i).padStart(3, '0')}`;
    const typeIndex = Math.floor((i - 1) / 4);
    const type = machineTypes[typeIndex] || 'motor';
    const siteId = i > 16 ? 'site_beta' : 'site_alpha';
    const lineId = getLineForIndex(i);

    const sensorsConfig = BASELINES[type];
    if (!sensorsConfig) continue;

    for (const [sensorType, config] of Object.entries(sensorsConfig)) {
      const isSpike = Math.random() < config.spikeProb;
      const noiseVal = (Math.random() - 0.5) * config.noise * 2;
      let val = config.base + noiseVal;
      if (isSpike) {
        val = config.spikeVal + (Math.random() * 2.0);
      }

      val = Math.round(val * 100) / 100;

      const topic = `company/cmp_apex/site/${siteId}/line/${lineId}/machine/${mId}/sensor/${sensorType}`;
      const payload = {
        timestamp: new Date().toISOString(),
        companyId: 'cmp_apex',
        siteId,
        lineId,
        machineId: mId,
        machineType: type,
        sensorType,
        value: val,
        unit: config.unit,
        quality: isSpike ? 'warning' : 'good',
        battery: 85 + (i % 15),
        signalStrength: -60 - (i % 10)
      };

      client.publish(topic, JSON.stringify(payload));
    }
  }
}

function getLineForIndex(i) {
  if (i <= 6) return 'line_motor_1';
  if (i <= 12) return 'line_pump_2';
  if (i <= 18) return 'line_comp_3';
  return 'line_conv_4';
}

function stopSimulator() {
  if (simulationInterval) clearInterval(simulationInterval);
  if (client) client.end();
}

module.exports = { startSimulator, stopSimulator };
