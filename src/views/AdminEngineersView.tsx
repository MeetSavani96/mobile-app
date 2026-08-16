import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, Plus, Trash2, Edit, CheckCircle2, AlertCircle, Shield, Briefcase
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { Modal } from '../components/ui';

interface AdminEngineersProps {
  onBack: () => void;
}

interface Engineer {
  id: number;
  name: string;
  mobile: string;
  email: string;
  address: string | null;
  skills: string | null;
  availability: 'available' | 'busy' | 'unavailable';
  active_projects_count?: number;
}

export const AdminEngineersView: React.FC<AdminEngineersProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  
  // Screen routing state
  const [screen, setScreen] = useState<'list' | 'form'>('list');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formSkills, setFormSkills] = useState('');
  const [formAvail, setFormAvail] = useState<'available' | 'busy' | 'unavailable'>('available');
  const [saving, setSaving] = useState(false);

  // Dialogs
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchEngineers = async () => {
    setLoading(true);
    const res = await apiFetch('get_engineers');
    if (res.ok && Array.isArray(res.data?.data)) {
      setEngineers(res.data.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEngineers();
  }, []);

  const initCreateForm = () => {
    setFormName('');
    setFormMobile('');
    setFormEmail('');
    setFormAddress('');
    setFormSkills('');
    setFormAvail('available');
    setIsEditing(false);
    setScreen('form');
  };

  const initEditForm = (eng: Engineer) => {
    setFormName(eng.name);
    setFormMobile(eng.mobile);
    setFormEmail(eng.email);
    setFormAddress(eng.address || '');
    setFormSkills(eng.skills || '');
    setFormAvail(eng.availability);
    setSelectedId(eng.id);
    setIsEditing(true);
    setScreen('form');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formMobile.trim() || !formEmail.trim()) {
      showToast('Name, mobile and email are required.', 'error');
      return;
    }
    setSaving(true);

    const payload = {
      id: selectedId,
      name: formName,
      mobile: formMobile,
      email: formEmail,
      address: formAddress,
      skills: formSkills,
      availability: formAvail
    };

    const endpoint = isEditing ? 'update_engineer' : 'create_engineer';
    const method = isEditing ? 'PUT' : 'POST';

    const res = await apiFetch(endpoint, {
      method,
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast(isEditing ? 'Engineer profile updated.' : 'Engineer added to roster.', 'success');
      setScreen('list');
      fetchEngineers();
    } else {
      showToast(res.error || 'Failed to save engineer profile.', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    setLoading(true);
    const res = await apiFetch(`delete_engineer&id=${id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      showToast('Engineer removed from roster.', 'success');
      setShowDeleteConfirm(null);
      fetchEngineers();
    } else {
      showToast(res.error || 'Failed to delete engineer.', 'error');
    }
    setLoading(false);
  };

  const getAvailBadgeColor = (avail: string) => {
    switch (avail) {
      case 'available':
        return 'var(--color-green)';
      case 'busy':
        return 'var(--color-amber)';
      default:
        return '#f87171';
    }
  };

  return (
    <div className="animate-fade">
      {/* ── TOP NAV ACTION ROW ────────────────────────────────────────────── */}
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <button onClick={() => {
          if (screen !== 'list') setScreen('list');
          else onBack();
        }} className="btn btn-secondary" style={{ display: 'flex', gap: '6px', padding: '6px 12px', fontSize: '12px' }}>
          <ArrowLeft size={14} /> Back
        </button>
        {screen === 'list' && (
          <button onClick={initCreateForm} className="btn btn-primary" style={{ padding: '8px 12px', fontSize: '12px' }}>
            <Plus size={14} /> Add Engineer
          </button>
        )}
      </div>

      {/* ── LIST SCREEN ──────────────────────────────────────────────────── */}
      {screen === 'list' && (
        <>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: '80px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : engineers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {engineers.map(eng => (
                <div key={eng.id} className="glass-card hover-glow" style={{ padding: '14px', marginBottom: 0 }}>
                  <div className="flex-between" style={{ marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                      👷 {eng.name}
                    </span>
                    <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', color: getAvailBadgeColor(eng.availability), fontWeight: 600, textTransform: 'uppercase' }}>
                      {eng.availability}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mobile: <span style={{ color: '#fff' }}>{eng.mobile}</span></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Skills: <span style={{ color: '#fff' }}>{eng.skills || 'General Panel Mounting'}</span></div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Briefcase size={12} color="var(--color-green)" /> Workload: {eng.active_projects_count ?? 0} active projects
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px', marginTop: '10px' }}>
                    <button onClick={() => initEditForm(eng)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--color-cyan)' }}><Edit size={12} /></button>
                    <button onClick={() => setShowDeleteConfirm(eng.id)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '10px', color: '#ef4444' }}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card glow-green" style={{ textAlign: 'center', padding: '40px' }}>
              <Shield size={28} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: '13px', color: '#fff' }}>No engineers registered in roster database.</p>
            </div>
          )}
        </>
      )}

      {/* ── FORM SCREEN ──────────────────────────────────────────────────── */}
      {screen === 'form' && (
        <form onSubmit={handleSave} className="glass-card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '16px' }}>{isEditing ? 'Modify Engineer Profile' : 'New Engineer profile'}</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Full Name *</label>
              <input type="text" className="form-input" value={formName} onChange={e => setFormName(e.target.value)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Mobile Number *</label>
                <input type="tel" className="form-input" value={formMobile} onChange={e => setFormMobile(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Email Address *</label>
                <input type="email" className="form-input" value={formEmail} onChange={e => setFormEmail(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Skills & Experience</label>
                <input type="text" className="form-input" placeholder="e.g. 5 yrs, Earthing" value={formSkills} onChange={e => setFormSkills(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Availability Status</label>
                <select className="form-input" value={formAvail} onChange={e => setFormAvail(e.target.value as any)}>
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Home Location Address</label>
              <textarea className="form-input" placeholder="Ahmedabad area..." value={formAddress} onChange={e => setFormAddress(e.target.value)} style={{ minHeight: '50px' }} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Engineer Profile'}
            </button>
          </div>
        </form>
      )}

      {/* ── DELETE CONFIRMATION DIALOG ───────────────────────────────────── */}
      {showDeleteConfirm && (
        <Modal
          isOpen={!!showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(null)}
          title="Remove Engineer Profile?"
          footer={
            <div className="grid-2" style={{ gap: '8px' }}>
              <button onClick={() => setShowDeleteConfirm(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="btn btn-danger">Delete</button>
            </div>
          }
        >
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            This action is permanent and cannot be undone.
          </p>
        </Modal>
      )}

      {/* ── TOAST NOTIFICATION ────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '20px', right: '20px', 
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: '#fff', padding: '12px 16px', borderRadius: '12px', zIndex: 10000,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
          animation: 'slide-up 0.3s ease-out'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span style={{ flex: 1 }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
