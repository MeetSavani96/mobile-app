import React, { useEffect, useState } from 'react';
import { 
  Wrench, Search, RefreshCw,
  Clock, Phone
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { PageHeader, StatusBadge, EmptyState, Modal } from '../components/ui';

interface MaintenanceRequest {
  id: number;
  request_id: string;
  user_id: number;
  customer_id: number | null;
  issue_category: string;
  description: string;
  preferred_date: string | null;
  preferred_time: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  city: string;
}

export const AdminMaintenanceView: React.FC = () => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [selectedReq, setSelectedReq] = useState<MaintenanceRequest | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  const fetchMaintenance = async () => {
    setLoading(true);
    setErrorMsg('');
    const query = `admin_maintenance&search=${encodeURIComponent(search)}&status=${statusFilter}`;
    const result = await apiFetch(query);
    if (result.ok && result.data && result.data.success) {
      setRequests(result.data.data || []);
    } else {
      setErrorMsg(result.error || 'Failed to load maintenance requests.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMaintenance();
  }, [search, statusFilter]);

  const handleUpdate = async () => {
    if (!selectedReq) return;
    setUpdating(true);
    setUpdateMsg('');

    const payload = {
      id: selectedReq.id,
      ticket_id: selectedReq.request_id || selectedReq.id,
      status: selectedStatus,
      admin_notes: adminNotes.trim() || null,
      admin_remarks: adminNotes.trim() || null,
    };

    console.log('[AdminMaintenanceView] Maintenance update payload:', payload);

    const result = await apiFetch('admin_update_maintenance', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    console.log('[AdminMaintenanceView] Maintenance update response:', result);

    if (result.ok && result.data && (result.data.success !== false)) {
      setUpdateMsg('Request updated successfully!');
      setTimeout(() => {
        setSelectedReq(null);
        fetchMaintenance();
      }, 800);
    } else {
      const cleanError = result.message || 'Unable to update maintenance request. Please try again.';
      setUpdateMsg(cleanError);
    }
    setUpdating(false);
  };

  return (
    <div className="view-content animate-fade">
      <PageHeader
        title="Maintenance Requests"
        subtitle="Customer repair & service tickets"
        action={
          <button className="btn btn-ghost btn-sm" onClick={fetchMaintenance}>
            <RefreshCw size={14} />
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <div className="search-bar" style={{ margin: 0 }}>
          <Search size={15} color="var(--text-muted)" />
          <input
            type="search"
            placeholder="Search tickets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ fontSize: '12px', height: '40px' }}
        >
          <option value="">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading && (
        <div className="loading-center">
          <div className="spinner" />
          <p>Loading maintenance requests...</p>
        </div>
      )}

      {errorMsg && (
        <div className="form-error" style={{ marginBottom: '12px', textAlign: 'center' }}>{errorMsg}</div>
      )}

      {!loading && requests.length === 0 && (
        <EmptyState
          icon={<Wrench size={24} color="var(--primary)" />}
          title="No maintenance requests"
          description="Customer maintenance tickets will appear here when submitted."
        />
      )}

      {!loading && requests.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {requests.map((req) => (
            <div 
              key={req.id} 
              className="card" 
              style={{ padding: '14px', cursor: 'pointer', marginBottom: 0 }}
              onClick={() => {
                setSelectedReq(req);
                const normalizedSt = (req.status === 'work_in_progress') ? 'in_progress' : req.status;
                setSelectedStatus(normalizedSt);
                setAdminNotes(req.admin_notes || '');
                setUpdateMsg('');
              }}
            >
              <div className="flex-between" style={{ marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {req.request_id || `MT-#${req.id}`}
                </span>
                <StatusBadge status={req.status} />
              </div>

              <h4 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {req.customer_name}
              </h4>

              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.4' }}>
                <strong>Issue:</strong> {req.issue_category?.replace(/_/g, ' ')} — {req.description}
              </p>

              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                {req.customer_phone && <span><Phone size={11} style={{ verticalAlign: '-1px' }} /> {req.customer_phone}</span>}
                {req.preferred_date && <span><Clock size={11} style={{ verticalAlign: '-1px' }} /> {req.preferred_date}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReq && (
        <Modal
          isOpen={!!selectedReq}
          onClose={() => setSelectedReq(null)}
          title={`Update Ticket #${selectedReq.request_id || selectedReq.id}`}
          footer={
            <div className="grid-2" style={{ gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedReq(null)} disabled={updating}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdate} disabled={updating}>
                {updating ? 'Saving...' : 'Save Updates'}
              </button>
            </div>
          }
        >
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-light)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{selectedReq.customer_name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-light)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
              <span>{selectedReq.customer_phone || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-light)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Issue Category:</span>
              <span style={{ textTransform: 'capitalize' }}>{selectedReq.issue_category?.replace(/_/g, ' ')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-light)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Preferred Schedule:</span>
              <span>{selectedReq.preferred_date || 'Flexible'} {selectedReq.preferred_time || ''}</span>
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Description:</span>
              <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.4' }}>
                {selectedReq.description}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select 
              className="form-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="submitted">Submitted</option>
              <option value="assigned">Assigned to Engineer</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Admin Remarks / Resolution Notes</label>
            <textarea
              className="form-textarea"
              placeholder="Enter remarks or updates for customer..."
              rows={4}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>

          {updateMsg && (
            <div style={{ color: updateMsg.includes('success') ? 'var(--success)' : 'var(--error)', fontSize: '12px', marginTop: '12px' }}>
              {updateMsg}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
