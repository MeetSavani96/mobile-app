import React, { useState, useEffect } from 'react';
import { MessageCircle, Plus, X } from 'lucide-react';
import { apiFetch } from '../utils/api';

const categories = ['solar', 'inverter', 'maintenance', 'payment', 'booking', 'loan', 'account', 'other'];

export const QueriesView: React.FC = () => {
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchQueries(); }, []);

  const fetchQueries = async () => {
    setLoading(true);
    const result = await apiFetch('customer_queries');
    if (result.ok && result.data) setQueries(result.data.queries || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!subject.trim()) { setError('Subject is required.'); return; }
    if (!description.trim()) { setError('Description is required.'); return; }
    setError('');
    setSubmitting(true);
    const result = await apiFetch('submit_query', {
      method: 'POST',
      body: JSON.stringify({ subject, category, description }),
    });
    if (result.ok) {
      setShowForm(false);
      setSubject(''); setDescription(''); setCategory('other');
      fetchQueries();
    } else {
      setError(result.message || 'Failed to submit.');
    }
    setSubmitting(false);
  };

  const statusBadge: Record<string, string> = {
    open: 'badge-warning', assigned: 'badge-info', in_progress: 'badge-primary',
    resolved: 'badge-success', closed: 'badge-gray',
  };

  if (loading) return <div className="view-content"><div className="loading-center"><div className="spinner" /><p>Loading queries...</p></div></div>;

  return (
    <div className="view-content animate-fade">
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800 }}>My Queries</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Query
        </button>
      </div>

      {/* New Query Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <h3>New Support Query</h3>
              <button onClick={() => setShowForm(false)} className="modal-close"><X size={18} /></button>
            </div>
            {error && <div style={{ background: 'var(--error-light)', color: 'var(--error)', padding: '10px', borderRadius: 'var(--radius-md)', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}
            <div className="form-group">
              <label className="form-label">Subject *</label>
              <input className="form-input" placeholder="Brief description of your issue" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea className="form-textarea" placeholder="Describe your issue in detail..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-block btn-lg" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Query'}
            </button>
          </div>
        </div>
      )}

      {queries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ background: 'var(--info-light)' }}><MessageCircle size={36} color="var(--info)" /></div>
          <h3>No Queries</h3>
          <p>Need help? Create a support query and our team will assist you.</p>
        </div>
      ) : queries.map((q: any) => (
        <div key={q.id} className="list-card">
          <div className="list-card-header">
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{q.subject}</h4>
              <span className="badge badge-gray" style={{ marginTop: '4px', textTransform: 'capitalize' }}>{q.category}</span>
            </div>
            <span className={`badge ${statusBadge[q.status] || 'badge-gray'}`}>{q.status?.replace(/_/g, ' ')}</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            {q.created_at ? new Date(q.created_at).toLocaleDateString('en-IN') : ''}
          </p>
        </div>
      ))}
    </div>
  );
};
