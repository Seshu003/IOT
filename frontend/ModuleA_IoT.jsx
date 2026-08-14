import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  Radio, Shield, Gauge, Cpu, Activity, Zap, Layers, AlertTriangle,
  CheckCircle, Clock, Server, Sliders, ChevronRight, RefreshCw, BarChart2,
  List, Grid, Wrench, Crosshair, Anchor, Flame, Compass, Eye, Filter, X,
  Search, PlusCircle, Check, RotateCcw, Sparkles, TrendingUp, Send,
  ChevronDown, ChevronUp
} from 'lucide-react';
import '../styles/variables.css';
import '../styles/global.css';
import '../styles/iot.css';
import ArchitectureTopology from '../components/ArchitectureTopology';
import HardwareBridgeModal from '../components/HardwareBridgeModal';

// SVG Sparkline Component for Operational Trend Context
function Sparkline({ values, color = '#1B2A4A', width = 64, height = 20, status = 'active' }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min === 0 ? 1 : max - min;
  
  const points = values.map((val, idx) => {
    const x = (idx / (values.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  
  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;
  
  const strokeColor = status === 'critical' ? '#991B1B' : status === 'degraded' ? '#92400E' : color;
  const fillGradId = `sparkGrad-${status}-${Math.floor(Math.random() * 1000)}`;

  return (
    <svg width={width} height={height} className="sparkline-svg">
      <defs>
        <linearGradient id={fillGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${fillGradId})`} />
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Automated Diagnostic Reason Generator
function getDiagnosticReason(machine, liveData, mBase) {
  const mVib = liveData?.values?.vibration ? parseFloat(liveData.values.vibration) : mBase.vibration;
  const mTemp = liveData?.values?.temperature ? parseFloat(liveData.values.temperature) : mBase.temperature;
  const mPress = liveData?.values?.pressure ? parseFloat(liveData.values.pressure) : mBase.pressure;

  if (machine.status === 'critical' || mVib > 6.0) {
    return `Servo vibration ${mVib.toFixed(1)} mm/s — above 2.5 mm/s threshold (Critical Bearing Wear)`;
  }
  if (mTemp > 75.0) {
    return `Thermal temperature ${mTemp.toFixed(1)}°C — above 70.0°C threshold (Overheating Warning)`;
  }
  if (machine.status === 'degraded' || mVib > 4.0) {
    return `Drive vibration ${mVib.toFixed(1)} mm/s — above 2.5 mm/s threshold (Imbalance Warning)`;
  }
  return `Pressure ${mPress.toFixed(1)} PSI — telemetry anomaly threshold exceeded`;
}

const MACHINE_TYPES = {
  motor: 'Electric Drive Motor',
  pump: 'Centrifugal Slurry Pump',
  compressor: 'Reciprocating Compressor',
  conveyor: 'Heavy Belt Conveyor',
  robot: 'Articulated Weld Robot',
  furnace: 'Induction Blast Furnace',
  cnc: '5-Axis Precision CNC Mill',
  blower: 'High-Volume Plant Blower'
};

const CATEGORY_CONFIG = {
  motor: {
    label: 'Electric Drive Motors',
    color: '#1B2A4A',
    bg: '#F0F4F8',
    border: '#E8E9ED',
    icon: Cpu
  },
  pump: {
    label: 'Centrifugal Slurry Pumps',
    color: '#0D9488',
    bg: '#F0FDFA',
    border: '#CCFBF1',
    icon: Zap
  },
  compressor: {
    label: 'Industrial Compressors',
    color: '#4F46E5',
    bg: '#EEF2FF',
    border: '#E0E7FF',
    icon: Activity
  },
  conveyor: {
    label: 'Heavy Belt Conveyors',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FEF3C7',
    icon: Sliders
  },
  robot: {
    label: '6-Axis Weld Robots',
    color: '#E11D48',
    bg: '#FFF1F2',
    border: '#FFE4E6',
    icon: Layers
  },
  furnace: {
    label: 'Induction Blast Furnaces',
    color: '#C2410C',
    bg: '#FFF7ED',
    border: '#FFEDD5',
    icon: Flame
  },
  cnc: {
    label: '5-Axis Precision CNC Mills',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    icon: Wrench
  },
  blower: {
    label: 'High-Volume Plant Blowers',
    color: '#0284C7',
    bg: '#F0F9FF',
    border: '#E0F2FE',
    icon: RefreshCw
  }
};

// Safe Fallback 32 Machines array across 8 equipment categories
const DEFAULT_32_MACHINES = Array.from({ length: 32 }, (_, idx) => {
  const c = idx + 1;
  const typesKeys = Object.keys(MACHINE_TYPES);
  const typeIndex = Math.floor((c - 1) / 4);
  const type = typesKeys[typeIndex] || 'motor';
  const numInGroup = ((c - 1) % 4) + 1;

  return {
    id: `mach_${String(c).padStart(3, '0')}`,
    name: `${MACHINE_TYPES[type]} #${numInGroup}`,
    type,
    status: c === 1 ? 'degraded' : c === 17 ? 'critical' : 'active'
  };
});

export default function ModuleA_IoT() {
  const { isConnected, telemetryData = {} } = useSocket();

  // Initialize theme from localStorage or default to light theme for a sophisticated clean look
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const [machines, setMachines] = useState(DEFAULT_32_MACHINES);
  const [selectedMachine, setSelectedMachine] = useState(DEFAULT_32_MACHINES[0]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);

  // Enhanced Interactive Controls & Filter States
  const [selectedSite, setSelectedSite] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'degraded' | 'critical'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('hud'); // 'hud' | 'kanban' | 'alerts' | 'architecture' | '3d'

  // Work Order & Hardware Modal State
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [showHardwareModal, setShowHardwareModal] = useState(false);
  const [newWOTitle, setNewWOTitle] = useState('');
  const [newWODesc, setNewWODesc] = useState('');
  const [newWOPriority, setNewWOPriority] = useState('Medium Priority');
  
  // Progressive Disclosure View Format (Collapsed Rows vs Expanded Cards)
  const [nodeDisplayFormat, setNodeDisplayFormat] = useState('collapsed'); // 'collapsed' | 'expanded'
  const [expandedNodes, setExpandedNodes] = useState({});

  const toggleNodeExpanded = (id, e) => {
    if (e) e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  // Dynamic Real-Time Clock
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = () => {
    api.get('/iot/machines')
      .then(res => {
        const list = res.data?.machines || [];
        if (Array.isArray(list) && list.length > 0) {
          setMachines(list);
          setSelectedMachine(list[0]);
        }
      })
      .catch(() => {});

    api.get('/iot/alerts').then(res => {
      setActiveAlerts(res.data?.alerts || []);
    }).catch(() => {});

    api.get('/iot/work-orders').then(res => {
      setWorkOrders(res.data?.workOrders || []);
    }).catch(() => {});
  };


  // Safe Filter Logic with multi-criteria search, status, category & site filtering
  const safeMachines = Array.isArray(machines) && machines.length > 0 ? machines : DEFAULT_32_MACHINES;
  
  const filteredMachines = safeMachines.filter(m => {
    if (!m || !m.id) return false;
    const numId = parseInt(String(m.id).replace(/\D/g, '') || '1', 10);
    const matchSite = selectedSite === 'all' || (selectedSite === 'site_alpha' ? numId <= 16 : numId > 16);
    const matchCat = selectedCategory === 'all' || m.type === selectedCategory;
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    const query = searchQuery.trim().toLowerCase();
    const matchSearch = !query || 
      m.name.toLowerCase().includes(query) || 
      m.id.toLowerCase().includes(query) || 
      (MACHINE_TYPES[m.type] && MACHINE_TYPES[m.type].toLowerCase().includes(query));

    return matchSite && matchCat && matchStatus && matchSearch;
  });

  // Calculate fleet health metrics for cyber header summary chips
  const activeCount = safeMachines.filter(m => m.status === 'active').length;
  const degradedCount = safeMachines.filter(m => m.status === 'degraded').length;
  const criticalCount = safeMachines.filter(m => m.status === 'critical').length;
  const attentionMachines = safeMachines.filter(m => m && (m.status === 'critical' || m.status === 'degraded'));

  // Work Order Creation Handler
  const handleCreateWorkOrder = (e) => {
    e.preventDefault();
    if (!newWOTitle.trim()) return;
    const newWO = {
      id: `WO-${String(workOrders.length + 1).padStart(3, '0')}`,
      title: newWOTitle,
      description: newWODesc || `Maintenance work order for ${selectedMachine?.name || 'Machine Node'}`,
      machine_id: selectedMachine?.id || 'mach_001',
      priority: newWOPriority,
      status: 'Pending Triage',
      created_at: new Date().toISOString()
    };
    setWorkOrders(prev => [newWO, ...prev]);
    api.post('/iot/work-orders', newWO).catch(() => {});
    setNewWOTitle('');
    setNewWODesc('');
    setShowWorkOrderModal(false);
  };

  // Toggle Anomaly Simulation Pulse on focus node
  const handleTriggerSimulation = () => {
    if (!selectedMachine) return;
    setMachines(prev => prev.map(m => {
      if (m.id === selectedMachine.id) {
        const nextStatus = m.status === 'critical' ? 'active' : m.status === 'active' ? 'degraded' : 'critical';
        return { ...m, status: nextStatus };
      }
      return m;
    }));
  };

  // Deterministic unique baseline generator for machine node telemetry fallback
  const getMachineBaseline = (mId) => {
    const num = parseInt(String(mId || '1').replace(/\D/g, '') || '1', 10);
    const mType = safeMachines.find(item => item.id === mId)?.type || 'motor';

    let baseVib = parseFloat((1.2 + ((num * 7) % 35) / 10).toFixed(1)); // 1.2 to 4.7 mm/s
    let baseTemp = parseFloat((42 + ((num * 11) % 45)).toFixed(1));    // 42 to 87 °C
    let basePress = parseFloat((30 + ((num * 13) % 90)).toFixed(0));   // 30 to 120 PSI
    let baseRpm = 1100 + ((num * 95) % 800);                           // 1100 to 1900 RPM
    let baseCurr = parseFloat((8 + ((num * 3) % 25)).toFixed(1));      // 8 to 33 A
    let baseFlow = parseFloat((120 + ((num * 17) % 200)).toFixed(0));  // 120 to 320 GPM

    if (mType === 'furnace') {
      baseTemp = parseFloat((220 + ((num * 17) % 180)).toFixed(1)); // Thermal blast range
      basePress = parseFloat((18 + ((num * 5) % 25)).toFixed(0));
    } else if (mType === 'robot') {
      baseRpm = 3200 + ((num * 120) % 1500); // High-speed joint movement
      baseVib = parseFloat((0.8 + ((num * 3) % 20) / 10).toFixed(1));
    } else if (mType === 'cnc') {
      baseRpm = 8500 + ((num * 250) % 4000); // High Spindle RPM
      baseVib = parseFloat((0.5 + ((num * 2) % 15) / 10).toFixed(1));
    } else if (mType === 'blower') {
      baseFlow = parseFloat((450 + ((num * 25) % 300)).toFixed(0));
      baseRpm = 2200 + ((num * 80) % 600);
    }

    return {
      vibration: baseVib,
      temperature: baseTemp,
      pressure: basePress,
      rpm: baseRpm,
      current: baseCurr,
      flow: baseFlow
    };
  };

  // Helper to extract 3 specialized metrics with metric names & units per machine type
  const getMachinePills = (m, liveData, mBase) => {
    const values = liveData?.values || {};
    const vib = values.vibration ? parseFloat(values.vibration).toFixed(1) : mBase.vibration;
    const temp = values.temperature ? parseFloat(values.temperature).toFixed(1) : mBase.temperature;
    const press = values.pressure ? parseFloat(values.pressure).toFixed(0) : mBase.pressure;
    const rpm = values.rpm ? parseInt(values.rpm, 10) : mBase.rpm;
    const curr = values.current ? parseFloat(values.current).toFixed(1) : mBase.current;
    const flow = values.flow ? parseFloat(values.flow).toFixed(0) : mBase.flow;

    switch (m.type) {
      case 'motor':
        return [
          { label: 'Vibration', val: `${vib} mm/s` },
          { label: 'Temp', val: `${temp}°C` },
          { label: 'Current', val: `${curr} A` }
        ];
      case 'pump':
        return [
          { label: 'Vibration', val: `${vib} mm/s` },
          { label: 'Pressure', val: `${press} PSI` },
          { label: 'Flow Rate', val: `${flow} GPM` }
        ];
      case 'compressor':
        return [
          { label: 'Vibration', val: `${vib} mm/s` },
          { label: 'Temp', val: `${temp}°C` },
          { label: 'Pressure', val: `${press} PSI` }
        ];
      case 'conveyor':
        return [
          { label: 'Vibration', val: `${vib} mm/s` },
          { label: 'Speed', val: `${rpm} RPM` },
          { label: 'Current', val: `${curr} A` }
        ];
      case 'robot':
        return [
          { label: 'Servo Vib', val: `${vib} mm/s` },
          { label: 'Joint Temp', val: `${temp}°C` },
          { label: 'Arc Power', val: `${curr} A` }
        ];
      case 'furnace':
        return [
          { label: 'Core Temp', val: `${temp}°C` },
          { label: 'Gas Press', val: `${press} PSI` },
          { label: 'Coil Power', val: `${curr} A` }
        ];
      case 'cnc':
        return [
          { label: 'Spindle RPM', val: `${rpm} RPM` },
          { label: 'Spindle Vib', val: `${vib} mm/s` },
          { label: 'Coolant Press', val: `${press} PSI` }
        ];
      case 'blower':
        return [
          { label: 'Air Flow', val: `${flow} CFM` },
          { label: 'Duct Press', val: `${press} PSI` },
          { label: 'Fan Speed', val: `${rpm} RPM` }
        ];
      default:
        return [
          { label: 'Vibration', val: `${vib} mm/s` },
          { label: 'Temp', val: `${temp}°C` },
          { label: 'Pressure', val: `${press} PSI` }
        ];
    }
  };

  const displayList = filteredMachines.length > 0 ? filteredMachines : safeMachines;
  const activeFocusMachine = selectedMachine || displayList[0] || DEFAULT_32_MACHINES[0];
  const nodeBaseline = getMachineBaseline(activeFocusMachine ? activeFocusMachine.id : 'mach_001');

  // Get live sensor telemetry reading for current focus machine with fallback safety
  const currentTelemetry = (activeFocusMachine && telemetryData && telemetryData[activeFocusMachine.id]) ? telemetryData[activeFocusMachine.id] : null;

  // Extract live telemetry values with node-specific fallback defaults
  const vibVal = currentTelemetry?.values?.vibration ? parseFloat(currentTelemetry.values.vibration) : nodeBaseline.vibration;
  const tempVal = currentTelemetry?.values?.temperature ? parseFloat(currentTelemetry.values.temperature) : nodeBaseline.temperature;
  const pressVal = currentTelemetry?.values?.pressure ? parseFloat(currentTelemetry.values.pressure) : nodeBaseline.pressure;
  const rpmVal = currentTelemetry?.values?.rpm ? parseInt(currentTelemetry.values.rpm, 10) : nodeBaseline.rpm;
  const currVal = currentTelemetry?.values?.current ? parseFloat(currentTelemetry.values.current) : nodeBaseline.current;
  const flowVal = currentTelemetry?.values?.flow ? parseFloat(currentTelemetry.values.flow) : nodeBaseline.flow;

  // Compute Dynamic Health Score (0 - 100%)
  const healthPercent = Math.max(40, Math.min(100, Math.round(100 - (vibVal * 4.5 + (tempVal > 70 ? (tempVal - 70) * 1.2 : 0)))));
  const healthScore = healthPercent * 18;

  // Compute Dynamic Pentagon Radar Polygon Points (Trigonometric projection from live telemetry)
  const cx = 100, cy = 90;
  const rVib = Math.min(75, Math.max(20, (vibVal / 8.0) * 75));
  const rTemp = Math.min(75, Math.max(20, (tempVal / 100.0) * 75));
  const rPress = Math.min(75, Math.max(20, (pressVal / 150.0) * 75));
  const rRpm = Math.min(75, Math.max(20, (rpmVal / 2000.0) * 75));
  const rHealth = Math.min(75, Math.max(20, (healthPercent / 100.0) * 75));

  const p1 = `${cx + rVib * Math.cos(-Math.PI / 2)},${cy + rVib * Math.sin(-Math.PI / 2)}`;
  const p2 = `${cx + rTemp * Math.cos(-Math.PI / 10)},${cy + rTemp * Math.sin(-Math.PI / 10)}`;
  const p3 = `${cx + rPress * Math.cos((3 * Math.PI) / 10)},${cy + rPress * Math.sin((3 * Math.PI) / 10)}`;
  const p4 = `${cx + rRpm * Math.cos((7 * Math.PI) / 10)},${cy + rRpm * Math.sin((7 * Math.PI) / 10)}`;
  const p5 = `${cx + rHealth * Math.cos((11 * Math.PI) / 10)},${cy + rHealth * Math.sin((11 * Math.PI) / 10)}`;

  const dynamicRadarPoints = `${p1} ${p2} ${p3} ${p4} ${p5}`;

  // Segmented Meter Cell Counts (0 to 20 cells)
  const vibCells = Math.min(20, Math.max(1, Math.round((vibVal / 8.0) * 20)));
  const tempCells = Math.min(20, Math.max(1, Math.round((tempVal / 100.0) * 20)));
  const pressCells = Math.min(20, Math.max(1, Math.round((pressVal / 150.0) * 20)));

  // Equalizer Spectrum heights computed dynamically from selected node telemetry
  const eqData = [
    Math.round(vibVal * 12),
    Math.round(tempVal * 0.9),
    Math.round(currVal * 3),
    Math.round((vibVal + tempVal) * 0.7),
    Math.round(healthPercent * 0.85),
    Math.round(currVal * 4.2),
    Math.round(vibVal * 15),
    Math.round(tempVal * 0.8),
    Math.round(pressVal * 0.7),
    Math.round(healthPercent * 0.75),
    Math.round(vibVal * 11),
    Math.round(currVal * 3.8)
  ];

  return (
    <div className="iot-hud-wrapper">
      {/* Top Sci-Fi Glassmorphic Header Banner */}
      <div className="hud-top-banner">
        <div>
          <h1 className="hud-title-text flex-row-center gap-2">
            <Radio className="module-feature-bullet" size={24} /> Plant Command Hub
          </h1>
          <p className="hud-tagline">
            Master the Operations Cosmos • Real-Time Telemetry & Asset Command
          </p>
        </div>

        {/* Fleet Summary Chips & Live Status */}
        <div className="hud-header-chips">
          <div 
            className={`hud-chip hud-chip-interactive ${statusFilter === 'active' ? 'active' : ''}`} 
            onClick={() => setStatusFilter(prev => prev === 'active' ? 'all' : 'active')}
            title="Click to filter Active Normal Nodes"
          >
            <span className="hud-chip-dot active"></span>
            <span>{activeCount} Active</span>
          </div>
          <div 
            className={`hud-chip hud-chip-interactive ${statusFilter === 'degraded' ? 'active' : ''}`} 
            onClick={() => setStatusFilter(prev => prev === 'degraded' ? 'all' : 'degraded')}
            title="Click to filter Degraded Warning Nodes"
          >
            <span className="hud-chip-dot degraded"></span>
            <span>{degradedCount} Degraded</span>
          </div>
          <div 
            className={`hud-chip hud-chip-interactive ${statusFilter === 'critical' ? 'active' : ''}`} 
            onClick={() => setStatusFilter(prev => prev === 'critical' ? 'all' : 'critical')}
            title="Click to filter Critical Alarm Nodes"
          >
            <span className="hud-chip-dot critical"></span>
            <span>{criticalCount} Critical</span>
          </div>

          <span className={`badge badge-${isConnected ? 'active' : 'critical'} flex-row-center gap-1`}>
            <span className="socket-dot"></span>
            {isConnected ? 'MQTT LIVE' : 'DISCONNECTED'}
          </span>
          <span className="badge badge-active flex-row-center gap-1 font-mono">
            <Clock size={12} /> {currentTime}
          </span>
          <button 
            className="btn btn-xs btn-primary flex-row-center gap-1"
            onClick={() => setShowHardwareModal(true)}
            style={{ background: '#0284C7', color: '#FFFFFF', border: 'none', padding: '4px 10px', borderRadius: '6px', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
            title="Configure Real Physical Hardware Sensors & MQTT Bridge"
          >
            <Cpu size={13} /> Hardware Bridge
          </button>
          <button 
            className="btn btn-xs btn-secondary flex-row-center gap-1"
            onClick={handleTriggerSimulation}
            title="Simulate Telemetry Pulse on Focus Machine"
          >
            <Sparkles size={12} /> Pulse Sim
          </button>
        </div>
      </div>

      {/* SLIM "ATTENTION NEEDED" BANNER FOR CRITICAL & DEGRADED MACHINES */}
      {attentionMachines.length > 0 && (
        <div className="attention-banner-wrapper">
          <div className="attention-banner-header">
            <div className="attention-title flex-row-center gap-2">
              <AlertTriangle size={16} className="text-danger" />
              <span>Attention Needed</span>
              <span className="attention-count-tag">{attentionMachines.length} Assets Require Immediate Review</span>
            </div>
            <div className="glass-subtitle">AUTOMATED TELEMETRY DIAGNOSTIC FEED</div>
          </div>
          
          <div className="attention-cards-grid">
            {attentionMachines.map(m => {
              const liveData = telemetryData && telemetryData[m.id];
              const mBase = getMachineBaseline(m.id);
              const reason = getDiagnosticReason(m, liveData, mBase);
              const mVib = liveData?.values?.vibration ? parseFloat(liveData.values.vibration) : mBase.vibration;
              const trendData = [mBase.vibration * 0.8, mBase.vibration, mBase.vibration * 1.1, mVib * 0.9, mVib];

              return (
                <div key={m.id} className={`attention-card status-${m.status}`}>
                  <div className="attention-card-top">
                    <div className="flex-row-center gap-2">
                      <span className={`badge badge-${m.status}`}>
                        {m.status.toUpperCase()}
                      </span>
                      <strong className="attention-machine-title">{m.name}</strong>
                      <span className="font-mono text-muted text-xs">#{String(m.id).toUpperCase()}</span>
                    </div>
                    <Sparkline values={trendData} status={m.status} width={64} height={20} />
                  </div>

                  <div className="attention-reason">
                    <Activity size={13} className="inline-icon" /> {reason}
                  </div>

                  <div className="attention-actions">
                    <button 
                      className="btn-hud-action btn-hud-action-primary" 
                      onClick={() => { setSelectedMachine(m); setShowWorkOrderModal(true); }}
                    >
                      <PlusCircle size={12} /> Issue Work Order
                    </button>
                    <button 
                      className="btn-hud-action" 
                      onClick={() => { setSelectedMachine(m); setViewMode('hud'); }}
                    >
                      <Crosshair size={12} /> Focus Telemetry
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Main 3-Column Glassmorphic HUD Layout */}
      <div className="hud-main-grid">
        {/* LEFT COLUMN: Translucent Floating Menu & Interactive Filters */}
        <div className="left-hud-menu">
          {/* Quick Node Search Box */}
          <div className="hud-search-box mb-2">
            <Search size={14} className="hud-search-icon" />
            <input
              type="text"
              className="hud-search-input"
              placeholder="Search 32 field nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="hud-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear Search">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter Pills */}
          <div className="glass-subtitle mb-1 text-uppercase font-bold">Status Filter</div>
          <div className="status-filter-group mb-2">
            <button className={`status-filter-pill ${statusFilter === 'all' ? 'active-all' : ''}`} onClick={() => setStatusFilter('all')}>All ({safeMachines.length})</button>
            <button className={`status-filter-pill ${statusFilter === 'active' ? 'active-active' : ''}`} onClick={() => setStatusFilter('active')}>Active ({activeCount})</button>
            <button className={`status-filter-pill ${statusFilter === 'degraded' ? 'active-degraded' : ''}`} onClick={() => setStatusFilter('degraded')}>Degr ({degradedCount})</button>
            <button className={`status-filter-pill ${statusFilter === 'critical' ? 'active-critical' : ''}`} onClick={() => setStatusFilter('critical')}>Crit ({criticalCount})</button>
          </div>

          <button
            className={`menu-hud-btn ${viewMode === 'hud' && selectedSite === 'all' && selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => { setViewMode('hud'); setSelectedSite('all'); setSelectedCategory('all'); }}
          >
            <Shield size={16} /> Overview Command
          </button>

          <button
            className={`menu-hud-btn ${viewMode === 'architecture' ? 'active' : ''}`}
            onClick={() => setViewMode('architecture')}
          >
            <Layers size={16} /> Architecture & 3D Topology
          </button>

          <div className="glass-subtitle mt-2 mb-1 text-uppercase font-bold">Plants & Sites</div>
          <button
            className={`menu-hud-btn ${selectedSite === 'site_alpha' ? 'active' : ''}`}
            onClick={() => { setViewMode('hud'); setSelectedSite('site_alpha'); }}
          >
            <Layers size={16} /> Detroit Alpha <span className="menu-badge">16</span>
          </button>
          <button
            className={`menu-hud-btn ${selectedSite === 'site_beta' ? 'active' : ''}`}
            onClick={() => { setViewMode('hud'); setSelectedSite('site_beta'); }}
          >
            <Layers size={16} /> Houston Beta <span className="menu-badge">16</span>
          </button>

          <div className="glass-subtitle mt-2 mb-1 text-uppercase font-bold">Equipment Category</div>
          <button
            className={`menu-hud-btn ${selectedCategory === 'motor' ? 'active' : ''}`}
            onClick={() => { setViewMode('hud'); setSelectedCategory('motor'); }}
          >
            <Cpu size={16} /> Electric Motors <span className="menu-badge">4</span>
          </button>
          <button
            className={`menu-hud-btn ${selectedCategory === 'pump' ? 'active' : ''}`}
            onClick={() => { setViewMode('hud'); setSelectedCategory('pump'); }}
          >
            <Zap size={16} /> Centrifugal Pumps <span className="menu-badge">4</span>
          </button>
          <button
            className={`menu-hud-btn ${selectedCategory === 'compressor' ? 'active' : ''}`}
            onClick={() => { setViewMode('hud'); setSelectedCategory('compressor'); }}
          >
            <Activity size={16} /> Compressors <span className="menu-badge">4</span>
          </button>
          <button
            className={`menu-hud-btn ${selectedCategory === 'conveyor' ? 'active' : ''}`}
            onClick={() => { setViewMode('hud'); setSelectedCategory('conveyor'); }}
          >
            <Sliders size={16} /> Belt Conveyors <span className="menu-badge">4</span>
          </button>
          <button
            className={`menu-hud-btn ${selectedCategory === 'robot' ? 'active' : ''}`}
            onClick={() => { setViewMode('hud'); setSelectedCategory('robot'); }}
          >
            <Layers size={16} /> Articulated Robots <span className="menu-badge">4</span>
          </button>
          <button
            className={`menu-hud-btn ${selectedCategory === 'furnace' ? 'active' : ''}`}
            onClick={() => { setViewMode('hud'); setSelectedCategory('furnace'); }}
          >
            <Flame size={16} /> Blast Furnaces <span className="menu-badge">4</span>
          </button>
          <button
            className={`menu-hud-btn ${selectedCategory === 'cnc' ? 'active' : ''}`}
            onClick={() => { setViewMode('hud'); setSelectedCategory('cnc'); }}
          >
            <Wrench size={16} /> Precision CNC Mills <span className="menu-badge">4</span>
          </button>
          <button
            className={`menu-hud-btn ${selectedCategory === 'blower' ? 'active' : ''}`}
            onClick={() => { setViewMode('hud'); setSelectedCategory('blower'); }}
          >
            <RefreshCw size={16} /> Plant Blowers <span className="menu-badge">4</span>
          </button>

          <div className="glass-subtitle mt-2 mb-1 text-uppercase font-bold">Views & Simulations</div>
          <button
            className={`menu-hud-btn ${viewMode === '3d' ? 'active' : ''}`}
            onClick={() => setViewMode('3d')}
          >
            <Compass size={16} /> 3D Digital Twin View <span className="menu-badge">Live</span>
          </button>
          <button
            className={`menu-hud-btn ${viewMode === 'alerts' ? 'active' : ''}`}
            onClick={() => setViewMode('alerts')}
          >
            <AlertTriangle size={16} /> Active Alerts <span className="menu-badge">{activeAlerts.length}</span>
          </button>
          <button
            className={`menu-hud-btn ${viewMode === 'kanban' ? 'active' : ''}`}
            onClick={() => setViewMode('kanban')}
          >
            <Wrench size={16} /> Work Orders Board <span className="menu-badge">{workOrders.length}</span>
          </button>
        </div>

        {/* CENTER COLUMN: Focus Card & Real-Time Analytics Radar Panels */}
        <div className="center-hud-column">
          {viewMode === 'architecture' && (
            <ArchitectureTopology machines={displayList} />
          )}
          {viewMode === '3d' && (
            <Device3DSimulation machine={activeFocusMachine} telemetry={{ vibration: vibVal, temperature: tempVal, pressure: pressVal, rpm: rpmVal }} onClose={() => setViewMode('hud')} />
          )}
          {viewMode === 'hud' && (
            <>
              {/* Floating Center Focus Telemetry Card */}
              {activeFocusMachine && (
                <div className="glass-panel">
                  <div className="glass-panel-header">
                    <div className="glass-title">
                      <Crosshair size={18} className="module-feature-bullet" /> Node Focus: {activeFocusMachine.name}
                    </div>
                    <div className="flex-row-center gap-2">
                      <span className={`badge badge-${activeFocusMachine.status === 'critical' ? 'critical' : activeFocusMachine.status === 'degraded' ? 'degraded' : 'active'}`}>
                        {activeFocusMachine.status.toUpperCase()}
                      </span>
                      <span className="hud-chip font-mono">
                        NODE #{String(activeFocusMachine.id || 'mach_001').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="center-focus-card">
                    <div className="focus-graphic-box">
                      <Cpu size={48} className="focus-graphic-icon" />
                      <div className="glass-subtitle text-uppercase font-bold mt-1">{MACHINE_TYPES[activeFocusMachine.type] || activeFocusMachine.type}</div>
                      <span className="badge badge-active mt-2">Live Telemetry Active</span>
                      
                      <div className="focus-actions-row">
                        <button 
                          className="btn-hud-action btn-hud-action-primary" 
                          onClick={() => setShowWorkOrderModal(true)}
                          title="Dispatch maintenance technician"
                        >
                          <PlusCircle size={13} /> Work Order
                        </button>
                        <button 
                          className="btn-hud-action" 
                          onClick={() => setViewMode('3d')}
                          title="Inspect 3D CAD Twin"
                        >
                          <Compass size={13} /> 3D Twin
                        </button>
                      </div>
                    </div>

                    <div className="focus-stats-list">
                      <div className="focus-stat-row">
                        <span className="focus-stat-label"><Activity size={14} /> Telemetry Health Score</span>
                        <span className={`focus-stat-value ${healthPercent > 80 ? 'text-success' : healthPercent > 60 ? 'text-amber' : 'text-danger'}`}>
                          {healthScore} ({healthPercent}%)
                        </span>
                      </div>
                      <div className="focus-stat-row">
                        <span className="focus-stat-label"><Gauge size={14} /> Drive Speed / Flow</span>
                        <span className="focus-stat-value">
                          {activeFocusMachine.type === 'motor' || activeFocusMachine.type === 'conveyor' || activeFocusMachine.type === 'cnc' || activeFocusMachine.type === 'robot' ? `${rpmVal} RPM` : `${flowVal} GPM`}
                        </span>
                      </div>
                      <div className="focus-stat-row">
                        <span className="focus-stat-label"><Activity size={14} /> Vibration Level</span>
                        <span className="focus-stat-value">
                          {vibVal} mm/s
                        </span>
                      </div>
                      <div className="focus-stat-row">
                        <span className="focus-stat-label"><Flame size={14} /> Thermal Temperature</span>
                        <span className="focus-stat-value">
                          {tempVal} °C
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom 3 Real-Time Glassmorphic Analytics Panels */}
              <div className="center-analytics-grid">
                {/* PANEL 1: Dynamic Pentagon Radar Chart */}
                <div className="glass-panel">
                  <div className="glass-panel-header">
                    <div className="glass-title">Node Performance</div>
                  </div>
                  <div className="radar-container">
                    <svg width="180" height="150" viewBox="0 0 200 180" className="radar-svg">
                      <defs>
                        <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#1B2A4A" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#223354" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>

                      <polygon points="100,15 175,65 145,145 55,145 25,65" fill="none" stroke="var(--border-color)" strokeWidth="1" />
                      <polygon points="100,40 150,75 130,125 70,125 50,75" fill="none" stroke="var(--border-color)" strokeWidth="1" />

                      {/* DYNAMIC TELEMETRY RADAR POLYGON */}
                      <polygon points={dynamicRadarPoints} fill="url(#radarGrad)" stroke="var(--accent-navy)" strokeWidth="1.5" />
                      <text x="100" y="10" fill="var(--accent-navy)" fontSize="9" textAnchor="middle" fontWeight="600">Vib: <tspan className="font-mono">{vibVal} mm/s</tspan></text>
                      <text x="178" y="148" fill="var(--status-degraded-text)" fontSize="9" textAnchor="start" fontWeight="600">Temp: <tspan className="font-mono">{tempVal}°C</tspan></text>
                      <text x="22" y="148" fill="var(--status-active-text)" fontSize="9" textAnchor="end" fontWeight="600">Health: <tspan className="font-mono">{healthPercent}%</tspan></text>
                      <text x="100" y="172" fill="var(--text-secondary)" fontSize="9" textAnchor="middle" fontWeight="600">Press: <tspan className="font-mono">{pressVal} PSI</tspan></text>
                    </svg>
                  </div>
                </div>

                {/* PANEL 2: Dynamic Telemetry Range Segmented LED Meters */}
                <div className="glass-panel">
                  <div className="glass-panel-header">
                    <div className="glass-title">Telemetry Ranges</div>
                  </div>
                  <div className="segmented-meter-group">
                    <div>
                      <div className="segmented-label-row">
                        <span>Short (Vib: {vibVal}mm/s)</span>
                        <span className="font-mono font-bold">{Math.round((vibVal / 8.0) * 100)}%</span>
                      </div>
                      <div className="segmented-bar">
                        {[...Array(20)].map((_, i) => (
                          <div key={i} className={`segment-cell ${i < vibCells ? 'active-cyan' : ''}`} />
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="segmented-label-row">
                        <span>Medium (Temp: {tempVal}°C)</span>
                        <span className="font-mono font-bold">{Math.round((tempVal / 100.0) * 100)}%</span>
                      </div>
                      <div className="segmented-bar">
                        {[...Array(20)].map((_, i) => (
                          <div key={i} className={`segment-cell ${i < tempCells ? 'active-amber' : ''}`} />
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="segmented-label-row">
                        <span>Long (Press: {pressVal}PSI)</span>
                        <span className="font-mono font-bold">{Math.round((pressVal / 150.0) * 100)}%</span>
                      </div>
                      <div className="segmented-bar">
                        {[...Array(20)].map((_, i) => (
                          <div key={i} className={`segment-cell ${i < pressCells ? 'active-orange' : ''}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* PANEL 3: Dynamic Energy & Spectrum Equalizer */}
                <div className="glass-panel">
                  <div className="glass-panel-header">
                    <div className="glass-title">Energy Spectrum</div>
                  </div>
                  <div className="equalizer-grid">
                    {eqData.map((val, colIdx) => (
                      <div key={colIdx} className="eq-column">
                        {[...Array(8)].map((_, barIdx) => {
                          const isActive = barIdx < Math.min(8, Math.max(1, Math.floor((val / 100) * 8)));
                          const cls = barIdx < 3 ? 'active-low' : barIdx < 6 ? 'active-mid' : 'active-high';
                          return <div key={barIdx} className={`eq-bar ${isActive ? cls : ''}`} />;
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="segmented-label-row mt-2">
                    <span>Short: 20%</span>
                    <span>Med: 30%</span>
                    <span>Long: 42%</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Kanban Work Orders View */}
          {viewMode === 'kanban' && (
            <div className="glass-panel">
              <div className="glass-panel-header">
                <div className="glass-title">
                  <Wrench size={18} className="module-feature-bullet" /> Maintenance Work Orders Board
                </div>
                <button className="btn btn-sm btn-primary flex-row-center gap-1" onClick={() => setShowWorkOrderModal(true)}>
                  <PlusCircle size={14} /> New Work Order
                </button>
              </div>
              <div className="grid-3">
                <div className="card">
                  <h3 className="heading-md mb-2">Pending Triage ({workOrders.filter(w => w.status === 'Pending Triage' || !w.status).length})</h3>
                  <div className="flex-column-gap">
                    {workOrders.filter(w => w.status === 'Pending Triage' || !w.status).map(wo => (
                      <div key={wo.id} className="submission-item-card">
                        <strong className="heading-md">{wo.title || wo.id}</strong>
                        <p className="subtext mt-1">{wo.description || 'Target Machine: ' + wo.machine_id}</p>
                        <span className="badge badge-critical mt-2 inline-block">{wo.priority || 'High Priority'}</span>
                      </div>
                    ))}
                    {workOrders.filter(w => w.status === 'Pending Triage' || !w.status).length === 0 && (
                      <div className="submission-item-card">
                        <strong className="heading-md">WO #001 — Bearing Replacement</strong>
                        <p className="subtext mt-1">High vibration alert on Electric Motor #1</p>
                        <span className="badge badge-critical mt-2 inline-block">High Priority</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="card">
                  <h3 className="heading-md mb-2">In Progress ({workOrders.filter(w => w.status === 'In Progress').length})</h3>
                  <div className="submission-item-card selected">
                    <strong className="heading-md">WO #002 — Pump Shaft Calibration</strong>
                    <p className="subtext mt-1">Assigned to Senior Tech Dave Miller</p>
                    <span className="badge badge-degraded mt-2 inline-block">In Progress</span>
                  </div>
                </div>
                <div className="card">
                  <h3 className="heading-md mb-2">Completed ({workOrders.filter(w => w.status === 'Completed').length})</h3>
                  <div className="submission-item-card">
                    <strong className="heading-md">WO #003 — Compressor Lubrication</strong>
                    <p className="subtext mt-1">Maintenance verified and signed off</p>
                    <span className="badge badge-active mt-2 inline-block">Completed</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Alerts View */}
          {viewMode === 'alerts' && (
            <div className="glass-panel">
              <div className="glass-panel-header">
                <div className="glass-title">
                  <AlertTriangle size={18} className="module-feature-bullet" /> Threshold Alerts Feed
                </div>
              </div>
              <div className="flex-column-gap">
                {activeAlerts.length > 0 ? activeAlerts.map(alt => (
                  <div key={alt.id} className="submission-item-card">
                    <div className="flex-between">
                      <strong className="heading-md">{alt.message}</strong>
                      <span className={`badge badge-${alt.severity === 'Critical' ? 'critical' : 'degraded'}`}>{alt.severity}</span>
                    </div>
                    <p className="subtext mt-1">Machine: {alt.machine_id} • Status: {alt.status}</p>
                  </div>
                )) : (
                  <div className="submission-item-card">
                    <strong className="heading-md text-success">No active alerts</strong>
                    <p className="subtext mt-1">All monitored machines operating within nominal sensor thresholds.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Floating Overview & Site Telemetry Table */}
        <div className="right-hud-overview">
          {/* Site Specification Glass Table */}
          <div className="glass-panel">
            <div className="glass-panel-header">
              <div className="glass-title">Plant Overview</div>
            </div>

            <table className="overview-table">
              <tbody>
                <tr>
                  <td><span className="table-cell-icon"><Anchor size={14} /> Site Name</span></td>
                  <td>{selectedSite === 'site_beta' ? 'Houston Refinery' : 'Detroit MegaPlant'}</td>
                </tr>
                <tr>
                  <td><span className="table-cell-icon"><Compass size={14} /> Gateway Node</span></td>
                  <td>{selectedSite === 'site_beta' ? 'Gateway Beta-01' : 'Gateway Alpha-01'}</td>
                </tr>
                <tr>
                  <td><span className="table-cell-icon"><Layers size={14} /> Fleet Size</span></td>
                  <td>{displayList.length} Active Nodes</td>
                </tr>
                <tr>
                  <td><span className="table-cell-icon"><Radio size={14} /> Operations Role</span></td>
                  <td>Predictive Telemetry</td>
                </tr>
                <tr>
                  <td><span className="table-cell-icon"><Flame size={14} /> Efficiency Mode</span></td>
                  <td><span className="specialty-badge">Ultra Fast</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Operational Energy Costs & Need */}
          <div className="glass-panel">
            <div className="glass-panel-header">
              <div className="glass-title">Operational Metrics</div>
            </div>

            <table className="overview-table">
              <tbody>
                <tr>
                  <td><span className="table-cell-icon"><Zap size={14} /> Power Draw</span></td>
                  <td className="font-mono">{Math.round(currVal * 36)} kW</td>
                </tr>
                <tr>
                  <td><span className="table-cell-icon"><Clock size={14} /> Maintenance Upkeep</span></td>
                  <td className="font-mono">8 Hours</td>
                </tr>
                <tr>
                  <td><span className="table-cell-icon"><Activity size={14} /> Plant System Need</span></td>
                  <td className="font-mono">{Math.round(healthPercent * 1.5)} Units</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: All Monitored Machine Nodes Grid */}
      <div className="machine-nodes-section">
        {/* Device Category Filter Tabs Bar */}
        <div className="device-tabs-bar">
          <button
            className={`device-tab-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory('all');
              if (safeMachines.length > 0) setSelectedMachine(safeMachines[0]);
            }}
          >
            <Server size={16} /> All Monitored Devices <span className="tab-count-badge">32</span>
          </button>
          
          <button
            className={`device-tab-btn ${selectedCategory === 'motor' ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory('motor');
              const item = safeMachines.find(m => m.type === 'motor');
              if (item) setSelectedMachine(item);
            }}
          >
            <Cpu size={16} /> Electric Motors <span className="tab-count-badge">4</span>
          </button>

          <button
            className={`device-tab-btn ${selectedCategory === 'pump' ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory('pump');
              const item = safeMachines.find(m => m.type === 'pump');
              if (item) setSelectedMachine(item);
            }}
          >
            <Zap size={16} /> Slurry Pumps <span className="tab-count-badge">4</span>
          </button>

          <button
            className={`device-tab-btn ${selectedCategory === 'compressor' ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory('compressor');
              const item = safeMachines.find(m => m.type === 'compressor');
              if (item) setSelectedMachine(item);
            }}
          >
            <Activity size={16} /> Compressors <span className="tab-count-badge">4</span>
          </button>

          <button
            className={`device-tab-btn ${selectedCategory === 'conveyor' ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory('conveyor');
              const item = safeMachines.find(m => m.type === 'conveyor');
              if (item) setSelectedMachine(item);
            }}
          >
            <Sliders size={16} /> Belt Conveyors <span className="tab-count-badge">4</span>
          </button>

          <button
            className={`device-tab-btn ${selectedCategory === 'robot' ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory('robot');
              const item = safeMachines.find(m => m.type === 'robot');
              if (item) setSelectedMachine(item);
            }}
          >
            <Layers size={16} /> Weld Robots <span className="tab-count-badge">4</span>
          </button>

          <button
            className={`device-tab-btn ${selectedCategory === 'furnace' ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory('furnace');
              const item = safeMachines.find(m => m.type === 'furnace');
              if (item) setSelectedMachine(item);
            }}
          >
            <Flame size={16} /> Blast Furnaces <span className="tab-count-badge">4</span>
          </button>

          <button
            className={`device-tab-btn ${selectedCategory === 'cnc' ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory('cnc');
              const item = safeMachines.find(m => m.type === 'cnc');
              if (item) setSelectedMachine(item);
            }}
          >
            <Wrench size={16} /> CNC Mills <span className="tab-count-badge">4</span>
          </button>

          <button
            className={`device-tab-btn ${selectedCategory === 'blower' ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory('blower');
              const item = safeMachines.find(m => m.type === 'blower');
              if (item) setSelectedMachine(item);
            }}
          >
            <RefreshCw size={16} /> Plant Blowers <span className="tab-count-badge">4</span>
          </button>
        </div>

        <div className="site-hud-banner">
          <div>
            <h2 className="heading-lg">
              {selectedCategory === 'all'
                ? `All Monitored Telemetry Machine Nodes (${displayList.length})`
                : `${selectedCategory.toUpperCase()} Nodes (${displayList.length})`}
            </h2>
            <p className="hud-tagline">Click any machine node to focus real-time analytics • Toggle row details inline</p>
          </div>

          <div className="flex-row-center gap-2">
            <div className="segmented-control-mini">
              <button
                className={`btn-seg-mini ${nodeDisplayFormat === 'collapsed' ? 'active' : ''}`}
                onClick={() => setNodeDisplayFormat('collapsed')}
                title="Compact Collapsed Row View"
              >
                <List size={13} /> Compact
              </button>
              <button
                className={`btn-seg-mini ${nodeDisplayFormat === 'expanded' ? 'active' : ''}`}
                onClick={() => setNodeDisplayFormat('expanded')}
                title="Expanded Telemetry Cards"
              >
                <Grid size={13} /> Grid
              </button>
            </div>

            <button
              className={`btn btn-sm ${selectedSite === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedSite('all')}
            >
              All Plants (32)
            </button>
            <button
              className={`btn btn-sm ${selectedSite === 'site_alpha' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedSite('site_alpha')}
            >
              Detroit (16)
            </button>
            <button
              className={`btn btn-sm ${selectedSite === 'site_beta' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedSite('site_beta')}
            >
              Houston (16)
            </button>
          </div>
        </div>

        <div className="category-clusters-wrapper">
          {Object.keys(CATEGORY_CONFIG).map(catKey => {
            const clusterItems = displayList.filter(m => m.type === catKey);
            if (clusterItems.length === 0) return null;
            const cfg = CATEGORY_CONFIG[catKey];
            const IconComp = cfg.icon;

            return (
              <div key={catKey} className="category-cluster-card" style={{ borderTop: `3px solid ${cfg.color}` }}>
                <div className="category-cluster-header">
                  <div className="category-cluster-title">
                    <div className="machine-type-icon" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                      <IconComp size={18} />
                    </div>
                    <span>{cfg.label}</span>
                  </div>
                  <span className="hud-chip font-mono">
                    {clusterItems.length} Monitored Nodes
                  </span>
                </div>

                <div className={nodeDisplayFormat === 'collapsed' ? "category-cluster-list" : "category-cluster-grid"}>
                  {clusterItems.map(m => {
                    const liveData = telemetryData && telemetryData[m.id];
                    const isSelected = activeFocusMachine?.id === m.id;
                    const mBase = getMachineBaseline(m.id);

                    const mVib = liveData?.values?.vibration ? parseFloat(liveData.values.vibration) : mBase.vibration;
                    const mTemp = liveData?.values?.temperature ? parseFloat(liveData.values.temperature) : mBase.temperature;
                    const mPress = liveData?.values?.pressure ? parseFloat(liveData.values.pressure) : mBase.pressure;
                    const cardHealthPct = Math.max(40, Math.min(100, Math.round(100 - (mVib * 4.5 + (mTemp > 70 ? (mTemp - 70) * 1.2 : 0)))));
                    const trendValues = [mBase.vibration * 0.8, mBase.vibration, mBase.vibration * 1.1, mVib * 0.9, mVib];
                    const isExpanded = nodeDisplayFormat === 'expanded' || expandedNodes[m.id];

                    if (nodeDisplayFormat === 'collapsed' && !isExpanded) {
                      return (
                        <div
                          key={m.id}
                          className={`machine-row-collapsed ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedMachine(m)}
                        >
                          <div className="machine-row-left">
                            <div className="machine-type-icon-sm" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                              <IconComp size={15} />
                            </div>
                            <div>
                              <strong className="machine-row-name">{m.name}</strong>
                              <span className="font-mono text-muted text-xs ml-2">#{String(m.id).toUpperCase()}</span>
                            </div>
                            <span className={`badge badge-${m.status} ml-2`}>
                              {m.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="machine-row-right">
                            <div className="machine-row-metric">
                              <span className="text-muted text-xs font-sans mr-1">Vib:</span>
                              <span className="font-mono font-medium">{mVib.toFixed(1)} mm/s</span>
                            </div>

                            <Sparkline values={trendValues} status={m.status} width={50} height={16} />

                            <button 
                              className="btn-icon-ghost" 
                              onClick={(e) => toggleNodeExpanded(m.id, e)}
                              title="Expand inline telemetry breakdown"
                            >
                              <ChevronDown size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.id}
                        className={`machine-card-glass status-${m.status} ${isSelected ? 'selected' : ''}`}
                        style={{
                          borderColor: isSelected ? '#1B2A4A' : '#E8E9ED',
                          boxShadow: isSelected ? '0 4px 12px rgba(27, 42, 74, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)'
                        }}
                        onClick={() => setSelectedMachine(m)}
                      >
                        <div className="machine-card-header">
                          <div className="flex-row-center gap-2">
                            <div className="machine-type-icon status-indicator-ring" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                              <IconComp size={18} />
                            </div>
                            <div>
                              <strong className="heading-md">{m.name}</strong>
                              <div className="glass-subtitle font-mono">{String(m.id || '').toUpperCase()}</div>
                            </div>
                          </div>

                          <div className="flex-row-center gap-1">
                            <span className={`badge badge-${m.status === 'critical' || mVib > 6.5 ? 'critical' : m.status === 'degraded' || mVib > 4.5 ? 'degraded' : 'active'}`}>
                              {m.status.toUpperCase()}
                            </span>
                            {nodeDisplayFormat === 'collapsed' && (
                              <button className="btn-icon-ghost" onClick={(e) => toggleNodeExpanded(m.id, e)}>
                                <ChevronUp size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Health Mini Bar */}
                        <div className="health-mini-bar-track" title={`Health Score: ${cardHealthPct}%`}>
                          <div
                            className={`health-mini-bar-fill ${cardHealthPct > 80 ? 'high' : cardHealthPct > 60 ? 'medium' : 'low'}`}
                            style={{ width: `${cardHealthPct}%` }}
                          />
                        </div>

                        <div className="telemetry-unified-strip">
                          {getMachinePills(m, liveData, mBase).map((pill, pIdx) => (
                            <React.Fragment key={pIdx}>
                              {pIdx > 0 && <span className="telemetry-divider"></span>}
                              <div className="telemetry-strip-item">
                                <span className="telemetry-strip-label" title={pill.label}>{pill.label}</span>
                                <span className="telemetry-strip-val">{pill.val}</span>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Work Order Creation Modal */}
      {showWorkOrderModal && (
        <div className="hud-modal-overlay" onClick={() => setShowWorkOrderModal(false)}>
          <div className="hud-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="hud-modal-header">
              <div className="hud-modal-title">
                <Wrench size={20} /> Issue Maintenance Work Order
              </div>
              <button className="btn-search-clear" onClick={() => setShowWorkOrderModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrder}>
              <div className="hud-form-group">
                <label className="hud-form-label">Target Machine Node</label>
                <input
                  type="text"
                  className="hud-form-input"
                  value={`${selectedMachine?.name || 'Machine'} (${selectedMachine?.id || 'mach_001'})`}
                  disabled
                />
              </div>

              <div className="hud-form-group">
                <label className="hud-form-label">Work Order Title</label>
                <input
                  type="text"
                  className="hud-form-input"
                  placeholder="e.g. Bearing Replacement & Spindle Lubrication"
                  value={newWOTitle}
                  onChange={(e) => setNewWOTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="hud-form-group">
                <label className="hud-form-label">Priority Severity</label>
                <select
                  className="hud-form-select"
                  value={newWOPriority}
                  onChange={(e) => setNewWOPriority(e.target.value)}
                >
                  <option value="Low Priority">Low Priority</option>
                  <option value="Medium Priority">Medium Priority</option>
                  <option value="High Priority">High Priority (Immediate)</option>
                  <option value="Critical Outage">Critical Outage (Emergency)</option>
                </select>
              </div>

              <div className="hud-form-group">
                <label className="hud-form-label">Work Order Details & Instructions</label>
                <textarea
                  className="hud-form-textarea"
                  rows={4}
                  placeholder="Enter technician dispatch notes and diagnostic observations..."
                  value={newWODesc}
                  onChange={(e) => setNewWODesc(e.target.value)}
                />
              </div>

              <div className="flex-between mt-3">
                <button type="button" className="btn btn-secondary" onClick={() => setShowWorkOrderModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-row-center gap-1">
                  <Send size={14} /> Dispatch Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>

  );
}

function Device3DSimulation({ machine, telemetry, onClose }) {
  const canvasRef = React.useRef(null);
  const [wireframe, setWireframe] = React.useState(false);
  const [thermalMode, setThermalMode] = React.useState(false);
  const [exploded, setExploded] = React.useState(false);
  const [autoRotate, setAutoRotate] = React.useState(true);

  // 3D Orbit Controls State
  const [yaw, setYaw] = React.useState(0);
  const [pitch, setPitch] = React.useState(0.2);
  const isDraggingRef = React.useRef(false);
  const lastMousePosRef = React.useRef({ x: 0, y: 0 });

  const vib = telemetry?.vibration || 2.4;
  const temp = telemetry?.temperature || 54.2;
  const rpm = telemetry?.rpm || 1450;
  const press = telemetry?.pressure || 42;

  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;

    setYaw(prev => prev + dx * 0.01);
    setPitch(prev => Math.max(-Math.PI / 3, Math.min(Math.PI / 3, prev + dy * 0.01)));

    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let localAngle = 0;
    let particleOffset = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      if (autoRotate && !isDraggingRef.current) {
        localAngle += (rpm / 6000) * 0.08 + 0.015;
      }
      particleOffset = (particleOffset + (rpm / 3000) * 2 + 1) % 100;

      const currentYaw = yaw + (autoRotate && !isDraggingRef.current ? localAngle * 0.3 : 0);
      const currentPitch = pitch;

      // Dark Sci-Fi WebGL-Style Grid & Horizon Glow
      const bgGrad = ctx.createRadialGradient(cx, cy, 50, cx, cy, 320);
      bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
      bgGrad.addColorStop(1, 'rgba(7, 12, 23, 0.98)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cybernetic Perspective Grid Lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Live Telemetry Vibration Wobble
      const vibOffset = (Math.random() - 0.5) * (vib * 1.8);

      ctx.save();
      ctx.translate(cx + vibOffset, cy + vibOffset);

      // Color Theme Palette (Thermal Infrared vs Standard Cyber Cyan)
      const baseHue = thermalMode ? (temp > 75 ? 0 : temp > 55 ? 35 : temp > 40 ? 190 : 220) : 195;
      const mainStroke = thermalMode ? `hsl(${baseHue}, 100%, 55%)` : '#38bdf8';
      const mainFill = thermalMode ? `hsla(${baseHue}, 100%, 50%, 0.28)` : 'rgba(56, 189, 248, 0.14)';
      const accentGold = thermalMode ? '#f97316' : '#fbbf24';

      ctx.strokeStyle = mainStroke;
      ctx.fillStyle = mainFill;
      ctx.lineWidth = wireframe ? 1.5 : 2.2;

      const type = machine?.type || 'motor';
      const explodeOffset = exploded ? 45 : 0;

      // 3D Matrix Transform Projections
      const project3D = (x, y, z) => {
        const cosY = Math.cos(currentYaw);
        const sinY = Math.sin(currentYaw);
        const cosP = Math.cos(currentPitch);
        const sinP = Math.sin(currentPitch);

        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;

        const y2 = y * cosP - z1 * sinP;
        const z2 = y * sinP + z1 * cosP;

        const scale = 320 / (320 + z2);
        return {
          px: x1 * scale,
          py: y2 * scale,
          scale
        };
      };

      // -----------------------------------------------------------------------
      // DEVICE TYPE 1: ELECTRIC MOTOR 3D ASSEMBLY
      // -----------------------------------------------------------------------
      if (type === 'motor') {
        // Stator Housing Cylinder with Heat Sink Fins
        const radius = 75;
        const length = 140;
        const slices = 16;

        for (let i = 0; i < slices; i++) {
          const a1 = (i / slices) * Math.PI * 2;
          const a2 = ((i + 1) / slices) * Math.PI * 2;

          const p11 = project3D(Math.cos(a1) * radius, -length / 2 - explodeOffset, Math.sin(a1) * radius);
          const p12 = project3D(Math.cos(a1) * radius, length / 2 - explodeOffset, Math.sin(a1) * radius);
          const p21 = project3D(Math.cos(a2) * radius, -length / 2 - explodeOffset, Math.sin(a2) * radius);
          const p22 = project3D(Math.cos(a2) * radius, length / 2 - explodeOffset, Math.sin(a2) * radius);

          ctx.beginPath();
          ctx.moveTo(p11.px, p11.py);
          ctx.lineTo(p21.px, p21.py);
          ctx.lineTo(p22.px, p22.py);
          ctx.lineTo(p12.px, p12.py);
          ctx.closePath();

          if (!wireframe) ctx.fill();
          ctx.stroke();
        }

        // Inner Rotating Copper Rotor Coils & Shaft
        ctx.strokeStyle = accentGold;
        ctx.lineWidth = 3;
        const rotorR = 40;
        const shaftLen = 220;

        for (let i = 0; i < 8; i++) {
          const rAngle = (i / 8) * Math.PI * 2 + localAngle;
          const rp1 = project3D(Math.cos(rAngle) * rotorR, -shaftLen / 2 + explodeOffset, Math.sin(rAngle) * rotorR);
          const rp2 = project3D(Math.cos(rAngle) * rotorR, shaftLen / 2 + explodeOffset, Math.sin(rAngle) * rotorR);

          ctx.beginPath();
          ctx.moveTo(rp1.px, rp1.py);
          ctx.lineTo(rp2.px, rp2.py);
          ctx.stroke();
        }

        // Rear Cooling Fan Blades
        ctx.strokeStyle = '#22c55e';
        const fanZ = -length / 2 - explodeOffset - 30;
        for (let b = 0; b < 6; b++) {
          const bAngle = (b / 6) * Math.PI * 2 + localAngle * 2;
          const fp1 = project3D(0, fanZ, 0);
          const fp2 = project3D(Math.cos(bAngle) * 65, fanZ, Math.sin(bAngle) * 65);

          ctx.beginPath();
          ctx.moveTo(fp1.px, fp1.py);
          ctx.lineTo(fp2.px, fp2.py);
          ctx.stroke();
        }
      }

      // -----------------------------------------------------------------------
      // DEVICE TYPE 2: CENTRIFUGAL PUMP 3D ASSEMBLY
      // -----------------------------------------------------------------------
      else if (type === 'pump') {
        // Volute Spiral Casing Chamber
        const outerR = 85;
        const slices = 18;

        for (let i = 0; i < slices; i++) {
          const a1 = (i / slices) * Math.PI * 2;
          const a2 = ((i + 1) / slices) * Math.PI * 2;

          const p1 = project3D(Math.cos(a1) * outerR, -20 - explodeOffset, Math.sin(a1) * outerR);
          const p2 = project3D(Math.cos(a2) * outerR, -20 - explodeOffset, Math.sin(a2) * outerR);
          const p3 = project3D(Math.cos(a2) * (outerR * 0.7), 40 - explodeOffset, Math.sin(a2) * (outerR * 0.7));
          const p4 = project3D(Math.cos(a1) * (outerR * 0.7), 40 - explodeOffset, Math.sin(a1) * (outerR * 0.7));

          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.lineTo(p3.px, p3.py);
          ctx.lineTo(p4.px, p4.py);
          ctx.closePath();

          if (!wireframe) ctx.fill();
          ctx.stroke();
        }

        // Curved Impeller Blade Rotors
        ctx.strokeStyle = accentGold;
        ctx.lineWidth = 3;
        for (let b = 0; b < 6; b++) {
          const bAngle = (b / 6) * Math.PI * 2 + localAngle;
          const ip1 = project3D(0, 10 + explodeOffset, 0);
          const ip2 = project3D(Math.cos(bAngle) * 70, 10 + explodeOffset, Math.sin(bAngle) * 70);

          ctx.beginPath();
          ctx.moveTo(ip1.px, ip1.py);
          ctx.lineTo(ip2.px, ip2.py);
          ctx.stroke();
        }

        // Fluid Particle Streamers
        ctx.fillStyle = '#38bdf8';
        for (let p = 0; p < 12; p++) {
          const pProgress = ((particleOffset + p * 8) % 100) / 100;
          const pAngle = pProgress * Math.PI * 2 + localAngle;
          const pr = 20 + pProgress * 60;
          const pt = project3D(Math.cos(pAngle) * pr, 10, Math.sin(pAngle) * pr);

          ctx.beginPath();
          ctx.arc(pt.px, pt.py, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // -----------------------------------------------------------------------
      // DEVICE TYPE 3: INDUSTRIAL COMPRESSOR 3D ASSEMBLY
      // -----------------------------------------------------------------------
      else if (type === 'compressor') {
        // V-Twin Dual Cylinder Block
        const cylR = 50;
        const cylH = 110;

        [-55, 55].forEach((xOff, idx) => {
          for (let i = 0; i < 12; i++) {
            const a1 = (i / 12) * Math.PI * 2;
            const a2 = ((i + 1) / 12) * Math.PI * 2;

            const p1 = project3D(xOff + Math.cos(a1) * cylR, -cylH / 2 - (idx === 0 ? explodeOffset : -explodeOffset), Math.sin(a1) * cylR);
            const p2 = project3D(xOff + Math.cos(a2) * cylR, -cylH / 2 - (idx === 0 ? explodeOffset : -explodeOffset), Math.sin(a2) * cylR);
            const p3 = project3D(xOff + Math.cos(a2) * cylR, cylH / 2 - (idx === 0 ? explodeOffset : -explodeOffset), Math.sin(a2) * cylR);
            const p4 = project3D(xOff + Math.cos(a1) * cylR, cylH / 2 - (idx === 0 ? explodeOffset : -explodeOffset), Math.sin(a1) * cylR);

            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.lineTo(p3.px, p3.py);
            ctx.lineTo(p4.px, p4.py);
            ctx.closePath();

            if (!wireframe) ctx.fill();
            ctx.stroke();
          }

          // Alternating Reciprocating Piston Head
          ctx.strokeStyle = accentGold;
          ctx.lineWidth = 3;
          const pistonY = Math.sin(localAngle + (idx * Math.PI)) * 30;
          const pp1 = project3D(xOff - 35, pistonY, 0);
          const pp2 = project3D(xOff + 35, pistonY, 0);

          ctx.beginPath();
          ctx.moveTo(pp1.px, pp1.py);
          ctx.lineTo(pp2.px, pp2.py);
          ctx.stroke();
        });
      }

      // -----------------------------------------------------------------------
      // DEVICE TYPE 4: HEAVY BELT CONVEYOR 3D ASSEMBLY
      // -----------------------------------------------------------------------
      else if (type === 'conveyor') {
        // Structural Truss Frame & Dual Drum Rollers
        const frameW = 110;
        const frameL = 200;

        [-frameL / 2, frameL / 2].forEach((zOff) => {
          const p1 = project3D(-frameW / 2 - explodeOffset, 0, zOff);
          const p2 = project3D(frameW / 2 + explodeOffset, 0, zOff);

          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.stroke();
        });

        // Continuous Loop Belt Track
        ctx.strokeStyle = accentGold;
        ctx.lineWidth = 3;
        for (let b = -frameL / 2; b <= frameL / 2; b += 25) {
          const bZ = b + ((particleOffset * 2.5) % 25);
          if (bZ < frameL / 2) {
            const bp1 = project3D(-frameW / 2, -15, bZ);
            const bp2 = project3D(frameW / 2, -15, bZ);

            ctx.beginPath();
            ctx.moveTo(bp1.px, bp1.py);
            ctx.lineTo(bp2.px, bp2.py);
            ctx.stroke();
          }
        }
      }

      // -----------------------------------------------------------------------
      // DEVICE TYPE 5: 6-AXIS ARTICULATED WELD ROBOT
      // -----------------------------------------------------------------------
      else if (type === 'robot') {
        // Base Pedestal
        const baseP1 = project3D(-50, 60, -50);
        const baseP2 = project3D(50, 60, -50);
        const baseP3 = project3D(50, 60, 50);
        const baseP4 = project3D(-50, 60, 50);

        ctx.beginPath();
        ctx.moveTo(baseP1.px, baseP1.py); ctx.lineTo(baseP2.px, baseP2.py);
        ctx.lineTo(baseP3.px, baseP3.py); ctx.lineTo(baseP4.px, baseP4.py);
        ctx.closePath();
        if (!wireframe) ctx.fill();
        ctx.stroke();

        // Joint 1 & Arm Segment 1
        const armAngle = Math.sin(localAngle) * 0.4;
        const j1 = project3D(0, 60, 0);
        const j2 = project3D(Math.sin(armAngle) * 60, -20 - explodeOffset, Math.cos(armAngle) * 60);
        const j3 = project3D(Math.sin(armAngle * 1.5) * 110, -90 - explodeOffset * 2, Math.cos(armAngle * 1.5) * 110);

        ctx.strokeStyle = accentGold;
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(j1.px, j1.py); ctx.lineTo(j2.px, j2.py); ctx.lineTo(j3.px, j3.py); ctx.stroke();

        // Welding Torch Arc Sparks
        ctx.fillStyle = '#f97316';
        ctx.beginPath(); ctx.arc(j3.px, j3.py, 5, 0, Math.PI * 2); ctx.fill();
      }

      // -----------------------------------------------------------------------
      // DEVICE TYPE 6: INDUCTION BLAST FURNACE
      // -----------------------------------------------------------------------
      else if (type === 'furnace') {
        const rad = 80;
        const h = 150;
        ctx.strokeStyle = '#ef4444';

        for (let i = 0; i < 12; i++) {
          const a1 = (i / 12) * Math.PI * 2;
          const a2 = ((i + 1) / 12) * Math.PI * 2;

          const p1 = project3D(Math.cos(a1) * rad, -h / 2 - explodeOffset, Math.sin(a1) * rad);
          const p2 = project3D(Math.cos(a2) * rad, -h / 2 - explodeOffset, Math.sin(a2) * rad);
          const p3 = project3D(Math.cos(a2) * rad, h / 2 + explodeOffset, Math.sin(a2) * rad);
          const p4 = project3D(Math.cos(a1) * rad, h / 2 + explodeOffset, Math.sin(a1) * rad);

          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py); ctx.lineTo(p2.px, p2.py);
          ctx.lineTo(p3.px, p3.py); ctx.lineTo(p4.px, p4.py);
          ctx.closePath();
          if (!wireframe) ctx.fill();
          ctx.stroke();
        }

        // Inner Thermal Plasma Glow Core
        ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
        const coreP = project3D(0, 0, 0);
        ctx.beginPath(); ctx.arc(coreP.px, coreP.py, 35, 0, Math.PI * 2); ctx.fill();
      }

      // -----------------------------------------------------------------------
      // DEVICE TYPE 7 & 8: CNC MILLS & BLOWERS
      // -----------------------------------------------------------------------
      else {
        const rad = 75;
        const slices = 14;

        for (let i = 0; i < slices; i++) {
          const a1 = (i / slices) * Math.PI * 2 + localAngle;
          const a2 = ((i + 1) / slices) * Math.PI * 2 + localAngle;

          const p1 = project3D(Math.cos(a1) * rad, -60, Math.sin(a1) * rad);
          const p2 = project3D(Math.cos(a2) * rad, -60, Math.sin(a2) * rad);
          const p3 = project3D(Math.cos(a2) * rad, 60, Math.sin(a2) * rad);
          const p4 = project3D(Math.cos(a1) * rad, 60, Math.sin(a1) * rad);

          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py); ctx.lineTo(p2.px, p2.py);
          ctx.lineTo(p3.px, p3.py); ctx.lineTo(p4.px, p4.py);
          ctx.closePath();
          if (!wireframe) ctx.fill();
          ctx.stroke();
        }
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [machine, vib, temp, rpm, press, wireframe, thermalMode, exploded, autoRotate, yaw, pitch]);

  return (
    <div className="glass-panel text-center">
      <div className="glass-panel-header flex-between flex-wrap gap-2">
        <div className="glass-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <Compass size={18} className="module-feature-bullet" />
          <span>3D Digital Twin — <strong>{machine?.name}</strong></span>
        </div>
        <div className="flex-row-center gap-2">
          <button className={`btn btn-xs ${wireframe ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setWireframe(!wireframe)} title="Toggle Wireframe">
            {wireframe ? 'Solid' : 'Wireframe'}
          </button>
          <button className={`btn btn-xs ${thermalMode ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setThermalMode(!thermalMode)} title="Toggle Thermal Infrared">
            {thermalMode ? 'Standard' : 'Thermal IR'}
          </button>
          <button className={`btn btn-xs ${exploded ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setExploded(!exploded)} title="Toggle Exploded Assembly">
            {exploded ? 'Assembled' : 'Exploded'}
          </button>
          <button className="btn btn-xs btn-secondary" onClick={() => setAutoRotate(!autoRotate)}>
            {autoRotate ? 'Pause' : 'Orbit'}
          </button>
          {onClose && (
            <button className="btn-close-icon ml-1" onClick={onClose} title="Close 3D View" aria-label="Close 3D View">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div
        style={{ position: 'relative', width: '100%', height: '400px', cursor: 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} width={680} height={400} style={{ width: '100%', height: '100%', borderRadius: '8px' }} />

        <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(15, 23, 42, 0.95)', padding: '5px 14px', borderRadius: '12px', border: '1px solid #38bdf8', fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
          🖱️ Click & Drag Mouse to 3D Orbit • Scroll to Zoom
        </div>

        {/* Floating 3D Telemetry HUD Callouts */}
        <div style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(15, 23, 42, 0.95)', padding: '10px 16px', borderRadius: '8px', border: '1px solid #38bdf8', textAlign: 'left', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '2px' }}>RPM ROTATION SPEED</div>
          <div className="font-mono font-bold" style={{ fontSize: '0.95rem', color: '#38BDF8' }}>{rpm} RPM</div>
        </div>

        <div style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(15, 23, 42, 0.95)', padding: '10px 16px', borderRadius: '8px', border: '1px solid #f97316', textAlign: 'right', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '2px' }}>THERMAL HOTSPOT</div>
          <div className="font-mono font-bold" style={{ fontSize: '0.95rem', color: '#FBBF24' }}>{temp} °C</div>
        </div>

        <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(15, 23, 42, 0.95)', padding: '10px 16px', borderRadius: '8px', border: '1px solid #f97316', textAlign: 'left', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '2px' }}>VIBRATION WOBBLE</div>
          <div className="font-mono font-bold" style={{ fontSize: '0.95rem', color: '#FB923C' }}>{vib} mm/s</div>
        </div>

        <div style={{ position: 'absolute', bottom: '20px', right: '20px', background: 'rgba(15, 23, 42, 0.95)', padding: '10px 16px', borderRadius: '8px', border: '1px solid #38bdf8', textAlign: 'right', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '2px' }}>CHAMBER PRESSURE</div>
          <div className="font-mono font-bold" style={{ fontSize: '0.95rem', color: '#38BDF8' }}>{press} PSI</div>
        </div>
      </div>

      {/* Real Hardware Sensor Integration Bridge Modal */}
      <HardwareBridgeModal isOpen={showHardwareModal} onClose={() => setShowHardwareModal(false)} />
    </div>
  );
}
