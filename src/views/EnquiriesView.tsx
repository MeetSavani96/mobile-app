import React, { useEffect, useState } from 'react';
import { 
  Search, RefreshCw, ShieldCheck, Phone, Mail, ArrowLeft, MapPin
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { PageHeader, StatusBadge, EmptyState } from '../components/ui';

interface Enquiry {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  state: string | null;
  system_size_kw: number | null;
  status: string;
  source: string;
  created_at: string;
  customer_name?: string | null;
}

interface EnquiryDetails extends Enquiry {
  roof_space: number | null;
  notes: string | null;
  admin_remarks: string | null;
  assigned_to: number | null;
  timeline: {
    id: number;
    action: string;
    note: string | null;
    actor_name: string;
    created_at: string;
  }[];
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
}

const statusOptions = [
  { value: 'new', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'site_visit_scheduled', label: 'Site Visit Scheduled' },
  { value: 'quotation_sent', label: 'Quotation Sent' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'installation_started', label: 'Installation Started' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const EnquiriesView: React.FC = () => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [page, setPage] = useState(0);
  const limit = 10;

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [details, setDetails] = useState<EnquiryDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [admins, setAdmins] = useState<AdminUser[]>([]);

  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedAssign, setSelectedAssign] = useState<number | string>('');
  const [newRemark, setNewRemark] = useState('');
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchEnquiries = async () => {
    setLoading(true);
    setErrorMsg('');
    const query = `admin_enquiries&page=${page + 1}&limit=${limit}&search=${encodeURIComponent(search)}&status=${statusFilter}`;
    const result = await apiFetch(query);
    if (result.ok && result.data) {
      setEnquiries(result.data.enquiries || []);
      setTotal(result.data.total || 0);
    } else {
      setErrorMsg(result.error || 'Failed to fetch enquiries.');
      setEnquiries([]);
    }
    setLoading(false);
  };

  const fetchAdmins = async () => {
    const res = await apiFetch('admin_list_engineers');
    if (res.ok && res.data) {
      setAdmins(res.data.engineers || res.data || []);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const viewDetails = async (id: number) => {
    setSelectedId(id);
    setDetailsLoading(true);
    const result = await apiFetch(`admin_enquiry_details&id=${id}`);
    if (result.ok && result.data) {
      const d = result.data.enquiry || result.data;
      setDetails(d);
      setSelectedStatus(d.status || '');
      setSelectedAssign(d.assigned_to || '');
    } else {
      showToast(result.error || 'Failed to load details.', 'error');
    }
    setDetailsLoading(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details) return;

    setSaving(true);

    const result = await apiFetch('admin_update_enquiry', {
      method: 'POST',
      body: JSON.stringify({
        id: details.id,
        status: selectedStatus,
        assigned_to: selectedAssign ? Number(selectedAssign) : null,
        remark: newRemark.trim() || null,
      }),
    });

    if (result.ok) {
      showToast('Enquiry updated successfully!', 'success');
      setNewRemark('');
      viewDetails(details.id);
      fetchEnquiries();
    } else {
      showToast(result.error || 'Failed to save changes.', 'error');
    }
    setSaving(false);
  };

  return (
    <div className="view-content animate-fade">
      {selectedId && (
        <div style={{ marginBottom: '16px' }}>
          <button onClick={() => { setSelectedId(null); setDetails(null); }}
            className="btn btn-ghost btn-sm" style={{ paddingLeft: 0, color: 'var(--text-muted)', marginBottom: '12px' }}>
            <ArrowLeft size={16} /> Back to Enquiries
          </button>

          {detailsLoading ? (
            <div className="loading-center">
              <div className="spinner" />
              <p>Loading enquiry details...</p>
            </div>
          ) : details ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="card">
                <div className="flex-between" style={{ marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{details.name}</h3>
                  <StatusBadge status={details.status} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <div>Source: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{details.source}</span></div>
                  <div>Created: <span style={{ color: 'var(--text-primary)' }}>{details.created_at}</span></div>
                </div>
                
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '10px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <a href={`tel:${details.phone}`} style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--primary)', fontSize: '13px', textDecoration: 'none' }}>
                    <Phone size={13} /> {details.phone}
                  </a>
                  {details.email && (
                    <a href={`mailto:${details.email}`} style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--primary)', fontSize: '13px', textDecoration: 'none' }}>
                      <Mail size={13} /> {details.email}
                    </a>
                  )}
                  {(details.city || details.state) && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      <MapPin size={13} color="var(--warning)" /> 
                      <span>{details.city ? `${details.city}, ` : ''}{details.state}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Technical Specifications</h4>
                <div className="info-row">
                  <span className="label">Requested Capacity</span>
                  <span className="value">{details.system_size_kw ? `${details.system_size_kw} kW` : 'Not calculated'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Roof Space</span>
                  <span className="value">{details.roof_space ? `${details.roof_space} sq.ft` : 'Not specified'}</span>
                </div>
                {details.notes && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                    <span className="label" style={{ display: 'block', marginBottom: '2px' }}>Client Remarks</span>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{details.notes}</p>
                  </div>
                )}
              </div>

              <div className="card">
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Update Enquiry Status</h4>
                <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Status</label>
                    <select 
                      className="form-select" 
                      value={selectedStatus} 
                      onChange={e => setSelectedStatus(e.target.value)}
                    >
                      {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Assigned Admin/Engineer</label>
                    <select 
                      className="form-select" 
                      value={selectedAssign} 
                      onChange={e => setSelectedAssign(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {admins.map(adm => (
                        <option key={adm.id} value={adm.id}>{adm.name} ({adm.email})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Internal Note</label>
                    <textarea 
                      className="form-textarea"
                      style={{ minHeight: '60px', fontSize: '13px' }}
                      placeholder="Add progress notes or remarks…"
                      value={newRemark}
                      onChange={e => setNewRemark(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Updates'}
                  </button>
                </form>
              </div>

              <div className="card">
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Timeline History</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {details.timeline && details.timeline.length > 0 ? (
                    details.timeline.map((item, idx) => (
                      <div key={idx} style={{ fontSize: '12px', paddingBottom: '8px', borderBottom: idx < details.timeline.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                        <div className="flex-between" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          <span>{item.action}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.created_at.split(' ')[0]}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          By: {item.actor_name}
                        </div>
                        {item.note && (
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                            "{item.note}"
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No logs available.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {!selectedId && (
        <>
          <PageHeader
            title="Leads & Enquiries"
            subtitle={`${total} lead${total !== 1 ? 's' : ''} total`}
            action={
              <button onClick={fetchEnquiries} className="btn btn-ghost btn-sm">
                <RefreshCw size={14} />
              </button>
            }
          />

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div className="search-bar" style={{ margin: 0 }}>
              <Search size={15} color="var(--text-muted)" />
              <input 
                type="search" 
                placeholder="Search leads…" 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select 
              className="form-select" 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ fontSize: '12px', height: '40px' }}
            >
              <option value="">All Status</option>
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {errorMsg && (
            <div className="form-error" style={{ marginBottom: '12px', textAlign: 'center' }}>{errorMsg}</div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ height: '64px', borderRadius: '12px', background: 'var(--bg-input)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : enquiries.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {enquiries.map(enq => (
                <div 
                  key={enq.id} 
                  className="card" 
                  onClick={() => viewDetails(enq.id)}
                  style={{ padding: '12px 14px', marginBottom: 0, cursor: 'pointer' }}
                >
                  <div className="flex-between">
                    <div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{enq.name}</span>
                        {enq.system_size_kw && (
                          <span className="badge badge-success">{enq.system_size_kw} kW</span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {enq.phone} • {enq.city ?? enq.state ?? 'Gujarat'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <StatusBadge status={enq.status} />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{enq.created_at.split(' ')[0]}</span>
                    </div>
                  </div>
                </div>
              ))}

              {total > limit && (
                <div className="flex-between" style={{ marginTop: '12px', fontSize: '13px' }}>
                  <button 
                    disabled={page === 0} 
                    onClick={() => setPage(p => p - 1)}
                    className="btn btn-secondary btn-sm"
                  >
                    Previous
                  </button>
                  <span style={{ color: 'var(--text-muted)' }}>Page {page + 1} of {Math.ceil(total / limit)}</span>
                  <button 
                    disabled={(page + 1) * limit >= total} 
                    onClick={() => setPage(p => p + 1)}
                    className="btn btn-secondary btn-sm"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={<Search size={24} color="var(--primary)" />}
              title="No leads found"
              description="No enquiries match your search filter."
            />
          )}
        </>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '20px', right: '20px', 
          background: toast.type === 'success' ? 'var(--success)' : 'var(--error)',
          color: '#fff', padding: '12px 16px', borderRadius: '12px', zIndex: 10000,
          boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
          animation: 'slide-up 0.3s ease-out'
        }}>
          <ShieldCheck size={16} />
          <span style={{ flex: 1 }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
