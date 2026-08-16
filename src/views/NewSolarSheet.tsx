import React, { useState } from 'react';
import { X, Sun, Building2, Factory, Landmark, ArrowLeft, CheckCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface NewSolarSheetProps {
  onClose: () => void;
}

const categories = [
  { id: 'residential', label: 'Residential', icon: <Sun size={28} />, color: '#fff3cd', iconColor: '#f59e0b' },
  { id: 'commercial', label: 'Commercial / Common Building', icon: <Building2 size={28} />, color: '#d1ecf1', iconColor: '#06b6d4' },
  { id: 'industrial', label: 'Industrial', icon: <Factory size={28} />, color: '#d4edda', iconColor: '#0d9f6e' },
  { id: 'solar_park', label: 'Solar Park', icon: <Landmark size={28} />, color: '#e8f0fe', iconColor: '#1a73e8' },
];

export const NewSolarSheet: React.FC<NewSolarSheetProps> = ({ onClose }) => {
  const [step, setStep] = useState<'category' | 'form' | 'success'>('category');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [monthlyBill, setMonthlyBill] = useState('');
  const [capacity, setCapacity] = useState('');
  const [roofType, setRoofType] = useState('');
  const [roofArea, setRoofArea] = useState('');
  const [electricityDetails, setElectricityDetails] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    setStep('form');
  };

  const handleSubmit = async () => {
    if (!location.trim()) { setError('Location is required.'); return; }
    setError('');
    setLoading(true);

    const result = await apiFetch('submit_solar_enquiry', {
      method: 'POST',
      body: JSON.stringify({
        category: selectedCategory,
        location, property_type: propertyType,
        monthly_bill: monthlyBill ? parseFloat(monthlyBill) : null,
        required_capacity: capacity ? parseFloat(capacity) : null,
        roof_type: roofType, roof_area: roofArea ? parseFloat(roofArea) : null,
        electricity_details: electricityDetails,
        preferred_date: preferredDate, additional_notes: notes,
      }),
    });

    if (result.ok) {
      setStep('success');
    } else {
      setError(result.message || 'Failed to submit enquiry.');
    }
    setLoading(false);
  };

  // Success
  if (step === 'success') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={32} color="var(--success)" />
          </div>
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Enquiry Submitted!</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
            Our team will review your solar enquiry and get back to you shortly.
          </p>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {step === 'form' && (
              <button onClick={() => setStep('category')} className="btn btn-ghost" style={{ padding: '4px' }}>
                <ArrowLeft size={18} />
              </button>
            )}
            <h3>{step === 'category' ? 'New Solar Connection' : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Solar`}</h3>
          </div>
          <button onClick={onClose} className="modal-close"><X size={18} /></button>
        </div>

        {/* Category Selection */}
        {step === 'category' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Select the type of solar installation you're interested in:
            </p>
            {categories.map(cat => (
              <div key={cat.id} className="service-card" onClick={() => handleCategorySelect(cat.id)}>
                <div className="service-card-icon" style={{ background: cat.color }}>
                  {React.cloneElement(cat.icon, { color: cat.iconColor })}
                </div>
                <div className="service-card-content">
                  <h3 style={{ fontSize: '14px' }}>{cat.label}</h3>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Enquiry Form */}
        {step === 'form' && (
          <div>
            {error && <div style={{ background: 'var(--error-light)', color: 'var(--error)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '12px', marginBottom: '14px' }}>{error}</div>}

            <div className="form-group">
              <label className="form-label">Location *</label>
              <input className="form-input" placeholder="City, Area" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Property Type</label>
              <select className="form-select" value={propertyType} onChange={e => setPropertyType(e.target.value)}>
                <option value="">Select</option>
                <option value="independent_house">Independent House</option>
                <option value="apartment">Apartment / Flat</option>
                <option value="villa">Villa</option>
                <option value="commercial_building">Commercial Building</option>
                <option value="factory">Factory / Warehouse</option>
                <option value="farm">Agricultural Land / Farm</option>
              </select>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Monthly Bill (₹)</label>
                <input className="form-input" type="number" placeholder="e.g. 5000" value={monthlyBill} onChange={e => setMonthlyBill(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Required Capacity (kW)</label>
                <input className="form-input" type="number" placeholder="e.g. 5" value={capacity} onChange={e => setCapacity(e.target.value)} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Roof Type</label>
                <select className="form-select" value={roofType} onChange={e => setRoofType(e.target.value)}>
                  <option value="">Select</option>
                  <option value="rcc">RCC / Concrete</option>
                  <option value="metal_sheet">Metal Sheet</option>
                  <option value="tile">Tile / Slate</option>
                  <option value="flat">Flat Terrace</option>
                  <option value="ground">Ground Mount</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Roof Area (sq ft)</label>
                <input className="form-input" type="number" placeholder="e.g. 500" value={roofArea} onChange={e => setRoofArea(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Electricity Connection Details</label>
              <input className="form-input" placeholder="Consumer number, provider" value={electricityDetails} onChange={e => setElectricityDetails(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Preferred Installation Date</label>
              <input className="form-input" type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Additional Requirements</label>
              <textarea className="form-textarea" placeholder="Any special requirements..." value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '70px' }} />
            </div>
            <button className="btn btn-primary btn-block btn-lg" onClick={handleSubmit} disabled={loading}>
              {loading ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> : 'Get Quote'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
