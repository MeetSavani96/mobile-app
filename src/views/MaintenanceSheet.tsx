import React, { useState } from 'react';
import { X, Phone, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';

interface MaintenanceSheetProps {
  onClose: () => void;
}

const issueCategories = [
  { value: 'panel_problem', label: 'Panel Problem' },
  { value: 'inverter_problem', label: 'Inverter Problem' },
  { value: 'low_generation', label: 'Low Generation' },
  { value: 'electrical_issue', label: 'Electrical Issue' },
  { value: 'physical_damage', label: 'Physical Damage' },
  { value: 'cleaning_required', label: 'Cleaning Required' },
  { value: 'monitoring_problem', label: 'Monitoring Problem' },
  { value: 'other', label: 'Other' },
];

export const MaintenanceSheet: React.FC<MaintenanceSheetProps> = ({ onClose }) => {
  const { user } = useAuth();
  const isAkvCustomer = user?.is_akv_customer || false;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [issueCategory, setIssueCategory] = useState('');
  const [description, setDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');

  const handleSubmit = async () => {
    if (!issueCategory) { setError('Please select an issue category.'); return; }
    if (!description.trim()) { setError('Please describe the issue.'); return; }
    setError('');
    setLoading(true);

    const result = await apiFetch('submit_maintenance', {
      method: 'POST',
      body: JSON.stringify({
        issue_category: issueCategory,
        description,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
      }),
    });

    if (result.ok) {
      setSuccess(true);
    } else {
      setError(result.message || 'Failed to submit request.');
    }
    setLoading(false);
  };

  // Success
  if (success) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={32} color="var(--success)" />
          </div>
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Maintenance Request Submitted!</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
            You can track the status in your Bookings section.
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
          <h3>Maintenance</h3>
          <button onClick={onClose} className="modal-close"><X size={18} /></button>
        </div>

        {/* NON-AKV CUSTOMER - Restricted */}
        {!isAkvCustomer && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={28} color="var(--warning)" />
            </div>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Maintenance Available for AKV Energy Customers</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5, marginBottom: '20px', padding: '0 16px' }}>
              Your account is not currently connected to an AKV Energy solar project. Please contact AKV Energy to connect your existing solar installation.
            </p>
            <a
              href="tel:+919537661151"
              className="btn btn-primary"
              style={{ textDecoration: 'none' }}
            >
              <Phone size={16} />
              Contact AKV Energy
            </a>
          </div>
        )}

        {/* AKV CUSTOMER - Full Form */}
        {isAkvCustomer && (
          <div>
            {error && <div style={{ background: 'var(--error-light)', color: 'var(--error)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '12px', marginBottom: '14px' }}>{error}</div>}

            <div className="form-group">
              <label className="form-label">Issue Category *</label>
              <select className="form-select" value={issueCategory} onChange={e => setIssueCategory(e.target.value)}>
                <option value="">Select issue type</option>
                {issueCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea
                className="form-textarea"
                placeholder="Describe the issue in detail..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Preferred Visit Date</label>
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

            <button className="btn btn-primary btn-block btn-lg" onClick={handleSubmit} disabled={loading}>
              {loading ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> : 'Submit Maintenance Request'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
