import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, CheckCircle2, ChevronRight,
  Clock3, Cpu, Gauge, LayoutDashboard, MapPin, Radio, Search, ShieldCheck,
  SlidersHorizontal, Wrench, XCircle, Zap
} from 'lucide-react';
import api from './services/api';
import { useSocket } from './context/SocketContext';
import HardwareBridgeModal from './components/HardwareBridgeModal';
import ArchitectureTopology from './components/ArchitectureTopology';
const LiveAssetModel = lazy(() => import('./components/LiveAssetModel')); 

const ASSET_TYPES = {
  motor: 'Bharat Electric Motor',
  pump: 'Godavari Process Pump',
  compressor: 'Himalaya Air Compressor',
  conveyor: 'Ganga Assembly Conveyor',
  robot: 'Arjun Welding Robot',
  furnace: 'Bharat Induction Furnace',
  cnc: 'Vikram Precision CNC Mill',
  blower: 'Monsoon Plant Blower'
};

const PLANTS = {
  site_alpha: { name: 'Pune Integrated Works', city: 'Pune, Maharashtra', gateway: 'Pune Gateway-01' },
  site_beta: { name: 'Jamshedpur Steel Works', city: 'Jamshedpur, Jharkhand', gateway: 'Jamshedpur Gateway-01' }
};

const DEFAULT_MACHINES = Array.from({ length: 32 }, (_, index) => {
  const number = index + 1;
  const types = Object.keys(ASSET_TYPES);
  const type = types[Math.floor(index / 4)];
  return {
    id: `mach_${String(number).padStart(3, '0')}`,
    name: `${ASSET_TYPES[type]} ${((index % 4) + 1).toString().padStart(2, '0')}`,
    type,
    status: number === 1 ? 'degraded' : number === 17 ? 'critical' : 'active'
  };
});

function statusLabel(status) {
  return status === 'critical' ? 'Critical' : status === 'degraded' ? 'Needs attention' : 'Healthy';
}

function healthFor(asset, telemetry) {
  const vibration = Number(telemetry?.values?.vibration || ((Number(asset.id.replace(/\D/g, '')) * 7) % 35) / 10 + 1.2);
  const temperature = Number(telemetry?.values?.temperature || 48);
  return Math.max(42, Math.min(100, Math.round(100 - vibration * 4.2 - Math.max(0, temperature - 70) * 1.1)));
}

function readingFor(asset, telemetry) {
  const number = Number(asset.id.replace(/\D/g, '')) || 1;
  const values = telemetry?.values || {};
  return {
    vibration: Number(values.vibration ?? (1.5 + (number % 24) / 8)).toFixed(1),
    temperature: Number(values.temperature ?? (44 + (number % 30))).toFixed(1),
    speed: Number(values.rpm ?? (1200 + (number * 47) % 700)).toFixed(0),
    pressure: Number(values.pressure ?? (55 + (number * 9) % 75)).toFixed(0)
  };
}

export default function ModuleA_Minimal() {
  const { isConnected, telemetryData = {}, alerts: liveAlerts = [] } = useSocket();
  const [machines, setMachines] = useState(DEFAULT_MACHINES);
  const [selectedAsset, setSelectedAsset] = useState(DEFAULT_MACHINES[0]);
  const [search, setSearch] = useState('');
  const [plant, setPlant] = useState('all');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [alerts, setAlerts] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [showGateway, setShowGateway] = useState(false);
  const [showTopology, setShowTopology] = useState(false);
  const [showLiveModel, setShowLiveModel] = useState(false);

  useEffect(() => {
    document.title = 'Bharat Industrial Systems | Operations';
    Promise.all([
      api.get('/iot/machines'),
      api.get('/iot/alerts'),
      api.get('/iot/work-orders')
    ]).then(([machineResponse, alertResponse, workOrderResponse]) => {
      const loadedMachines = machineResponse.data?.machines;
      if (Array.isArray(loadedMachines) && loadedMachines.length) {
        setMachines(loadedMachines);
        setSelectedAsset(loadedMachines[0]);
                setShowLiveModel(false);
      }
      setAlerts(alertResponse.data?.alerts || []);
      setWorkOrders(workOrderResponse.data?.workOrders || []);
    }).catch(() => {
      // Demo fallback keeps the command centre useful when the API is offline.
    });
  }, []);

  const counts = useMemo(() => ({
    total: machines.length,
    active: machines.filter((machine) => machine.status === 'active').length,
    degraded: machines.filter((machine) => machine.status === 'degraded').length,
    critical: machines.filter((machine) => machine.status === 'critical').length
  }), [machines]);

  const visibleMachines = useMemo(() => machines.filter((machine) => {
    const number = Number(machine.id.replace(/\D/g, '')) || 1;
    const matchesPlant = plant === 'all' || (plant === 'site_alpha' ? number <= 16 : number > 16);
    const matchesStatus = status === 'all' || machine.status === status;
    const matchesCategory = category === 'all' || machine.type === category;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${machine.name} ${machine.id}`.toLowerCase().includes(query);
    return matchesPlant && matchesStatus && matchesCategory && matchesSearch;
  }), [machines, plant, status, category, search]);

  const focusAsset = selectedAsset || visibleMachines[0] || DEFAULT_MACHINES[0];
  const focusTelemetry = telemetryData[focusAsset.id];
  const focusReadings = readingFor(focusAsset, focusTelemetry);
  const focusHealth = healthFor(focusAsset, focusTelemetry);
  const combinedAlerts = [...liveAlerts, ...alerts].filter((alert, index, list) => list.findIndex((item) => item.id === alert.id) === index).slice(0, 4);
  const currentPlant = plant === 'site_beta' ? PLANTS.site_beta : PLANTS.site_alpha;

  const toggleTestAlert = () => {
    setMachines((previous) => previous.map((machine) => machine.id === focusAsset.id
      ? { ...machine, status: machine.status === 'critical' ? 'active' : 'critical' }
      : machine));
  };

  return (
    <main className="bharat-command-shell">
      <header className="bharat-command-header">
        <div className="bharat-brand-block">
          <div className="bharat-brand-mark"><Radio size={20} /></div>
          <div>
            <div className="bharat-eyebrow">BHARAT INDUSTRIAL SYSTEMS</div>
            <h1>Operations command centre</h1>
            <p>Live asset health across Indian manufacturing plants</p>
          </div>
        </div>
        <div className="bharat-header-actions">
          <span className={`bharat-connection ${isConnected ? 'online' : 'offline'}`}>
            <span /> {isConnected ? 'Live telemetry' : 'Reconnecting'}
          </span>
          <span className="bharat-time"><Clock3 size={15} /> {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          <button className="bharat-button secondary" onClick={() => setShowGateway(true)}><Cpu size={15} /> Sensor gateway</button>
        </div>
      </header>

      <section className="bharat-kpi-grid" aria-label="Plant performance summary">
        <button className="bharat-kpi" onClick={() => setStatus('all')}><span className="kpi-icon blue"><LayoutDashboard size={17} /></span><span><small>Monitored assets</small><strong>{counts.total}</strong></span><ArrowUpRight size={15} /></button>
        <button className="bharat-kpi" onClick={() => setStatus('active')}><span className="kpi-icon green"><CheckCircle2 size={17} /></span><span><small>Healthy assets</small><strong>{counts.active}</strong></span><ArrowUpRight size={15} /></button>
        <button className="bharat-kpi" onClick={() => setStatus('degraded')}><span className="kpi-icon amber"><AlertTriangle size={17} /></span><span><small>Needs attention</small><strong>{counts.degraded}</strong></span><ArrowUpRight size={15} /></button>
        <button className="bharat-kpi" onClick={() => setStatus('critical')}><span className="kpi-icon red"><XCircle size={17} /></span><span><small>Critical assets</small><strong>{counts.critical}</strong></span><ArrowUpRight size={15} /></button>
      </section>

      <section className="bharat-main-grid">
        <div className="bharat-content-column">
          <div className="bharat-section-heading">
            <div><span className="bharat-eyebrow">ASSET MONITORING</span><h2>Production overview</h2></div>
            <div className="bharat-heading-actions"><button className="bharat-button secondary" onClick={() => setShowTopology((value) => !value)}><SlidersHorizontal size={15} /> {showTopology ? 'Hide topology' : 'Plant topology'}</button><button className="bharat-button primary" onClick={toggleTestAlert}><Zap size={15} /> Test alert</button></div>
          </div>

          {showTopology && <div className="bharat-topology"><ArchitectureTopology machines={visibleMachines} /></div>}

          <div className="bharat-focus-card">
            <div className="focus-heading"><div><span className="bharat-eyebrow">SELECTED ASSET</span><h2>{focusAsset.name}</h2><p><span className={`bharat-status-dot ${focusAsset.status}`} /> {statusLabel(focusAsset.status)} · {focusAsset.id.toUpperCase()}</p></div><div className="bharat-health-ring"><strong>{focusHealth}%</strong><small>Health</small></div></div>
            <div className="bharat-reading-grid">
              <div><small>Vibration</small><strong>{focusReadings.vibration}<em> mm/s</em></strong></div>
              <div><small>Temperature</small><strong>{focusReadings.temperature}<em> °C</em></strong></div>
              <div><small>Speed</small><strong>{focusReadings.speed}<em> RPM</em></strong></div>
              <div><small>Pressure</small><strong>{focusReadings.pressure}<em> PSI</em></strong></div>
            </div>
            <div className="focus-footer"><span><MapPin size={14} /> {currentPlant.name}</span><span><Radio size={14} /> {focusTelemetry ? 'Reading received just now' : 'Using calibrated baseline'}</span><button className="bharat-inline-link" onClick={() => setShowLiveModel(true)}>Open 3D model <ChevronRight size={14} /></button></div>
          </div>

          {showLiveModel && <Suspense fallback={<div className="bharat-live-model-card bharat-3d-loading">Loading live 3D model…</div>}><LiveAssetModel asset={focusAsset} readings={focusReadings} onClose={() => setShowLiveModel(false)} /></Suspense>}

          <div className="bharat-table-card">
            <div className="bharat-table-toolbar"><div><h2>Asset register</h2><p>{visibleMachines.length} assets match the current view</p></div><div className="bharat-filter-row"><label className="bharat-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assets" />{search && <button onClick={() => setSearch('')}><X size={14} /></button>}</label><select value={plant} onChange={(event) => setPlant(event.target.value)}><option value="all">All plants</option><option value="site_alpha">Pune</option><option value="site_beta">Jamshedpur</option></select><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All equipment</option>{Object.entries(ASSET_TYPES).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></div></div>
            <div className="bharat-asset-table-wrap"><table className="bharat-asset-table"><thead><tr><th>Asset</th><th>Plant</th><th>Status</th><th>Health</th><th>Vibration</th><th /></tr></thead><tbody>{visibleMachines.map((asset) => { const readings = readingFor(asset, telemetryData[asset.id]); const health = healthFor(asset, telemetryData[asset.id]); return <tr key={asset.id} className={focusAsset.id === asset.id ? 'selected' : ''} onClick={() => { setSelectedAsset(asset); setShowLiveModel(true); }}><td><span className="asset-name"><span className="asset-icon"><Cpu size={15} /></span><span><strong>{asset.name}</strong><small>{asset.id.toUpperCase()} · {ASSET_TYPES[asset.type]}</small></span></span></td><td>{Number(asset.id.replace(/\D/g, '')) <= 16 ? 'Pune' : 'Jamshedpur'}</td><td><span className={`bharat-status-pill ${asset.status}`}>{statusLabel(asset.status)}</span></td><td><span className="health-cell"><span className="health-track"><span style={{ width: `${health}%` }} /></span>{health}%</span></td><td className="mono-cell">{readings.vibration} mm/s</td><td><ChevronRight size={16} /></td></tr>; })}</tbody></table>{visibleMachines.length === 0 && <div className="bharat-empty-state">No assets match these filters.</div>}</div>
          </div>
        </div>

        <aside className="bharat-side-column">
          <div className="bharat-side-card"><div className="bharat-card-title"><span><MapPin size={16} /> Plant profile</span><span className="bharat-live-label">PRIMARY</span></div><h3>{currentPlant.name}</h3><p>{currentPlant.city}</p><div className="bharat-side-stat"><span>Plant gateway</span><strong>{currentPlant.gateway}</strong></div><div className="bharat-side-stat"><span>Operating mode</span><strong>Predictive maintenance</strong></div><div className="bharat-side-stat"><span>Maintenance queue</span><strong>{workOrders.length || 3} open items</strong></div></div>
          <div className="bharat-side-card"><div className="bharat-card-title"><span><AlertTriangle size={16} /> Live alerts</span><span className="bharat-alert-count">{combinedAlerts.length}</span></div>{combinedAlerts.length ? combinedAlerts.map((alert) => <div className="bharat-alert-item" key={alert.id}><span className={`bharat-alert-bar ${String(alert.severity).toLowerCase()}`} /><div><strong>{alert.machine_name || alert.machine_id}</strong><p>{alert.message}</p><small>{alert.severity} · Active</small></div></div>) : <div className="bharat-empty-state compact">No active alerts</div>}</div>
          <div className="bharat-side-card bharat-maintenance-card"><div className="bharat-card-title"><span><Wrench size={16} /> Maintenance</span><span className="bharat-live-label">TODAY</span></div><div className="maintenance-number">{workOrders.length || 3}</div><p>work orders require review</p><button className="bharat-button secondary full-width" onClick={() => setStatus('degraded')}>Review attention assets <ChevronRight size={15} /></button></div>
        </aside>
      </section>

      <HardwareBridgeModal isOpen={showGateway} onClose={() => setShowGateway(false)} />
    </main>
  );
}
