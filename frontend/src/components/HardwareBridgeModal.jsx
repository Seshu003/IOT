import React, { useState, useEffect } from 'react';
import { getHardwareStatus, toggleSimulator } from '../services/api';
import {
  Cpu, Radio, Wifi, Terminal, Copy, Check, X, ToggleLeft, ToggleRight,
  Shield, Activity, Zap, Layers, RefreshCw
} from 'lucide-react';

export default function HardwareBridgeModal({ isOpen, onClose }) {
  const [hardwareInfo, setHardwareInfo] = useState({
    hardwareStats: { totalHardwarePackets: 0, lastPacketTimestamp: null, activeHardwareMachines: [] },
    simulatorEnabled: true,
    localIp: '127.0.0.1',
    mqttPort: 1883
  });
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState('esp32'); // 'esp32' | 'python' | 'json'

  const fetchStatus = async () => {
    try {
      const res = await getHardwareStatus();
      setHardwareInfo(res.data);
    } catch (err) {
      console.warn('Could not fetch hardware status');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleToggleSimulator = async () => {
    try {
      const nextState = !hardwareInfo.simulatorEnabled;
      const res = await toggleSimulator(nextState);
      setHardwareInfo((prev) => ({ ...prev, simulatorEnabled: res.data.simulatorEnabled }));
    } catch (err) {
      console.error('Failed to toggle simulator:', err);
    }
  };

  if (!isOpen) return null;

  const localIp = hardwareInfo.localIp || '192.168.x.x';
  const mqttPort = hardwareInfo.mqttPort || 1883;

  const esp32Code = `// ESP32 Arduino Real-Time Telemetry Publisher
#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "${localIp}"; // PC Local IP Address
const int mqtt_port = ${mqttPort};

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\\nWiFi Connected!");

  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    if (client.connect("ESP32_IoT_Node")) {
      Serial.println("MQTT Broker Connected!");
    } else { delay(2000); return; }
  }
  client.loop();

  // Read Physical Sensor (e.g. Temperature / Vibration)
  float tempVal = 45.2 + (random(-10, 10) / 10.0);
  float vibVal = 2.1 + (random(-5, 5) / 10.0);

  // Publish Payload for mach_001
  String payload = "{\\"machineId\\":\\"mach_001\\", \\"source\\":\\"hardware\\", \\"sensors\\":{\\"temperature\\":" + String(tempVal) + ", \\"vibration\\":" + String(vibVal) + "}}";
  client.publish("iot/hardware/mach_001", payload.c_str());

  Serial.println("Published Physical Sensor Data: " + payload);
  delay(3000);
}`;

  const pythonCode = `# Python Live Sensor Client
import paho.mqtt.client as mqtt
import json, time, random

MQTT_BROKER = "${localIp}"
MQTT_PORT = ${mqttPort}
TOPIC = "iot/hardware/mach_001"

client = mqtt.Client(client_id="Python_Hardware_Gateway")
client.connect(MQTT_BROKER, MQTT_PORT, 60)

print(f"📡 Connected to MQTT Broker at {MQTT_BROKER}:{MQTT_PORT}")

while True:
    payload = {
        "machineId": "mach_001",
        "source": "hardware",
        "sensors": {
            "temperature": round(48.5 + random.uniform(-2, 2), 2),
            "vibration": round(2.4 + random.uniform(-0.5, 0.5), 2),
            "current": round(18.2 + random.uniform(-1, 1), 2)
        }
    }
    client.publish(TOPIC, json.dumps(payload))
    print("Sent Real Sensor Telemetry:", payload)
    time.sleep(3)`;

  const jsonCode = `// MQTT Topic: iot/hardware/mach_001
// JSON Batch Payload Format:
{
  "machineId": "mach_001",
  "source": "hardware",
  "sensors": {
    "vibration": 3.45,
    "temperature": 52.10,
    "current": 19.8,
    "pressure": 115.0,
    "rpm": 1780
  }
}`;

  const currentSnippet = activeTab === 'esp32' ? esp32Code : activeTab === 'python' ? pythonCode : jsonCode;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="hud-modal-overlay" onClick={onClose}>
      <div className="hud-modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="hud-modal-header">
          <div className="hud-modal-title" style={{ color: '#0F172A' }}>
            <Cpu size={22} style={{ color: '#0284C7' }} />
            Physical Hardware & Real Sensor Bridge
          </div>
          <button className="btn-search-clear" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Live Simulator vs Hardware Mode Switch Banner */}
        <div style={{ background: hardwareInfo.simulatorEnabled ? '#F0F9FF' : '#F0FDFA', border: `1px solid ${hardwareInfo.simulatorEnabled ? '#BAE6FD' : '#99F6E4'}`, borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {hardwareInfo.simulatorEnabled ? (
                <>
                  <Radio size={16} style={{ color: '#0284C7' }} />
                  Mode: Hybrid Simulation & Physical Sensors Active
                </>
              ) : (
                <>
                  <Zap size={16} style={{ color: '#0D9488' }} />
                  Mode: Physical Hardware Only (Virtual Simulator Paused)
                </>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              {hardwareInfo.simulatorEnabled
                ? 'Virtual simulator streams baseline data while physical hardware dynamically updates assigned machine IDs.'
                : 'Virtual simulation is paused. Dashboard updates exclusively from live physical sensor inputs.'}
            </div>
          </div>

          <button
            onClick={handleToggleSimulator}
            style={{
              background: hardwareInfo.simulatorEnabled ? '#0284C7' : '#0D9488',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            {hardwareInfo.simulatorEnabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            {hardwareInfo.simulatorEnabled ? 'Pause Simulator' : 'Enable Simulator'}
          </button>
        </div>

        {/* Live Hardware Stats Pill Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>LOCAL BROKER IP</div>
            <div className="font-mono font-bold" style={{ fontSize: '0.95rem', color: '#0284C7', marginTop: '2px' }}>
              {localIp}:{mqttPort}
            </div>
          </div>

          <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>PHYSICAL PACKETS</div>
            <div className="font-mono font-bold" style={{ fontSize: '0.95rem', color: '#0D9488', marginTop: '2px' }}>
              {hardwareInfo.hardwareStats?.totalHardwarePackets || 0} Packets
            </div>
          </div>

          <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>ACTIVE HARDWARE NODES</div>
            <div className="font-mono font-bold" style={{ fontSize: '0.95rem', color: '#7C3AED', marginTop: '2px' }}>
              {hardwareInfo.hardwareStats?.activeHardwareMachines?.length || 0} Nodes Connected
            </div>
          </div>
        </div>

        {/* Sample Firmware Code / Topic Snippets */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setActiveTab('esp32')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: activeTab === 'esp32' ? '#0284C7' : '#E2E8F0',
                  background: activeTab === 'esp32' ? '#E0F2FE' : '#FFFFFF',
                  color: activeTab === 'esp32' ? '#0369A1' : '#64748B',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                ⚡ ESP32 / Arduino (C++)
              </button>
              <button
                onClick={() => setActiveTab('python')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: activeTab === 'python' ? '#0284C7' : '#E2E8F0',
                  background: activeTab === 'python' ? '#E0F2FE' : '#FFFFFF',
                  color: activeTab === 'python' ? '#0369A1' : '#64748B',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                🐍 Python Script
              </button>
              <button
                onClick={() => setActiveTab('json')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: activeTab === 'json' ? '#0284C7' : '#E2E8F0',
                  background: activeTab === 'json' ? '#E0F2FE' : '#FFFFFF',
                  color: activeTab === 'json' ? '#0369A1' : '#64748B',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                📦 JSON Topic Payload
              </button>
            </div>

            <button
              onClick={copyToClipboard}
              style={{
                background: 'transparent',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {copiedCode ? <Check size={14} style={{ color: '#166534' }} /> : <Copy size={14} />}
              {copiedCode ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          <pre style={{
            background: '#0F172A',
            color: '#38BDF8',
            padding: '14px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontFamily: 'JetBrains Mono, monospace',
            maxHeight: '220px',
            overflowY: 'auto',
            margin: 0
          }}>
            <code>{currentSnippet}</code>
          </pre>
        </div>

      </div>
    </div>
  );
}
