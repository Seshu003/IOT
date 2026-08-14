import React from 'react';
import {
  Radio, Cpu, Server, Activity, Database, Zap, Layers, ShieldCheck,
  ArrowRight, CheckCircle, Wifi, Terminal, RefreshCw
} from 'lucide-react';

export default function ArchitectureTopology() {
  return (
    <div className="hud-architecture-container" style={{ padding: '24px', background: 'var(--bg-glass, #F8FAFC)', borderRadius: '12px', border: '1px solid var(--border-color, #E2E8F0)' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #E2E8F0' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Radio className="text-accent" size={24} style={{ color: '#0284C7' }} />
            System Architecture & Data Flow Pipeline
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
            End-to-end industrial telemetry ingestion from MQTT Virtual Devices to React HUD Command Center
          </p>
        </div>
        <span style={{ padding: '6px 14px', borderRadius: '20px', background: '#E0F2FE', color: '#0369A1', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284C7', animation: 'pulse 2s infinite' }}></span>
          LIVE PIPELINE ACTIVE
        </span>
      </div>

      {/* Grid of Architecture Pipeline Nodes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', position: 'relative' }}>
        
        {/* Step 1: Industrial Edge Fleet */}
        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#F0F9FF', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cpu size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>LAYER 01 • EDGE FLEET</div>
              <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>32 IoT Machine Nodes</strong>
            </div>
          </div>
          <ul style={{ fontSize: '0.78rem', color: '#475569', paddingLeft: '16px', margin: 0, lineHeight: 1.6 }}>
            <li>8 Equipment Types (Motors, Pumps, CNCs...)</li>
            <li>Multi-Sensor Telemetry (Vib, Temp, Press)</li>
            <li>Synthetic Noise & Anomaly Generators</li>
          </ul>
        </div>

        {/* Step 2: MQTT Broker */}
        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Radio size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>LAYER 02 • BROKER</div>
              <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>Aedes MQTT Broker</strong>
            </div>
          </div>
          <ul style={{ fontSize: '0.78rem', color: '#475569', paddingLeft: '16px', margin: 0, lineHeight: 1.6 }}>
            <li>TCP Port 1883 Listener</li>
            <li>Hierarchical Topic Routing</li>
            <li>High Throughput Publish / Subscribe</li>
          </ul>
        </div>

        {/* Step 3: Telemetry Engine & Anomaly Evaluator */}
        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>LAYER 03 • ENGINE</div>
              <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>Telemetry Engine</strong>
            </div>
          </div>
          <ul style={{ fontSize: '0.78rem', color: '#475569', paddingLeft: '16px', margin: 0, lineHeight: 1.6 }}>
            <li>Threshold & Anomaly Evaluator</li>
            <li>In-Memory State Cache Engine</li>
            <li>Automated Work Order Triggers</li>
          </ul>
        </div>

        {/* Step 4: WebSockets & Persistence */}
        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#F0FDFA', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>LAYER 04 • STREAM</div>
              <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>Socket.IO & DB</strong>
            </div>
          </div>
          <ul style={{ fontSize: '0.78rem', color: '#475569', paddingLeft: '16px', margin: 0, lineHeight: 1.6 }}>
            <li>Real-time WebSocket Broadcasts</li>
            <li>PostgreSQL Storage with Fallback</li>
            <li>REST API Endpoints (/api/iot)</li>
          </ul>
        </div>

        {/* Step 5: Command Center Frontend HUD */}
        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #0284C7', boxShadow: '0 4px 12px rgba(2,132,199,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#0284C7', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Server size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#0284C7', fontWeight: 700 }}>LAYER 05 • REACT HUD</div>
              <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>Command HUD</strong>
            </div>
          </div>
          <ul style={{ fontSize: '0.78rem', color: '#475569', paddingLeft: '16px', margin: 0, lineHeight: 1.6 }}>
            <li>Interactive 3D HTML5 Canvas Orbit</li>
            <li>Live Health Sparklines & Diagnostics</li>
            <li>Kanban Work Order Dispatcher</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
