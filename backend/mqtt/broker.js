const aedes = require('aedes')();
const net = require('net');

function startMqttBroker(port = 1883) {
  const server = net.createServer(aedes.handle);

  server.listen(port, () => {
    console.log(`📡 Embedded Aedes MQTT Broker listening on port ${port}`);
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
