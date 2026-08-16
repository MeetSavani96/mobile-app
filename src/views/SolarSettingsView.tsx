import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, LoaderCircle, RotateCcw, Save, SunMedium } from 'lucide-react';
import { APP_CONFIG } from '../config';
import { apiFetch } from '../utils/api';

interface SolarSettingsViewProps {
  onCancel: () => void;
  onSaved: (profile: any) => void;
}

type FormState = {
  system_size_kw: string;
  panel_count: string;
  panel_brand: string;
  inverter_brand: string;
  inverter_capacity_kw: string;
  battery_capacity_kwh: string;
  install_date: string;
  roof_type: string;
  panel_orientation: string;
  panel_tilt_angle: string;
  electricity_provider: string;
  consumer_number: string;
  address: string;
  latitude: string;
  longitude: string;
  system_type: string;
  state: string;
  city: string;
  pincode: string;
  installation_cost: string;
  monthly_bill: string;
  tariff_rate: string;
  purchase_type: string;
  subsidy_status: string;
  phone: string;
};

const defaultFormState: FormState = {
  system_size_kw: '',
  panel_count: '',
  panel_brand: '',
  inverter_brand: '',
  inverter_capacity_kw: '',
  battery_capacity_kwh: '',
  install_date: '',
  roof_type: 'Flat RCC',
  panel_orientation: 'South',
  panel_tilt_angle: '20',
  electricity_provider: '',
  consumer_number: '',
  address: '',
  latitude: '',
  longitude: '',
  system_type: 'on_grid',
  state: APP_CONFIG.defaultState,
  city: '',
  pincode: '',
  installation_cost: '',
  monthly_bill: '',
  tariff_rate: String(APP_CONFIG.defaultTariffRate),
  purchase_type: 'cash',
  subsidy_status: 'pending',
  phone: '',
};

const requiredLabels: Record<string, string> = {
  system_size_kw: 'Installed Capacity',
  panel_count: 'Number of Solar Panels',
  panel_brand: 'Panel Brand',
  inverter_brand: 'Inverter Brand',
  inverter_capacity_kw: 'Inverter Capacity',
  install_date: 'Installation Date',
  roof_type: 'Roof Type',
  panel_orientation: 'Panel Orientation',
  panel_tilt_angle: 'Panel Tilt Angle',
  electricity_provider: 'Electricity Provider',
  consumer_number: 'Consumer Number',
  address: 'Site Address',
  state: 'State',
  system_type: 'System Type',
};

function mapProfileToForm(profile: any): FormState {
  if (!profile) {
    return defaultFormState;
  }

  return {
    system_size_kw: String(profile.system_size_kw ?? ''),
    panel_count: String(profile.panel_count ?? ''),
    panel_brand: profile.panel_brand ?? '',
    inverter_brand: profile.inverter_brand ?? '',
    inverter_capacity_kw: String(profile.inverter_capacity_kw ?? ''),
    battery_capacity_kwh: String(profile.battery_capacity_kwh ?? ''),
    install_date: profile.install_date ?? '',
    roof_type: profile.roof_type ?? defaultFormState.roof_type,
    panel_orientation: profile.panel_orientation ?? defaultFormState.panel_orientation,
    panel_tilt_angle: String(profile.panel_tilt_angle ?? defaultFormState.panel_tilt_angle),
    electricity_provider: profile.electricity_provider ?? '',
    consumer_number: profile.consumer_number ?? '',
    address: profile.address ?? '',
    latitude: profile.latitude == null ? '' : String(profile.latitude),
    longitude: profile.longitude == null ? '' : String(profile.longitude),
    system_type: profile.system_type ?? defaultFormState.system_type,
    state: profile.state ?? defaultFormState.state,
    city: profile.city ?? '',
    pincode: profile.pincode ?? '',
    installation_cost: String(profile.installation_cost ?? ''),
    monthly_bill: String(profile.monthly_bill ?? ''),
    tariff_rate: String(profile.tariff_rate ?? APP_CONFIG.defaultTariffRate),
    purchase_type: profile.purchase_type ?? defaultFormState.purchase_type,
    subsidy_status: profile.subsidy_status ?? defaultFormState.subsidy_status,
    phone: profile.phone ?? '',
  };
}

export const SolarSettingsView: React.FC<SolarSettingsViewProps> = ({ onCancel, onSaved }) => {
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      setErrorMsg('');
      const result = await apiFetch('get_profile');

      if (!active) {
        return;
      }

      if (result.ok) {
        const mapped = mapProfileToForm(result.data);
        setForm(mapped);
      } else {
        setErrorMsg(result.error || 'Could not load solar settings. Please check your connection and try again.');
      }

      setLoading(false);
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrorMsg('');
    setSuccessMsg('');
  };

  const validationError = useMemo(() => {
    for (const [key, label] of Object.entries(requiredLabels)) {
      if (!String(form[key as keyof FormState] ?? '').trim()) {
        return `${label} is required.`;
      }
    }

    if (Number(form.system_size_kw) <= 0) {
      return 'Installed Capacity must be greater than 0.';
    }
    if (Number(form.panel_count) <= 0) {
      return 'Number of Solar Panels must be greater than 0.';
    }
    if (Number(form.inverter_capacity_kw) <= 0) {
      return 'Inverter Capacity must be greater than 0.';
    }
    if (Number(form.panel_tilt_angle) < 0 || Number(form.panel_tilt_angle) > 90) {
      return 'Panel Tilt Angle must be between 0 and 90 degrees.';
    }
    if (form.latitude && Number.isNaN(Number(form.latitude))) {
      return 'Latitude must be a valid number.';
    }
    if (form.longitude && Number.isNaN(Number(form.longitude))) {
      return 'Longitude must be a valid number.';
    }

    return '';
  }, [form]);

  const handleReset = () => {
    setForm(defaultFormState);
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const payload = {
      system_size_kw: Number(form.system_size_kw),
      panel_count: Number(form.panel_count),
      panel_brand: form.panel_brand.trim(),
      inverter_brand: form.inverter_brand.trim(),
      inverter_capacity_kw: Number(form.inverter_capacity_kw),
      battery_capacity_kwh: form.battery_capacity_kwh ? Number(form.battery_capacity_kwh) : null,
      install_date: form.install_date,
      roof_type: form.roof_type.trim(),
      panel_orientation: form.panel_orientation.trim(),
      panel_tilt_angle: Number(form.panel_tilt_angle),
      electricity_provider: form.electricity_provider.trim(),
      consumer_number: form.consumer_number.trim(),
      address: form.address.trim(),
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      system_type: form.system_type,
      state: form.state.trim(),
      city: form.city.trim() || null,
      pincode: form.pincode.trim() || null,
      installation_cost: form.installation_cost ? Number(form.installation_cost) : 0,
      monthly_bill: form.monthly_bill ? Number(form.monthly_bill) : 0,
      tariff_rate: form.tariff_rate ? Number(form.tariff_rate) : APP_CONFIG.defaultTariffRate,
      purchase_type: form.purchase_type,
      subsidy_status: form.subsidy_status,
      phone: form.phone.trim() || null,
    };

    const result = await apiFetch('save_profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (result.ok && result.data) {
      const mapped = mapProfileToForm(result.data);
      setForm(mapped);
      setSuccessMsg('Solar settings saved successfully.');
      window.setTimeout(() => onSaved(result.data), 400);
      return;
    }

    setErrorMsg(result.error || 'Could not save solar settings. Please try again.');
  };

  return (
    <div className="animate-fade">
      <div className="glass-card glow-cyan" style={{ padding: '16px', marginBottom: '16px' }}>
        <div className="flex-between" style={{ alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <button
              type="button"
              onClick={onCancel}
              className="btn"
              style={{ padding: 0, background: 'transparent', color: 'var(--text-muted)', marginBottom: '10px' }}
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
            <h2 style={{ fontSize: '22px', color: '#fff', marginBottom: '6px' }}>Solar Settings</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Link your installed rooftop system so the dashboard can show the right installation details.
            </p>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '16px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <SunMedium size={20} color="var(--color-green)" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <LoaderCircle size={22} className="animate-spin-slow" style={{ margin: '0 auto 12px auto', color: 'var(--color-green)' }} />
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading saved solar settings...</div>
        </div>
      ) : (
        <form onSubmit={handleSave}>
          {errorMsg && (
            <div className="glass-card" style={{ padding: '14px', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)' }}>
              <div style={{ display: 'flex', gap: '10px', color: '#f87171', fontSize: '12px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="glass-card" style={{ padding: '14px', borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.08)' }}>
              <div style={{ color: 'var(--color-green)', fontSize: '12px', fontWeight: 600 }}>{successMsg}</div>
            </div>
          )}

          <div className="glass-card" style={{ padding: '16px' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Installed Capacity (kW) *</label>
                <input className="form-input" type="number" min="0.1" step="0.1" value={form.system_size_kw} onChange={(e) => updateField('system_size_kw', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Number of Solar Panels *</label>
                <input className="form-input" type="number" min="1" step="1" value={form.panel_count} onChange={(e) => updateField('panel_count', e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Panel Brand *</label>
                <input className="form-input" value={form.panel_brand} onChange={(e) => updateField('panel_brand', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Inverter Brand *</label>
                <input className="form-input" value={form.inverter_brand} onChange={(e) => updateField('inverter_brand', e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Inverter Capacity (kW) *</label>
                <input className="form-input" type="number" min="0.1" step="0.1" value={form.inverter_capacity_kw} onChange={(e) => updateField('inverter_capacity_kw', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Battery Capacity (kWh)</label>
                <input className="form-input" type="number" min="0" step="0.1" value={form.battery_capacity_kwh} onChange={(e) => updateField('battery_capacity_kwh', e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Installation Date *</label>
                <input className="form-input" type="date" value={form.install_date} onChange={(e) => updateField('install_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">System Type *</label>
                <select className="form-select" value={form.system_type} onChange={(e) => updateField('system_type', e.target.value)}>
                  <option value="on_grid">On-Grid</option>
                  <option value="off_grid">Off-Grid</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Roof Type *</label>
                <select className="form-select" value={form.roof_type} onChange={(e) => updateField('roof_type', e.target.value)}>
                  <option value="Flat RCC">Flat RCC</option>
                  <option value="Metal Sheet">Metal Sheet</option>
                  <option value="Sloped Tile">Sloped Tile</option>
                  <option value="Terrace">Terrace</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Panel Orientation *</label>
                <select className="form-select" value={form.panel_orientation} onChange={(e) => updateField('panel_orientation', e.target.value)}>
                  <option value="South">South</option>
                  <option value="South-East">South-East</option>
                  <option value="South-West">South-West</option>
                  <option value="East">East</option>
                  <option value="West">West</option>
                  <option value="North">North</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Panel Tilt Angle *</label>
                <input className="form-input" type="number" min="0" max="90" step="1" value={form.panel_tilt_angle} onChange={(e) => updateField('panel_tilt_angle', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Electricity Provider *</label>
                <input className="form-input" value={form.electricity_provider} onChange={(e) => updateField('electricity_provider', e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Consumer Number *</label>
                <input className="form-input" value={form.consumer_number} onChange={(e) => updateField('consumer_number', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">State *</label>
                <select className="form-select" value={form.state} onChange={(e) => updateField('state', e.target.value)}>
                  {APP_CONFIG.states.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={form.city} onChange={(e) => updateField('city', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Pincode</label>
                <input className="form-input" value={form.pincode} onChange={(e) => updateField('pincode', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Site Address *</label>
              <textarea className="form-textarea" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Latitude (optional)</label>
                <input className="form-input" type="number" step="0.0000001" value={form.latitude} onChange={(e) => updateField('latitude', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Longitude (optional)</label>
                <input className="form-input" type="number" step="0.0000001" value={form.longitude} onChange={(e) => updateField('longitude', e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Installation Cost</label>
                <input className="form-input" type="number" min="0" step="1" value={form.installation_cost} onChange={(e) => updateField('installation_cost', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Bill</label>
                <input className="form-input" type="number" min="0" step="1" value={form.monthly_bill} onChange={(e) => updateField('monthly_bill', e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Tariff Rate</label>
                <input className="form-input" type="number" min="0" step="0.1" value={form.tariff_rate} onChange={(e) => updateField('tariff_rate', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '14px', marginBottom: '0' }}>
            <div className="flex-between" style={{ gap: '10px', alignItems: 'stretch', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1, minWidth: '140px' }}>
                {saving ? <LoaderCircle size={16} className="animate-spin-slow" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving} style={{ flex: 1, minWidth: '120px' }}>
                Cancel
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleReset} disabled={saving} style={{ flex: 1, minWidth: '140px' }}>
                <RotateCcw size={16} />
                Reset to Defaults
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
