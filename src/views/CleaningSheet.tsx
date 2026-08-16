import React, { useState } from 'react';
import { X, Droplets, SprayCan, CheckCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface CleaningSheetProps {
  onClose: () => void;
}

export const CleaningSheet: React.FC<CleaningSheetProps> = ({ onClose }) => {
  const [step, setStep] = useState<'type' | 'form' | 'success'>('type');
  const [cleaningType, setCleaningType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [plantCapacity, setPlantCapacity] = useState('');
  const [location, setLocation] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!location.trim()) { setError('Location is required.'); return; }
    if (!preferredDate) { setError('Preferred date is required.'); return; }
    setError('');
    setLoading(true);

    const result = await apiFetch('submit_cleaning', {
      method: 'POST',
      body: JSON.stringify({
        cleaning_type: cleaningType,
        plant_capacity: plantCapacity ? parseFloat(plantCapacity) : null,
        location, preferred_date: preferredDate,
        preferred_time: preferredTime, notes,
      }),
    });

    if (result.ok) {
      setStep('success');
    } else {
      setError(result.message || 'Failed to submit request.');
    }
    setLoading(false);
  };

  if (step === 'success') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={32} color="var(--success)" />
          </div>
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Cleaning Request Submitted!</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
            Our team will contact you to confirm the cleaning schedule.
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
          <h3>Cleaning Service</h3>
          <button onClick={onClose} className="modal-close"><X size={18} /></button>
        </div>

        {step === 'type' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Select the type of cleaning service:
            </p>
            <div className="service-card" onClick={() => { setCleaningType('manual'); setStep('form'); }}>
              <div className="service-card-icon" style={{ background: '#d1ecf1' }}>
                <Droplets size={24} color="#06b6d4" />
              </div>
              <div className="service-card-content">
                <h3 style={{ fontSize: '14px' }}>Manual Cleaning</h3>
                <p>Professional hand-cleaning of solar panels</p>
              </div>
            </div>
            <div className="service-card" onClick={() => { setCleaningType('sprinkler'); setStep('form'); }}>
              <div className="service-card-icon" style={{ background: '#d4edda' }}>
                <SprayCan size={24} color="#0d9f6e" />
              </div>
              <div className="service-card-content">
                <h3 style={{ fontSize: '14px' }}>Sprinkler Cleaning</h3>
                <p>Automated sprinkler-based panel cleaning</p>
              </div>
            </div>
          </div>
        )}

        {step === 'form' && (
          <div>
            {error && <div style={{ background: 'var(--error-light)', color: 'var(--error)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '12px', marginBottom: '14px' }}>{error}</div>}

            <div className="form-group">
              <label className="form-label">Plant Capacity (kW)</label>
              <input className="form-input" type="number" placeholder="e.g. 5" value={plantCapacity} onChange={e => setPlantCapacity(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Location *</label>
              <input className="form-input" placeholder="Site address" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Preferred Date *</label>
                <input className="form-input" type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Time</label>
                <select className="form-select" value={preferredTime} onChange={e => setPreferredTime(e.target.value)}>
                  <option value="">Select</option>
                  <option value="morning">Morning (8–12)</option>
                  <option value="afternoon">Afternoon (12–4)</option>
                  <option value="evening">Evening (4–6)</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" placeholder="Any additional notes..." value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '60px' }} />
            </div>
            <button className="btn btn-primary btn-block btn-lg" onClick={handleSubmit} disabled={loading}>
              {loading ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> : 'Submit Request'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
