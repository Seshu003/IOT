# Apex Industrial IoT Telemetry Engine & Command Center

> Comprehensive Technical Documentation & Architecture Manual

---

## 📋 Executive Summary

The **Apex Industrial IoT Command Center** is a real-time, full-stack industrial telemetry monitoring, anomaly detection, and hardware bridge platform. It ingests high-frequency operational metrics (vibration, thermal temperature, line pressure, motor current, RPM speed, flow rate) from **32 industrial machines** across 8 equipment categories. 

The system operates in **dual-mode**:
1. **Virtual Telemetry Simulator Mode**: Generates synthetic baseline readings, ambient noise, and dynamic operational spikes for testing and demonstration.
2. **Physical Hardware Bridge Mode**: Connects physical microcontrollers (ESP32, ESP8266, Arduino, Raspberry Pi) broadcasting live sensor readings over **MQTT** directly into the React HUD.

---

## 🏗️ System Architecture

```
                                  INDUSTRIAL DATA PIPELINE
                                  
 ┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
 │  Physical Hardware     │      │   Virtual Telemetry    │      │  ESP32 / Python Client │
 │  (Sensors / ESP32)     │      │   Device Simulator     │      │  (Hardware Mode)       │
 └───────────┬────────────┘      └───────────┬────────────┘      └───────────┬────────────┘
             │                               │                               │
             └───────────────────────┬───────┴───────────────────────────────┘
                                     │ MQTT Topic: iot/hardware/mach_001
                                     ▼
                        ┌────────────────────────┐
                        │   Aedes MQTT Broker    │  (Port 1883)
                        └────────────┬───────────┘
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │ Telemetry Subscriber   │  (Threshold Anomaly Engine &
                        │ & Packet Parser        │   Hardware Packet Tracker)
                        └────────────┬───────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
        ┌───────────────────────┐         ┌───────────────────────┐
        │  PostgreSQL Storage   │         │ Socket.IO WebSockets  │  (Port 5000)
        │  (Optional Persistence)         │ (Real-time Broadcast) │
        └───────────────────────┘         └───────────┬───────────┘
                                                      │
                                                      ▼
                                          ┌───────────────────────┐
                                          │ React Command HUD     │  (Port 3000)
                                          │ (3D Canvas, Kanban)   │
                                          └───────────────────────┘
```

---

## 📁 Workspace Directory Structure

```
c:\Users\seshu\OneDrive\Desktop\IOT\
├── backend/
│   ├── config/
│   │   └── db.js                 # PostgreSQL Pool interface with graceful fallback
│   ├── middleware/
│   │   └── auth.js               # Express Bearer Token Authentication Middleware
│   ├── mqtt/
│   │   ├── broker.js             # Embedded Aedes MQTT Broker (TCP Port 1883)
│   │   └── telemetrySubscriber.js# MQTT Subscriber, JSON Batch Parser & Anomaly Engine
│   ├── simulator/
│   │   └── deviceSimulator.js    # Virtual Device Simulator (32 Machine Baselines)
│   ├── iotRoutes.js              # REST API Router (/api/iot/machines, /hierarchy, /hardware...)
│   ├── server.js                 # Main HTTP, Socket.IO & MQTT Server Entry Point
│   └── package.json              # Backend Dependencies (Express, Aedes, MQTT, Socket.IO)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ArchitectureTopology.jsx  # 5-Layer Industrial Architecture Visualizer
│   │   │   └── HardwareBridgeModal.jsx   # Hardware Integration Panel & Code Generator
│   │   ├── context/
│   │   │   └── SocketContext.jsx         # Socket.IO Live Telemetry & Alert State Provider
│   │   ├── services/
│   │   │   └── api.js                    # Axios REST Client with Token Interceptor
│   │   ├── styles/
│   │   │   ├── variables.css             # Enterprise Light/Dark CSS Custom Properties
│   │   │   ├── global.css                # Typography, Animations & Base Layout Styles
│   │   │   └── iot.css                   # HUD Dashboard Grid, Sparkline & Modal Styles
│   │   ├── App.jsx                       # Root App Component wrapped in SocketProvider
│   │   ├── main.jsx                      # Vite Application Entry Point
│   │   └── ModuleA_IoT.jsx               # Main React IoT Command Center HUD
│   ├── index.html                        # HTML Template with Google Fonts (Inter, Mono)
│   ├── vite.config.js                    # Vite Dev Server Config with /api Proxy
│   └── package.json                      # Frontend Dependencies (React, Lucide, Axios)
│
└── PROJECT_DOCUMENTATION.md              # Project Overview & Architecture Documentation
```

---

## 🔧 Backend Component Breakdown

### 1. `backend/server.js`
- Initializes **Express App**, **HTTP Server**, and **Socket.IO Server** on port `5000`.
- Starts the embedded **Aedes MQTT Broker** on TCP port `1883`.
- Launches the **Telemetry Subscriber** listening to MQTT messages and piping them to Socket.IO.
- Launches the **IoT Virtual Simulator** emitting simulated telemetry for 32 machines.

### 2. `backend/mqtt/broker.js`
- Spawns an embedded Aedes MQTT server on port `1883`.
- Allows local hardware devices (ESP32, Raspberry Pi) and internal processes to publish MQTT messages.

### 3. `backend/mqtt/telemetrySubscriber.js`
- Connects to `mqtt://localhost:1883` and subscribes to:
  - `company/+/site/+/line/+/machine/+/sensor/+`
  - `iot/+/+`
  - `iot/hardware/+`
- Supports both **single-sensor packets** (`{ machineId, sensorType, value, unit }`) and **multi-sensor JSON batch payloads** (`{ machineId, sensors: { temperature: 45.2, vibration: 3.1 } }`).
- Evaluates real-time anomaly rules:
  - **Vibration**: $> 7.5\text{ mm/s}$ (Critical)
  - **Temperature**: $> 85.0^\circ\text{C}$ (Critical)
  - **Current**: $> 40.0\text{ A}$ (Warning)
  - **Pressure**: $> 130.0\text{ PSI}$ (Critical)
  - **RPM**: $> 1800\text{ RPM}$ (Warning)
- Broadcasts `telemetry:update` and `alert:created` events over Socket.IO to connected web clients.
- Tracks physical hardware statistics (total hardware packets, last packet timestamp, active hardware machine IDs).

### 4. `backend/simulator/deviceSimulator.js`
- Generates realistic telemetry streams for 32 machines across 8 categories:
  - **Motors**, **Pumps**, **Compressors**, **Conveyors**, **Robots**, **Furnaces**, **CNC Mills**, **Blowers**.
- Computes baseline values, Gaussian noise, and random operational spikes.
- Includes dynamic control API (`setSimulatorEnabled`, `isSimulatorEnabled`) allowing users to pause simulation when running physical hardware.

### 5. `backend/iotRoutes.js`
- REST API router mounted at `/api/iot`:
  - `GET /api/iot/machines`: Returns fleet machines list.
  - `GET /api/iot/hierarchy`: Returns Companies -> Sites -> Lines -> Machines tree.
  - `GET /api/iot/telemetry/latest`: Returns cached machine telemetry state.
  - `GET /api/iot/telemetry/history/:machineId`: Returns historical trend points.
  - `GET /api/iot/alerts`: Returns active system alerts.
  - `GET /api/iot/work-orders`: Returns maintenance work orders.
  - `GET /api/iot/hardware/status`: Returns hardware packet count, active physical node IDs, and local broker IP.
  - `POST /api/iot/simulator/toggle`: Toggles simulator ON/OFF.

---

## 🎨 Frontend Component Breakdown

### 1. `frontend/src/ModuleA_IoT.jsx`
- **Main React HUD Dashboard**:
  - **Interactive 3D HTML5 Canvas**: Rotatable 3D wireframe & shaded wire-frame motor, pump, compressor, conveyor, and robot assemblies with mouse orbit controls and live rotation speed / thermal hotspot HUD callouts.
  - **Dynamic Fleet Header**: Summary chips for Active, Degraded, and Critical nodes, Socket.IO live connection indicator, clock, and Hardware Bridge trigger.
  - **Radar Health Polygon**: Dynamic 5-axis radar chart showing vibration, thermal, pressure, RPM, and overall health score.
  - **Machine Fleet Grid & List**: Progressive disclosure format (Collapsed inline rows vs Expanded glassmorphic cards) with SVG trend sparklines, mini health bars, and filter inputs.
  - **Kanban Maintenance Work Orders**: Create, view, and assign maintenance work orders for degraded or critical equipment.

### 2. `frontend/src/components/HardwareBridgeModal.jsx`
- **Hardware Integration Modal**:
  - Displays local IP address (e.g. `192.168.x.x:1883`) for microcontroller setup.
  - Interactive toggle button to pause/enable the virtual simulator.
  - Shows total physical packets received and active hardware machine IDs.
  - Pre-configured, copyable firmware code tabs for:
    - **ESP32 / Arduino (C++)** using `WiFi.h` and `PubSubClient`
    - **Python Client** using `paho.mqtt.client`
    - **Raw JSON Topic Payload Schema**

### 3. `frontend/src/components/ArchitectureTopology.jsx`
- Visual topology view detailing the 5-layer data pipeline: Edge Fleet -> MQTT Broker -> Telemetry Engine -> Socket.IO & DB -> React HUD Command Center.

### 4. `frontend/src/context/SocketContext.jsx`
- Connects to Socket.IO gateway (`http://localhost:5000`), receives real-time `telemetry:update` packets, updates machine sensor history buffers, and exposes `isConnected`, `telemetryData`, and `alerts`.

### 5. Design System (`styles/`)
- `variables.css`: Enterprise CSS custom properties for Light/Dark themes, brand navy/gold accents, status badge colors, and elevated shadows.
- `global.css`: Base typography (`Inter`, `JetBrains Mono`), reset styles, and utility classes.
- `iot.css`: Custom layout grids, glassmorphism cards, sparklines, health bars, and modal overlays.

---

## 📡 Hardware Connection Protocol

Physical microcontrollers (ESP32, ESP8266, Arduino with Wi-Fi, Raspberry Pi) publish JSON telemetry over MQTT to port `1883`.

### 1. MQTT Topic Format
```
iot/hardware/{machineId}
```
*Example Topic*: `iot/hardware/mach_001`

### 2. Multi-Sensor JSON Payload Schema
```json
{
  "machineId": "mach_001",
  "source": "hardware",
  "sensors": {
    "vibration": 3.45,
    "temperature": 52.1,
    "current": 19.8,
    "pressure": 115.0,
    "rpm": 1780
  }
}
```

### 3. ESP32 Arduino C++ Code Example
```cpp
#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "192.168.1.100"; // Your PC Local IP
const int mqtt_port = 1883;

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    client.connect("ESP32_IoT_Node");
  }
  client.loop();

  float tempVal = 45.2;
  float vibVal = 2.1;

  String payload = "{\"machineId\":\"mach_001\", \"source\":\"hardware\", \"sensors\":{\"temperature\":" + String(tempVal) + ", \"vibration\":" + String(vibVal) + "}}";
  client.publish("iot/hardware/mach_001", payload.c_str());
  delay(3000);
}
```

---

## 🚀 How to Run the Project

### Prerequisites
- Node.js (v18+) & npm

### 1. Start Backend Server
```bash
cd backend
npm install
npm start
```
*Output*:
- 📡 **MQTT Broker**: `mqtt://localhost:1883`
- 🚀 **REST API**: `http://localhost:5000/api/iot`
- 📡 **WebSockets**: `ws://localhost:5000`

### 2. Start Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
```
*Output*:
- ➜ **Local UI**: [http://localhost:3000/](http://localhost:3000/)

---

## 🛠️ Verification & Build Status

- **Frontend Production Build**: Tested via `npx vite build` — `1586 modules transformed cleanly in 12.04s`.
- **Backend Startup**: Tested and verified clean connection for Express, Aedes MQTT Broker, Socket.IO WebSockets, Telemetry Subscriber, and Simulator.
