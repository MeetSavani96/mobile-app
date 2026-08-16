import React, { useState, useEffect } from 'react';
import { Activity, Zap, Sun, Battery, Leaf, RefreshCw, Wifi, WifiOff, TrendingUp } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { PageHeader, EmptyState } from '../components/ui';

export const InverterView: React.FC = () => {
  const [inverter, setInverter] = useState<any>(null);
  const [readings, setReadings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [activeChart, setActiveChart] = useState<'today' | 'week' | 'month' | 'year'>('today');

  useEffect(() => { fetchInverterData(); }, []);

  const fetchInverterData = async () => {
    setLoading(true);
    const result = await apiFetch('customer_inverter');
    if (result.ok && result.data) {
      setInverter(result.data.inverter || null);
      setReadings(result.data.readings || null);
      setLastUpdated(new Date().toLocaleTimeString('en-IN'));
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInverterData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="view-content">
        <div className="loading-center" style={{ minHeight: '300px' }}>
          <div className="spinner" />
          <p>Loading inverter data...</p>
        </div>
      </div>
    );
  }

  if (!inverter) {
    return (
      <div className="view-content animate-fade">
        <PageHeader title="Inverter" subtitle="Solar system monitoring" />
        <EmptyState
          icon={<Activity size={28} color="var(--primary)" />}
          title="No Inverter Connected"
          description="No inverter is linked to your AKV Energy account yet. Once your device is connected, your live solar data will appear here."
          iconBg="var(--info-light)"
        />
      </div>
    );
  }

  const statusMap: Record<string, { bg: string; color: string; label: string }> = {
    online:  { bg: 'var(--success-light)', color: 'var(--success)', label: 'Online' },
    offline: { bg: '#f1f3f4', color: 'var(--text-muted)', label: 'Offline' },
    warning: { bg: 'var(--warning-light)', color: 'var(--warning)', label: 'Warning' },
    fault:   { bg: 'var(--error-light)', color: 'var(--error)', label: 'Fault' },
  };
  const status = statusMap[inverter.communication_status] || statusMap.offline;

  const stats = [
    { icon: <Zap size={18} />, iconColor: 'var(--warning)', label: 'Current Power', value: readings?.current_power_w ? `${(readings.current_power_w / 1000).toFixed(1)} kW` : '0.0 kW' },
    { icon: <Sun size={18} />, iconColor: 'var(--warning)', label: "Today's Energy", value: readings?.today_kwh ? `${readings.today_kwh} kWh` : '0.0 kWh' },
    { icon: <TrendingUp size={18} />, iconColor: 'var(--primary)', label: 'Monthly', value: readings?.month_kwh ? `${readings.month_kwh} kWh` : '0.0 kWh' },
    { icon: <Battery size={18} />, iconColor: 'var(--success)', label: 'Total', value: readings?.total_kwh ? `${readings.total_kwh} kWh` : '0.0 kWh' },
  ];

  return (
    <div className="view-content animate-fade">
      <PageHeader
        title="Inverter"
        subtitle="Solar system monitoring"
        action={
          <button onClick={handleRefresh} className="btn btn-ghost btn-sm" disabled={refreshing}>
            <RefreshCw size={15} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        }
      />

      {/* Device Card */}
      <div className="card" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 500 }}>{inverter.manufacturer} {inverter.model}</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SN: {inverter.serial_number}</p>
          </div>
          <span className="badge" style={{ background: status.bg, color: status.color }}>
            {inverter.communication_status === 'online' ? <Wifi size={11} /> : <WifiOff size={11} />}
            &nbsp;{status.label}
          </span>
        </div>
        {lastUpdated && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Last updated: {lastUpdated}</p>
        )}
      </div>

      {/* Power Stats */}
      <div className="grid-2" style={{ marginBottom: '12px' }}>
        {stats.map((s, i) => (
          <div key={i} className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ color: s.iconColor, marginBottom: '6px', display: 'inline-flex' }}>{s.icon}</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* System Details */}
      <div className="card">
        <h4 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>System Details</h4>
        <div className="info-row">
          <span className="label">Grid Power</span>
          <span className="value">{readings?.grid_power_w ? `${(readings.grid_power_w / 1000).toFixed(1)} kW` : '-'}</span>
        </div>
        <div className="info-row">
          <span className="label">Solar Power</span>
          <span className="value">{readings?.solar_power_w ? `${(readings.solar_power_w / 1000).toFixed(1)} kW` : '-'}</span>
        </div>
        <div className="info-row">
          <span className="label">Consumption</span>
          <span className="value">{readings?.consumption_w ? `${(readings.consumption_w / 1000).toFixed(1)} kW` : '-'}</span>
        </div>
        <div className="info-row">
          <span className="label">CO₂ Saved</span>
          <span className="value" style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Leaf size={13} />
            {readings?.co2_saved_kg ? `${readings.co2_saved_kg} kg` : '-'}
          </span>
        </div>
      </div>

      {/* Chart Period */}
      <div className="card">
        <h4 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '10px' }}>Generation History</h4>
        <div className="tab-header" style={{ marginBottom: '12px' }}>
          {(['today', 'week', 'month', 'year'] as const).map(period => (
            <button
              key={period}
              className={`tab-btn ${activeChart === period ? 'active' : ''}`}
              onClick={() => setActiveChart(period)}
              style={{ fontSize: '12px', padding: '7px' }}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
        <div style={{
          height: '120px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', fontSize: '13px',
        }}>
          {inverter.communication_status === 'online'
            ? 'Generation chart for ' + activeChart
            : 'Data temporarily unavailable'
          }
        </div>
      </div>
    </div>
  );
};
