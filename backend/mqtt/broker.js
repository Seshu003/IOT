const aedes = require('aedes')();
const net = require('net');

function startMqttBroker(port = 1883, host = process.env.MQTT_HOST || '127.0.0.1') {
  const mqttUsername = process.env.MQTT_USERNAME;
  const mqttPassword = process.env.MQTT_PASSWORD;

  aedes.authenticate = (client, username, password, callback) => {
    if (!mqttUsername && !mqttPassword) return callback(null, true);
    const suppliedPassword = password ? password.toString() : '';
    const valid = username === mqttUsername && suppliedPassword === mqttPassword;
    callback(valid ? null : new Error('Invalid MQTT credentials'), valid);
  };

  const server = net.createServer(aedes.handle);

  server.listen(port, host, () => {
    const accessMode = mqttUsername && mqttPassword ? 'credential protected' : 'local development mode';
    console.log(`📡 Embedded Aedes MQTT Broker listening on ${host}:${port} (${accessMode})`);
  });

  aedes.on('client', (client) => {
    // Silent connect log or lightweight debug
  });

  aedes.on('publish', (packet, client) => {
    // Broker message relaying
  });

  return { aedes, server };
}

module.exports = { startMqttBroker };
