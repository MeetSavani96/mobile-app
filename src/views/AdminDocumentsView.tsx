import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft, Upload, Search, CheckCircle2, AlertCircle,
  X, FileText, Trash2, Eye, ShieldCheck, XCircle, Download,
  Image, File, RefreshCw
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { APP_CONFIG } from '../config';
import { Modal } from '../components/ui';

const getFullFileUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = APP_CONFIG.apiEndpoint.replace('/api.php', '');
  return `${base}${url}`;
};

interface AdminDocumentsViewProps {
  onBack: () => void;
}

interface DocRecord {
  id: number;
  customer_id: number;
  customer_name: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  status: string;
  uploaded_at: string;
  verified_at: string | null;
  notes: string | null;
  uploader_name?: string;
  verifier_name?: string;
}

const DOC_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'electricity_bill', label: 'Electricity Bill' },
  { value: 'property_docs', label: 'Property Documents' },
  { value: 'roof_images', label: 'Roof Images' },
  { value: 'site_survey', label: 'Site Survey Images' },
  { value: 'installation_photos', label: 'Installation Photos' },
  { value: 'customer_signature', label: 'Customer Signature' },
  { value: 'quotation', label: 'Quotation PDF' },
  { value: 'invoice', label: 'Invoice PDF' },
  { value: 'payment_receipt', label: 'Payment Receipt' },
  { value: 'warranty_certificate', label: 'Warranty Certificate' },
  { value: 'net_meter_certificate', label: 'Net Meter Certificate' },
  { value: 'completion_certificate', label: 'Completion Certificate' },
];

const STATUS_COLORS: Record<string, string> = {
  uploaded: 'var(--color-cyan)',
  verified: 'var(--color-green)',
  rejected: '#ef4444',
  pending: 'var(--color-amber)',
  expired: '#64748b',
};

export const AdminDocumentsView: React.FC<AdminDocumentsViewProps> = ({ onBack }) => {
  const [screen, setScreen] = useState<'list' | 'detail' | 'upload'>('list');
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<DocRecord[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Detail
  const [selectedDoc, setSelectedDoc] = useState<DocRecord | null>(null);

  // Upload form
  const [customers, setCustomers] = useState<any[]>([]);
  const [uploadCustId, setUploadCustId] = useState(0);
  const [uploadDocType, setUploadDocType] = useState('aadhaar');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Action modals
  const [verifyDialog, setVerifyDialog] = useState<DocRecord | null>(null);
  const [rejectDialog, setRejectDialog] = useState<DocRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DocRecord | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<DocRecord | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── DATA LOADING ─────────────────────────────────────────────────────────
  const fetchDocs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (typeFilter) params.set('doc_type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);

    const res = await apiFetch(`get_documents&${params.toString()}`);
    if (res.ok && Array.isArray(res.data?.data)) {
      setDocs(res.data.data);
    }
    setLoading(false);
  };

  const fetchCustomers = async () => {
    const res = await apiFetch('get_customers');
    if (res.ok && Array.isArray(res.data?.data)) {
      setCustomers(res.data.data);
      if (res.data.data.length > 0) setUploadCustId(res.data.data[0].id);
    }
  };

  const viewDetail = async (id: number) => {
    setLoading(true);
    const res = await apiFetch(`get_documents&id=${id}`);
    if (res.ok && res.data?.data) {
      setSelectedDoc(res.data.data);
      setScreen('detail');
    } else {
      showToast(res.error || 'Failed to load document.', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [search, typeFilter, statusFilter]);

  // ── UPLOAD ───────────────────────────────────────────────────────────────
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadCustId) {
      showToast('Please select a customer and file.', 'error');
      return;
    }
    // Client-side size guard (20 MB)
    if (uploadFile.size > 20 * 1024 * 1024) {
      showToast('File exceeds 20 MB limit.', 'error');
      return;
    }
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(uploadFile.type)) {
      showToast('Only PDF, JPG, PNG, WEBP files are allowed.', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    const form = new FormData();
    form.append('file', uploadFile);
    form.append('doc_type', uploadDocType);
    form.append('customer_id', String(uploadCustId));

    try {
      // Use XMLHttpRequest for progress events
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const baseUrl = (window as any).__API_BASE__ || APP_CONFIG.apiEndpoint;
        const token = localStorage.getItem('akv_session_id') || '';

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 90));
          }
        };

        xhr.onload = () => {
          setUploadProgress(100);
          if (xhr.status >= 200 && xhr.status < 300) {
            const resp = JSON.parse(xhr.responseText);
            if (resp.success) {
              showToast('Document uploaded successfully!', 'success');
              setScreen('list');
              fetchDocs();
              setUploadFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
              showToast(resp.message || 'Upload failed.', 'error');
            }
            resolve();
          } else {
            reject(new Error('Upload failed with status ' + xhr.status));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload.'));

        xhr.open('POST', `${baseUrl}?action=upload_document`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('X-Auth-Token', `Bearer ${token}`);
        xhr.send(form);
      });
    } catch (err: any) {
      showToast(err.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // ── VERIFY ───────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    if (!verifyDialog) return;
    setActionLoading(true);
    // Router maps 'verify_document' → documents.php where $action === 'verify_document'
    const res = await apiFetch('verify_document', {
      method: 'POST',
      body: JSON.stringify({ id: verifyDialog.id, notes: actionNotes })
    });
    if (res.ok) {
      showToast('Document verified successfully!', 'success');
      setVerifyDialog(null);
      setActionNotes('');
      fetchDocs();
      if (selectedDoc?.id === verifyDialog.id) viewDetail(verifyDialog.id);
    } else {
      showToast(res.error || 'Verification failed.', 'error');
    }
    setActionLoading(false);
  };

  // ── REJECT ───────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectDialog) return;
    setActionLoading(true);
    const res = await apiFetch('reject_document', {
      method: 'POST',
      body: JSON.stringify({ id: rejectDialog.id, notes: actionNotes })
    });
    if (res.ok) {
      showToast('Document rejected.', 'success');
      setRejectDialog(null);
      setActionNotes('');
      fetchDocs();
      if (selectedDoc?.id === rejectDialog.id) viewDetail(rejectDialog.id);
    } else {
      showToast(res.error || 'Rejection failed.', 'error');
    }
    setActionLoading(false);
  };

  // ── DELETE ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setActionLoading(true);
    const res = await apiFetch(`delete_document&id=${deleteConfirm.id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Document deleted.', 'success');
      setDeleteConfirm(null);
      if (screen === 'detail') setScreen('list');
      fetchDocs();
    } else {
      showToast(res.error || 'Delete failed.', 'error');
    }
    setActionLoading(false);
  };

  // ── HELPERS ───────────────────────────────────────────────────────────────
  const getDocLabel = (type: string) => DOC_TYPES.find(d => d.value === type)?.label ?? type;

  const isImage = (url: string) => /\.(jpg|jpeg|png|webp)$/i.test(url);

  const StatusBadge = ({ status }: { status: string }) => (
    <span style={{
      fontSize: '10px', fontWeight: 700, padding: '2px 8px',
      borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px',
      background: `${STATUS_COLORS[status] ?? '#64748b'}22`,
      color: STATUS_COLORS[status] ?? '#64748b',
      border: `1px solid ${STATUS_COLORS[status] ?? '#64748b'}44`,
    }}>
      {status}
    </span>
  );

  // ── RENDER: LIST ──────────────────────────────────────────────────────────
  return (
    <div className="animate-fade">
      {/* Top Bar */}
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <button
          onClick={() => screen === 'list' ? onBack() : setScreen('list')}
          className="btn btn-secondary"
          style={{ display: 'flex', gap: '6px', padding: '6px 12px', fontSize: '12px' }}
        >
          <ArrowLeft size={14} /> {screen === 'list' ? 'Back' : 'All Documents'}
        </button>
        {screen === 'list' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={fetchDocs} className="btn btn-secondary" style={{ padding: '6px 10px' }}>
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => { fetchCustomers(); setScreen('upload'); }}
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', gap: '4px', alignItems: 'center' }}
            >
              <Upload size={14} /> Upload
            </button>
          </div>
        )}
      </div>

      {/* ── LIST SCREEN ── */}
      {screen === 'list' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="search"
                className="form-input"
                placeholder="Search customer, file, type..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '30px', fontSize: '12px', height: '36px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <select className="form-input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ fontSize: '11px', height: '34px' }}>
                <option value="">All Types</option>
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <select className="form-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ fontSize: '11px', height: '34px' }}>
                <option value="">All Statuses</option>
                <option value="uploaded">Uploaded</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
            {[
              { label: 'Total', count: docs.length, color: 'var(--color-cyan)' },
              { label: 'Verified', count: docs.filter(d => d.status === 'verified').length, color: 'var(--color-green)' },
              { label: 'Pending', count: docs.filter(d => d.status === 'uploaded').length, color: '#fbbf24' },
            ].map(s => (
              <div key={s.label} className="glass-card" style={{ padding: '10px', marginBottom: 0, textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Document List */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ height: '76px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : docs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {docs.map(doc => (
                <div key={doc.id} className="glass-card hover-glow" style={{ padding: '12px', marginBottom: 0 }}>
                  <div className="flex-between" style={{ marginBottom: '4px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {isImage(doc.file_url)
                        ? <Image size={14} color="var(--color-cyan)" />
                        : <FileText size={14} color="var(--color-cyan)" />
                      }
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{getDocLabel(doc.doc_type)}</span>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    👤 {doc.customer_name} • {doc.uploaded_at.split(' ')[0]}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button onClick={() => viewDetail(doc.id)} className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '10px', display: 'flex', gap: '3px', alignItems: 'center' }}>
                      <Eye size={11} /> View
                    </button>
                    {doc.status === 'uploaded' && (
                      <>
                        <button
                          onClick={() => { setVerifyDialog(doc); setActionNotes(''); }}
                          className="btn"
                          style={{ padding: '3px 8px', fontSize: '10px', display: 'flex', gap: '3px', alignItems: 'center', background: 'rgba(16,185,129,0.1)', color: 'var(--color-green)', border: '1px solid rgba(16,185,129,0.2)' }}
                        >
                          <ShieldCheck size={11} /> Verify
                        </button>
                        <button
                          onClick={() => { setRejectDialog(doc); setActionNotes(''); }}
                          className="btn"
                          style={{ padding: '3px 8px', fontSize: '10px', display: 'flex', gap: '3px', alignItems: 'center', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                          <XCircle size={11} /> Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setDeleteConfirm(doc)}
                      className="btn"
                      style={{ padding: '3px 8px', fontSize: '10px', display: 'flex', gap: '3px', alignItems: 'center', background: 'rgba(239,68,68,0.06)', color: '#ef4444' }}
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
              <File size={28} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <h3 style={{ fontSize: '15px', color: '#fff', marginBottom: '6px' }}>No Documents Found</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Upload documents or adjust your filters.</p>
            </div>
          )}
        </>
      )}

      {/* ── UPLOAD SCREEN ── */}
      {screen === 'upload' && (
        <form onSubmit={handleUpload} className="glass-card" style={{ padding: '18px' }}>
          <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '16px', fontWeight: 700 }}>Upload Document</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>Select Customer *</label>
              <select
                className="form-input"
                value={uploadCustId}
                onChange={e => setUploadCustId(Number(e.target.value))}
                required
              >
                <option value="0">— Select Customer —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>Document Type *</label>
              <select className="form-input" value={uploadDocType} onChange={e => setUploadDocType(e.target.value)} required>
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>Select File * (PDF, JPG, PNG, WEBP — max 20 MB)</label>
              <div
                style={{
                  border: '2px dashed rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: uploadFile ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.2s'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadFile ? (
                  <div>
                    <CheckCircle2 size={20} color="var(--color-green)" style={{ margin: '0 auto 6px', display: 'block' }} />
                    <div style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>{uploadFile.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload size={20} color="var(--text-muted)" style={{ margin: '0 auto 6px', display: 'block' }} />
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tap to browse file</div>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                style={{ display: 'none' }}
                onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {/* Upload progress bar */}
            {uploading && (
              <div style={{ borderRadius: '4px', background: 'rgba(255,255,255,0.06)', height: '6px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${uploadProgress}%`,
                  background: 'linear-gradient(90deg, var(--color-cyan), var(--color-green))',
                  transition: 'width 0.3s ease',
                  borderRadius: '4px'
                }} />
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ marginTop: '6px' }} disabled={uploading}>
              {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Document'}
            </button>
          </div>
        </form>
      )}

      {/* ── DETAIL SCREEN ── */}
      {screen === 'detail' && selectedDoc && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Header Card */}
          <div className="glass-card glow-cyan" style={{ padding: '16px' }}>
            <div className="flex-between" style={{ marginBottom: '10px' }}>
              <h3 style={{ fontSize: '16px', color: '#fff', fontWeight: 700 }}>{getDocLabel(selectedDoc.doc_type)}</h3>
              <StatusBadge status={selectedDoc.status} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <div>Customer: <span style={{ color: '#fff' }}>{selectedDoc.customer_name}</span></div>
              <div>File: <span style={{ color: '#fff' }}>{selectedDoc.file_name}</span></div>
              <div>Uploaded: <span style={{ color: '#fff' }}>{selectedDoc.uploaded_at.split(' ')[0]}</span></div>
              {selectedDoc.verified_at && (
                <div>Verified/Rejected: <span style={{ color: '#fff' }}>{selectedDoc.verified_at.split(' ')[0]}</span></div>
              )}
              {selectedDoc.verifier_name && (
                <div>By: <span style={{ color: '#fff' }}>{selectedDoc.verifier_name}</span></div>
              )}
              {selectedDoc.notes && (
                <div style={{ marginTop: '6px', background: 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: '8px', color: '#fff' }}>
                  📋 {selectedDoc.notes}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
              <button
                onClick={() => setPreviewDoc(selectedDoc)}
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '6px 10px', display: 'flex', gap: '4px', alignItems: 'center' }}
              >
                <Eye size={12} /> Preview
              </button>
              <button
                onClick={() => {
                  const url = getFullFileUrl(selectedDoc.file_url);
                  if (url) {
                    window.open(url, '_blank');
                  } else {
                    showToast('Invalid file URL.', 'error');
                  }
                }}
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '6px 10px', display: 'flex', gap: '4px', alignItems: 'center' }}
              >
                <Download size={12} /> Download
              </button>
              {selectedDoc.status === 'uploaded' && (
                <>
                  <button
                    onClick={() => { setVerifyDialog(selectedDoc); setActionNotes(''); }}
                    className="btn"
                    style={{ fontSize: '11px', padding: '6px 10px', display: 'flex', gap: '4px', alignItems: 'center', background: 'rgba(16,185,129,0.15)', color: 'var(--color-green)', border: '1px solid rgba(16,185,129,0.25)' }}
                  >
                    <ShieldCheck size={12} /> Verify
                  </button>
                  <button
                    onClick={() => { setRejectDialog(selectedDoc); setActionNotes(''); }}
                    className="btn"
                    style={{ fontSize: '11px', padding: '6px 10px', display: 'flex', gap: '4px', alignItems: 'center', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.22)' }}
                  >
                    <XCircle size={12} /> Reject
                  </button>
                </>
              )}
              <button
                onClick={() => setDeleteConfirm(selectedDoc)}
                className="btn"
                style={{ fontSize: '11px', padding: '6px 10px', display: 'flex', gap: '4px', alignItems: 'center', background: 'rgba(239,68,68,0.06)', color: '#ef4444' }}
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>

          {/* Inline Preview Thumbnail for images */}
          {isImage(selectedDoc.file_url) && (
            <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
              <img
                src={getFullFileUrl(selectedDoc.file_url)}
                alt={selectedDoc.file_name}
                style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── PREVIEW MODAL ── */}
      {previewDoc && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide" style={{ maxHeight: '90%', padding: '16px' }}>
            <div className="flex-between" style={{ marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{getDocLabel(previewDoc.doc_type)}</span>
              <button onClick={() => setPreviewDoc(null)} className="modal-close" style={{ width: '28px', height: '28px' }}><X size={14} /></button>
            </div>
            <div style={{ textAlign: 'center' }}>
              {isImage(previewDoc.file_url) ? (
                <img
                  src={getFullFileUrl(previewDoc.file_url)}
                  alt={previewDoc.file_name}
                  style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px' }}
                />
              ) : (
                <div style={{ padding: '30px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                  <FileText size={40} color="var(--color-cyan)" style={{ margin: '0 auto 12px', display: 'block' }} />
                  <div style={{ fontSize: '13px', color: '#fff', marginBottom: '4px' }}>{previewDoc.file_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PDF documents open via download</div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button
                onClick={() => {
                  const url = getFullFileUrl(previewDoc.file_url);
                  if (url) {
                    window.open(url, '_blank');
                  } else {
                    showToast('Invalid file URL.', 'error');
                  }
                  setPreviewDoc(null);
                }}
                className="btn btn-primary"
                style={{ flex: 1, display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', fontSize: '12px' }}
              >
                <Download size={13} /> Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VERIFY MODAL ── */}
      {verifyDialog && (
        <Modal
          isOpen={!!verifyDialog}
          onClose={() => setVerifyDialog(null)}
          title="Verify Document"
          footer={
            <div className="grid-2" style={{ gap: '8px' }}>
              <button onClick={() => setVerifyDialog(null)} className="btn btn-secondary">Cancel</button>
              <button
                onClick={handleVerify}
                className="btn btn-success"
                disabled={actionLoading}
              >
                {actionLoading ? 'Verifying...' : 'Confirm Verify'}
              </button>
            </div>
          }
        >
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Verifying <strong style={{ color: 'var(--text-primary)' }}>{getDocLabel(verifyDialog.doc_type)}</strong> for <strong style={{ color: 'var(--text-primary)' }}>{verifyDialog.customer_name}</strong>
          </p>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Verification Notes (optional)</label>
            <textarea
              className="form-input"
              value={actionNotes}
              onChange={e => setActionNotes(e.target.value)}
              placeholder="Add internal notes..."
              style={{ minHeight: '60px', fontSize: '12px' }}
            />
          </div>
        </Modal>
      )}

      {/* ── REJECT MODAL ── */}
      {rejectDialog && (
        <Modal
          isOpen={!!rejectDialog}
          onClose={() => setRejectDialog(null)}
          title="Reject Document"
          footer={
            <div className="grid-2" style={{ gap: '8px' }}>
              <button onClick={() => setRejectDialog(null)} className="btn btn-secondary">Cancel</button>
              <button
                onClick={handleReject}
                className="btn btn-danger"
                disabled={actionLoading}
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          }
        >
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Rejecting <strong style={{ color: 'var(--text-primary)' }}>{getDocLabel(rejectDialog.doc_type)}</strong>
          </p>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Rejection Reason *</label>
            <textarea
              className="form-input"
              value={actionNotes}
              onChange={e => setActionNotes(e.target.value)}
              placeholder="Explain why the document was rejected..."
              style={{ minHeight: '70px', fontSize: '12px' }}
              required
            />
          </div>
        </Modal>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteConfirm && (
        <Modal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Document?"
          footer={
            <div className="grid-2" style={{ gap: '8px' }}>
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary">Cancel</button>
              <button
                onClick={handleDelete}
                className="btn btn-danger"
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          }
        >
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            This will permanently delete <strong style={{ color: 'var(--text-primary)' }}>{getDocLabel(deleteConfirm.doc_type)}</strong> for {deleteConfirm.customer_name}. The physical file will also be removed.
          </p>
        </Modal>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '20px', right: '20px',
          background: toast.type === 'success' ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
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
