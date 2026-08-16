import React, { useState, useRef } from 'react';
import { 
  Sun, IndianRupee, 
  Leaf, Trees, ArrowRight, CheckCircle2, RotateCcw,
  Minus, Plus
} from 'lucide-react';
import { APP_CONFIG } from '../config';
import { apiFetch } from '../utils/api';
import { PageHeader } from '../components/ui';

const MIN_UNITS = 50;
const MAX_UNITS = 2000;
const QUICK_CHIPS = [100, 300, 500, 800, 1000, 1500, 2000];

function clamp(v: number) {
  return Math.max(MIN_UNITS, Math.min(MAX_UNITS, v));
}

const peakSunHours: Record<string, number> = {
  'Rajasthan': 6.5, 'Gujarat': 6.2, 'Maharashtra': 5.8, 'Madhya Pradesh': 5.7,
  'Karnataka': 5.5, 'Andhra Pradesh': 5.8, 'Telangana': 5.8, 'Tamil Nadu': 5.5,
  'Odisha': 5.5, 'Chhattisgarh': 5.5, 'Jharkhand': 5.0, 'Bihar': 5.0,
  'Uttar Pradesh': 5.2, 'Punjab': 5.0, 'Haryana': 5.2, 'Delhi': 5.0,
  'Himachal Pradesh': 5.5, 'Uttarakhand': 5.2, 'Goa': 5.5, 'Kerala': 5.0,
  'West Bengal': 4.8, 'Assam': 4.5, 'default': 5.0
};

function getPeakSunHours(state: string) {
  return peakSunHours[state] || peakSunHours['default'];
}

function calculateRequiredSystemSize(monthlyUnits: number, state: string) {
  const sunHours = getPeakSunHours(state);
  const daysInMonth = 30;
  const performanceRatio = 0.75;
  const systemEfficiency = 0.80;
  const rawSize = monthlyUnits / (sunHours * daysInMonth * performanceRatio);
  const sizeKW = rawSize / systemEfficiency;
  return Math.round(sizeKW * 2) / 2;
}

function estimateSystemCost(systemSizeKW: number) {
  const costPerKW = 50000;
  return systemSizeKW * costPerKW;
}

function calculateSubsidy(systemSizeKW: number) {
  let amount = 0;
  let category = '';

  if (systemSizeKW <= 0) return { amount: 0, category: 'No subsidy' };
  if (systemSizeKW === 1) { amount = 30000; category = '1 kW System'; }
  else if (systemSizeKW === 2) { amount = 30000; category = '2 kW System'; }
  else if (systemSizeKW === 3) { amount = 18000; category = '3 kW System'; }
  else if (systemSizeKW > 3 && systemSizeKW <= 6) { amount = 47000; category = '3-6 kW System'; }
  else if (systemSizeKW > 6 && systemSizeKW <= 10) { amount = 45000; category = '6-10 kW System'; }
  else { amount = 0; category = 'Above 10 kW (Not Eligible)'; }

  return { amount, category };
}

function formatINR(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${new Intl.NumberFormat('en-IN').format(Math.round(amount))}`;
}

export const CalculatorView: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [monthlyUnits, setMonthlyUnits] = useState<number>(300);
  const [inputRaw, setInputRaw] = useState<string>('300');
  const [unitsError, setUnitsError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<string>(APP_CONFIG.defaultState);
  const [city, setCity] = useState<string>('');
  
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [step1Error, setStep1Error] = useState<string>('');

  const systemSizeKW = calculateRequiredSystemSize(monthlyUnits, state);
  const grossCost = estimateSystemCost(systemSizeKW);
  const { amount: subsidyAmount, category: subsidyCategory } = calculateSubsidy(systemSizeKW);
  const netCost = grossCost - subsidyAmount;
  
  const sunHours = getPeakSunHours(state);
  const monthlyGeneration = Math.round(systemSizeKW * sunHours * 30 * 0.75);
  const annualGeneration = Math.round(systemSizeKW * sunHours * 365 * 0.75);
  
  const monthlySavings = Math.round(monthlyGeneration * APP_CONFIG.defaultTariffRate);
  const annualSavings = Math.round(annualGeneration * APP_CONFIG.defaultTariffRate);
  const paybackPeriod = annualSavings > 0 ? (netCost / annualSavings).toFixed(1) : '0';
  
  const co2Offset = ((annualGeneration * 0.82) / 1000).toFixed(2);
  const treesEquivalent = Math.round(parseFloat(co2Offset) / 0.022);

  const commitUnits = (val: number) => {
    const clamped = clamp(val);
    setMonthlyUnits(clamped);
    setInputRaw(String(clamped));
    setUnitsError('');
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    setMonthlyUnits(v);
    setInputRaw(String(v));
    setUnitsError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setInputRaw(raw);
    setUnitsError('');

    if (raw === '') return;
    const parsed = parseInt(raw, 10);
    if (parsed < MIN_UNITS) {
      setUnitsError(`Minimum is ${MIN_UNITS} units`);
    } else if (parsed > MAX_UNITS) {
      setUnitsError(`Maximum is ${MAX_UNITS} units`);
    } else {
      setMonthlyUnits(parsed);
    }
  };

  const handleInputBlur = () => {
    if (inputRaw === '') { commitUnits(MIN_UNITS); return; }
    const parsed = parseInt(inputRaw, 10);
    if (isNaN(parsed)) { commitUnits(MIN_UNITS); } else { commitUnits(parsed); }
  };

  const handleStep = (delta: number) => {
    commitUnits(monthlyUnits + delta);
    inputRef.current?.focus();
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim() || !state) {
      setStep1Error('Please enter your city before calculating.');
      return;
    }
    setStep1Error('');
    setStep(2);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setErrorMsg('Name and Phone number are required.');
      return;
    }
    
    setSubmitting(true);
    setErrorMsg('');
    
    const result = await apiFetch('submit_lead', {
      method: 'POST',
      body: JSON.stringify({
        name, email, phone, city, state,
        monthly_units: monthlyUnits,
        system_size_kw: systemSizeKW,
        estimated_cost: grossCost,
        subsidy_amount: subsidyAmount,
        net_cost: netCost,
        monthly_savings: monthlySavings,
        annual_savings: annualSavings,
        payback_years: parseFloat(paybackPeriod),
      }),
    });
    
    if (result.ok) {
      setSuccess(true);
      setStep(3);
    } else {
      setErrorMsg(result.error || 'Failed to submit enquiry. Please check your connection.');
    }
    setSubmitting(false);
  };

  const resetCalc = () => {
    setStep(1);
    setSuccess(false);
    setErrorMsg('');
    setStep1Error('');
    setInputRaw('300');
    setMonthlyUnits(300);
    setUnitsError('');
  };

  return (
    <div className="view-content animate-fade">
      <PageHeader title="Solar Calculator" subtitle="Estimate rooftop solar sizing and savings" />

      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '16px' }}>
        {[1, 2, 3].map(i => (
          <div 
            key={i} 
            style={{ 
              width: '28px', height: '4px', borderRadius: '2px', 
              backgroundColor: step >= i ? 'var(--primary)' : 'var(--border-light)',
              transition: 'all 0.3s ease'
            }} 
          />
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={handleCalculate} className="card animate-scale">
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label className="form-label" style={{ margin: 0 }}>Monthly Electricity Usage</label>
              <span className="badge badge-primary">{monthlyUnits} kWh</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleStep(-10)}
                disabled={monthlyUnits <= MIN_UNITS}
                aria-label="Decrease by 10 units"
                style={{ width: '40px', height: '40px', padding: 0 }}
              >
                <Minus size={16} />
              </button>

              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={MIN_UNITS}
                  max={MAX_UNITS}
                  value={inputRaw}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  className={`form-input ${unitsError ? 'error' : ''}`}
                  style={{ paddingRight: '40px', fontSize: '16px', fontWeight: 600, textAlign: 'center' }}
                />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-muted)' }}>
                  kWh
                </span>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleStep(10)}
                disabled={monthlyUnits >= MAX_UNITS}
                aria-label="Increase by 10 units"
                style={{ width: '40px', height: '40px', padding: 0 }}
              >
                <Plus size={16} />
              </button>
            </div>

            {unitsError && <span className="form-error" style={{ marginBottom: '8px', display: 'block' }}>{unitsError}</span>}

            <input
              type="range"
              className="slider"
              min={MIN_UNITS}
              max={MAX_UNITS}
              step={10}
              value={monthlyUnits}
              onChange={handleSliderChange}
            />
            <div className="flex-between" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '-4px' }}>
              <span>50 kWh</span>
              <span>2,000 kWh</span>
            </div>

            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '6px' }}>
                Quick select
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {QUICK_CHIPS.map(chip => (
                  <button
                    key={chip}
                    type="button"
                    className={`chip ${monthlyUnits === chip ? 'selected' : ''}`}
                    onClick={() => commitUnits(chip)}
                  >
                    {chip >= 1000 ? `${chip / 1000}k` : chip} kWh
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Select State *</label>
            <select className="form-select" value={state} onChange={e => { setState(e.target.value); setStep1Error(''); }}>
              {APP_CONFIG.states.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">City *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g., Surat" 
              value={city} 
              onChange={e => { setCity(e.target.value); setStep1Error(''); }} 
              required 
            />
          </div>

          {step1Error && <div className="form-error" style={{ marginBottom: '12px' }}>{step1Error}</div>}

          <div style={{ padding: '10px 12px', background: 'var(--info-light)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '12px', color: 'var(--info)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Sun size={16} style={{ flexShrink: 0 }} />
            <span>Average peak sun hours in <b>{state}</b> is <b>{getPeakSunHours(state)} hrs/day</b>.</span>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg">
            Calculate Savings <ArrowRight size={16} />
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleLeadSubmit} className="card animate-scale">
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', textAlign: 'center' }}>Generate Savings Report</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '16px' }}>
            Submit contact details to secure your state government subsidy application.
          </p>

          {errorMsg && <div className="form-error" style={{ marginBottom: '12px' }}>{errorMsg}</div>}

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Your Name" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mobile Number *</label>
            <input 
              type="tel" 
              className="form-input" 
              placeholder="10-digit number" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address (Optional)</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="you@email.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
          </div>

          <div className="grid-2" style={{ marginTop: '20px' }}>
            <button type="button" onClick={() => setStep(1)} className="btn btn-secondary">
              Back
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Calculating...' : 'View Results'}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="animate-scale">
          {success && (
            <div className="card" style={{ background: 'var(--success-light)', border: '1px solid var(--success)', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
              <CheckCircle2 size={18} color="var(--success)" />
              <div style={{ fontSize: '13px', color: 'var(--success)' }}>
                <b>Enquiry Submitted!</b> Our expert solar engineer will contact you.
              </div>
            </div>
          )}

          <div className="card card-hero" style={{ textAlign: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>RECOMMENDED CAPACITY</div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--primary)', margin: '4px 0' }}>
              {systemSizeKW} kW
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Estimated Monthly Savings: <b style={{ color: 'var(--success)' }}>{formatINR(monthlySavings)}</b>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '12px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IndianRupee size={16} color="var(--primary)" /> Financial Breakdown
            </h4>
            
            <div className="info-row">
              <span className="label">Gross System Cost</span>
              <span className="value">{formatINR(grossCost)}</span>
            </div>
            <div className="info-row">
              <span className="label">Subsidy ({subsidyCategory})</span>
              <span className="value" style={{ color: 'var(--warning)' }}>-{formatINR(subsidyAmount)}</span>
            </div>
            <div className="info-row" style={{ fontWeight: 600 }}>
              <span className="label" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Net Investment</span>
              <span className="value" style={{ color: 'var(--success)', fontWeight: 600 }}>{formatINR(netCost)}</span>
            </div>
            <div className="info-row">
              <span className="label">Annual Savings</span>
              <span className="value">{formatINR(annualSavings)}/yr</span>
            </div>
            <div className="info-row">
              <span className="label">Payback Period</span>
              <span className="value" style={{ color: 'var(--info)' }}>{paybackPeriod} Years</span>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Leaf size={16} color="var(--success)" /> Environmental Offset
            </h4>
            <div className="grid-2">
              <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <Leaf size={18} color="var(--success)" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{co2Offset} Tons</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CO₂ Saved / Year</div>
              </div>
              <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <Trees size={18} color="var(--warning)" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{treesEquivalent}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Trees Planted / Year</div>
              </div>
            </div>
          </div>

          <button onClick={resetCalc} className="btn btn-secondary btn-block">
            <RotateCcw size={15} /> Calculate Again
          </button>
        </div>
      )}
    </div>
  );
};
