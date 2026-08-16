import React, { useEffect, useState } from 'react';
import { 
  FileText, ClipboardList, CheckCircle2,
  ArrowLeft, Camera, AlertCircle, FileCheck, HelpCircle, Bell, Settings,
  Globe, Moon, Shield, Info, Download, X, Wrench, CreditCard, Receipt
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { APP_CONFIG } from '../config';

const getFullFileUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = APP_CONFIG.apiEndpoint.replace('/api.php', '');
  return `${base}${url}`;
};

interface CustomerPortalProps {
  initialScreen?: string;
  onBack: () => void;
}

interface Enquiry {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  system_size_kw: number | null;
  status: string;
  created_at: string;
}

interface EnquiryDetails extends Enquiry {
  roof_space: number | null;
  notes: string | null;
  admin_remarks: string | null;
  assigned_to: number | null;
  engineer_name: string | null;
  timeline: {
    action: string;
    note: string | null;
    actor_name: string;
    created_at: string;
  }[];
}

interface Ticket {
  id: number;
  issue_type: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  image_url?: string | null;
}

export const CustomerPortalView: React.FC<CustomerPortalProps> = ({ initialScreen = 'dashboard', onBack }) => {
  const [screen, setScreen] = useState(initialScreen);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ══════════════════════════════════════════════════════════════════════
  // 1. MY ENQUIRIES & QUOTES STATES & LOGIC
  // ══════════════════════════════════════════════════════════════════════
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryDetails | null>(null);
  const [enqSearch, setEnqSearch] = useState('');
  const [enqStatusFilter, setEnqStatusFilter] = useState('');

  // Quotation states
  const [quotes, setQuotes] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [activeQuoteTab, setActiveQuoteTab] = useState<'quotes' | 'enquiries'>('quotes');
  const [showQuotePdf, setShowQuotePdf] = useState(false);

  // Active Project Tracker states
  const [activeProject, setActiveProject] = useState<any | null>(null);

  const fetchActiveProject = async () => {
    setLoading(true);
    const res = await apiFetch('get_installations');
    if (res.ok && Array.isArray(res.data?.data) && res.data.data.length > 0) {
      const projId = res.data.data[0].id;
      const detailsRes = await apiFetch(`get_installations&id=${projId}`);
      if (detailsRes.ok && detailsRes.data?.data) {
        setActiveProject(detailsRes.data.data);
      }
    } else {
      setActiveProject(null);
    }
    setLoading(false);
  };

  const fetchEnquiries = async () => {
    setLoading(true);
    const res = await apiFetch('get_my_enquiries');
    if (res.ok && Array.isArray(res.data?.data)) {
      setEnquiries(res.data.data);
    }
    setLoading(false);
  };

  const fetchQuotes = async () => {
    setLoading(true);
    const res = await apiFetch('get_quotations');
    if (res.ok && Array.isArray(res.data?.data)) {
      setQuotes(res.data.data);
    }
    setLoading(false);
  };

  const viewEnquiryDetails = async (id: number) => {
    setLoading(true);
    const res = await apiFetch(`get_my_enquiries&id=${id}`);
    if (res.ok && res.data?.data) {
      setSelectedEnquiry(res.data.data);
    } else {
      showToast(res.error || 'Failed to load details.', 'error');
    }
    setLoading(false);
  };

  const viewQuoteDetails = async (id: number) => {
    setLoading(true);
    const res = await apiFetch(`get_quotations&id=${id}`);
    if (res.ok && res.data?.data) {
      setSelectedQuote(res.data.data);
    } else {
      showToast(res.error || 'Failed to load quote details.', 'error');
    }
    setLoading(false);
  };

  const handleAcceptQuote = async (id: number) => {
    setLoading(true);
    const res = await apiFetch('accept_quotation', {
      method: 'POST',
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      showToast('Quotation accepted successfully!', 'success');
      viewQuoteDetails(id);
      fetchQuotes();
    } else {
      showToast(res.error || 'Failed to accept quotation.', 'error');
    }
    setLoading(false);
  };

  const handleRejectQuote = async (id: number) => {
    setLoading(true);
    const res = await apiFetch('reject_quotation', {
      method: 'POST',
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      showToast('Quotation rejected successfully.', 'success');
      viewQuoteDetails(id);
      fetchQuotes();
    } else {
      showToast(res.error || 'Failed to reject quotation.', 'error');
    }
    setLoading(false);
  };

  // ══════════════════════════════════════════════════════════════════════
  // 2. MY TICKETS STATES & LOGIC
  // ══════════════════════════════════════════════════════════════════════
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [issueType, setIssueType] = useState('Inverter Offline');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketPriority, setTicketPriority] = useState('medium');
  const [ticketPhoto, setTicketPhoto] = useState<string | null>(null);
  const [savingTicket, setSavingTicket] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    const res = await apiFetch('get_complaints');
    if (res.ok && Array.isArray(res.data)) {
      setTickets(res.data);
    }
    setLoading(false);
  };

  const handleSimulatePhoto = () => {
    // Simulated upload
    setTicketPhoto('https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=100');
    showToast('Photo attached successfully.');
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketDesc.trim()) return;
    setSavingTicket(true);

    const payload = {
      title: issueType,
      issue_type: issueType,
      description: ticketDesc,
      priority: ticketPriority,
      image_url: ticketPhoto
    };

    const res = await apiFetch('submit_complaint', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast('Complaint ticket raised successfully!', 'success');
      setTicketDesc('');
      setTicketPhoto(null);
      setShowAddTicket(false);
      fetchTickets();
    } else {
      showToast(res.error || 'Failed to submit complaint.', 'error');
    }
    setSavingTicket(false);
  };

  const handleCloseTicket = async (id: number) => {
    const res = await apiFetch('update_complaint', {
      method: 'PUT',
      body: JSON.stringify({ id, status: 'resolved' })
    });
    if (res.ok) {
      showToast('Ticket marked as resolved.');
      fetchTickets();
    } else {
      showToast(res.error || 'Failed to update ticket.', 'error');
    }
  };

  // ══════════════════════════════════════════════════════════════════════
  // 3. INVOICE & PAYMENT PORTAL STATES
  // ══════════════════════════════════════════════════════════════════════
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [invoicePayments, setInvoicePayments] = useState<any[]>([]);
  const [showInvPdfPreview, setShowInvPdfPreview] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState<any | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    const res = await apiFetch('get_invoices');
    if (res.ok && Array.isArray(res.data?.data)) {
      setInvoices(res.data.data);
    }
    setLoading(false);
  };

  const viewInvoiceDetails = async (id: number) => {
    setLoading(true);
    const [invRes, payRes] = await Promise.all([
      apiFetch(`get_invoices&id=${id}`),
      apiFetch(`get_payments&invoice_id=${id}`)
    ]);
    if (invRes.ok && invRes.data?.data) {
      setSelectedInvoice(invRes.data.data);
    } else {
      showToast(invRes.error || 'Failed to load invoice details.', 'error');
    }
    if (payRes.ok && Array.isArray(payRes.data?.data)) {
      setInvoicePayments(payRes.data.data);
    }
    setLoading(false);
  };

  // ══════════════════════════════════════════════════════════════════════
  // 4. SETTINGS & PREFERENCES
  // ══════════════════════════════════════════════════════════════════════
  const [language, setLanguage] = useState('English');
  const [darkMode, setDarkMode] = useState(true);
  const [alerts, setAlerts] = useState(true);

  // ══════════════════════════════════════════════════════════════════════
  // 5. CUSTOMER DOCUMENTS PORTAL
  // ══════════════════════════════════════════════════════════════════════
  const [myDocs, setMyDocs] = useState<any[]>([]);
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [docStatusFilter, setDocStatusFilter] = useState('');
  const [uploadDocType, setUploadDocType] = useState('aadhaar');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const docFileRef = React.useRef<HTMLInputElement>(null);

  const DOC_TYPE_LABELS: Record<string, string> = {
    aadhaar: 'Aadhaar Card', pan: 'PAN Card',
    electricity_bill: 'Electricity Bill', property_docs: 'Property Documents',
    roof_images: 'Roof Images', site_survey: 'Site Survey Images',
    installation_photos: 'Installation Photos', customer_signature: 'Customer Signature',
    quotation: 'Quotation PDF', invoice: 'Invoice PDF',
    payment_receipt: 'Payment Receipt', warranty_certificate: 'Warranty Certificate',
    net_meter_certificate: 'Net Meter Certificate', completion_certificate: 'Completion Certificate',
  };

  const DOC_STATUS_COLOR: Record<string, string> = {
    uploaded: 'var(--color-cyan)',
    verified: 'var(--color-green)',
    rejected: '#ef4444',
    pending: '#fbbf24',
    expired: '#64748b',
  };

  const fetchMyDocs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (docTypeFilter) params.set('doc_type', docTypeFilter);
    if (docStatusFilter) params.set('status', docStatusFilter);
    const res = await apiFetch(`get_documents&${params.toString()}`);
    if (res.ok && Array.isArray(res.data?.data)) {
      setMyDocs(res.data.data);
    }
    setLoading(false);
  };

  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) { showToast('Please select a file.', 'error'); return; }
    if (uploadFile.size > 20 * 1024 * 1024) { showToast('File exceeds 20 MB limit.', 'error'); return; }
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(uploadFile.type)) { showToast('Only PDF, JPG, PNG, WEBP files allowed.', 'error'); return; }

    setUploading(true);
    setUploadProgress(10);

    const form = new FormData();
    form.append('file', uploadFile);
    form.append('doc_type', uploadDocType);

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        // Use Capacitor-compatible dynamic URL via app config
        const baseUrl = (window as any).__API_BASE__ || APP_CONFIG.apiEndpoint;
        const token = localStorage.getItem('akv_session_id') || '';

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 90));
        };
        xhr.onload = () => {
          setUploadProgress(100);
          if (xhr.status >= 200 && xhr.status < 300) {
            const resp = JSON.parse(xhr.responseText);
            if (resp.success) {
              showToast('Document uploaded successfully!', 'success');
              setShowDocUpload(false);
              setUploadFile(null);
              if (docFileRef.current) docFileRef.current.value = '';
              fetchMyDocs();
            } else {
              showToast(resp.message || 'Upload failed.', 'error');
            }
            resolve();
          } else {
            reject(new Error('Upload failed.'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error.'));
        xhr.open('POST', `${baseUrl}?action=upload_document`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('X-Auth-Token', `Bearer ${token}`);
        xhr.send(form);
      });
    } catch (err: any) {
      showToast(err.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 800);
    }
  };

  // ══════════════════════════════════════════════════════════════════════
  // LOADERS ON SCREEN CHANGE
  // ══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (screen === 'enquiries') {
      fetchEnquiries();
      fetchQuotes();
    } else if (screen === 'tickets') {
      fetchTickets();
    } else if (screen === 'tracker') {
      fetchActiveProject();
    } else if (screen === 'invoices') {
      fetchInvoices();
    } else if (screen === 'docs') {
      fetchMyDocs();
    }
  }, [screen]);

  // Filters for enquiries
  const filteredEnquiries = enquiries.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(enqSearch.toLowerCase()) || 
                          e.phone.includes(enqSearch);
    const matchesStatus = enqStatusFilter === '' || e.status === enqStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return 'var(--color-green)';
      case 'rejected':
      case 'cancelled':
        return '#f87171';
      default:
        return 'var(--color-cyan)';
    }
  };

  const handleDownloadDoc = (docName: string) => {
    showToast(`Downloading ${docName}...`);
    // Simulated browser download trigger
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = '#';
      link.setAttribute('download', docName);
      document.body.appendChild(link);
      showToast(`${docName} downloaded successfully!`, 'success');
    }, 1000);
  };

  return (
    <div className="animate-fade">
      {/* ── BACK BUTTON ROW ──────────────────────────────────────────────── */}
      <button onClick={() => {
        if (selectedEnquiry) {
          setSelectedEnquiry(null);
        } else if (screen !== 'dashboard') {
          setScreen('dashboard');
        } else {
          onBack();
        }
      }} className="btn" style={{ padding: 0, background: 'transparent', color: 'var(--text-muted)', marginBottom: '16px' }}>
        <ArrowLeft size={16} /> Back to Profile
      </button>

      {/* ── SCREEN: DASHBOARD ────────────────────────────────────────────── */}
      {screen === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { id: 'enquiries', title: 'My Enquiries & Quotes', desc: 'Track system estimations and pricing proposals', icon: <FileText color="var(--color-cyan)" size={20} /> },
            { id: 'tracker', title: 'Installation Tracker', desc: 'Check solar grid commissioning timelines', icon: <ClipboardList color="var(--color-green)" size={20} /> },
            { id: 'tickets', title: 'My Support Tickets', desc: 'Raise inverter repairs or service complaints', icon: <HelpCircle color="var(--color-amber)" size={20} /> },
            { id: 'docs', title: 'My Verification Documents', desc: 'Download invoices, quotes, and warranty files', icon: <FileCheck color="var(--color-cyan)" size={20} /> },
            { id: 'notifications', title: 'Service Notifications', desc: 'Milestones progress and calendar reminders', icon: <Bell color="var(--color-green)" size={20} /> },
            { id: 'settings', title: 'Portal Settings', desc: 'Manage dark mode, notifications, and language', icon: <Settings color="var(--text-muted)" size={20} /> },
          ].map(item => (
            <div 
              key={item.id} 
              className="glass-card hover-glow" 
              onClick={() => setScreen(item.id)}
              style={{ padding: '16px', display: 'flex', gap: '14px', alignItems: 'center', cursor: 'pointer', marginBottom: 0 }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>{item.title}</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SCREEN: MY ENQUIRIES ─────────────────────────────────────────── */}
      {screen === 'enquiries' && (
        <div>
          {/* ── 1. SELECTED QUOTE DETAILS ────────────────────────────────── */}
          {selectedQuote ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="glass-card glow-cyan" style={{ padding: '16px' }}>
                <div className="flex-between" style={{ marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '15px', color: '#fff', fontWeight: 600 }}>Proposal Details</h3>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: getStatusColor(selectedQuote.status), textTransform: 'uppercase', fontWeight: 600 }}>
                    {selectedQuote.status}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <div>Quote Number: <span style={{ color: '#fff', fontWeight: 600 }}>QT-{String(selectedQuote.id).padStart(6, '0')}</span></div>
                  <div>Issued Date: <span style={{ color: '#fff' }}>{selectedQuote.created_at.split(' ')[0]}</span></div>
                  {selectedQuote.validity_date && <div>Validity Limit: <span style={{ color: '#fff' }}>{selectedQuote.validity_date}</span></div>}
                </div>
              </div>

              {/* Items listing */}
              <div className="glass-card" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '13px', color: '#fff', marginBottom: '12px', fontWeight: 600 }}>Product Details</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedQuote.items?.map((it: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                      <div>
                        <span style={{ color: '#fff', fontWeight: 500 }}>{it.product_name}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Qty: {it.quantity} x ${Number(it.price).toLocaleString()}</span>
                      </div>
                      <span style={{ color: '#fff', fontWeight: 600 }}>${(it.quantity * it.price).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div className="flex-between"><span>Subtotal:</span><span>${Number(selectedQuote.subtotal).toLocaleString()}</span></div>
                  <div className="flex-between"><span>Discount:</span><span style={{ color: '#ef4444' }}>-${Number(selectedQuote.discount).toLocaleString()}</span></div>
                  <div className="flex-between"><span>GST Tax (18%):</span><span>${Number(selectedQuote.gst).toLocaleString()}</span></div>
                  <div className="flex-between"><span>Civil & Freight:</span><span>${(Number(selectedQuote.installation_charges) + Number(selectedQuote.transportation_charges)).toLocaleString()}</span></div>
                  <div className="flex-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px', fontSize: '14px', fontWeight: 700, color: 'var(--color-green)' }}>
                    <span>Grand Total:</span><span>${Number(selectedQuote.grand_total).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Customer Actions (Accept / Reject) */}
              {(selectedQuote.status === 'sent' || selectedQuote.status === 'viewed' || selectedQuote.status === 'draft') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button onClick={() => handleAcceptQuote(selectedQuote.id)} className="btn btn-primary" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                    Accept Proposal
                  </button>
                  <button onClick={() => handleRejectQuote(selectedQuote.id)} className="btn btn-secondary" style={{ color: '#ef4444' }}>
                    Reject Proposal
                  </button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button onClick={() => setShowQuotePdf(true)} className="btn btn-secondary" style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={12} /> View PDF Invoice
                </button>
                <button onClick={() => { setSelectedQuote(null); }} className="btn btn-secondary">
                  Back to List
                </button>
              </div>
            </div>
          ) : selectedEnquiry ? (
            /* ── 2. SELECTED ENQUIRY DETAILS ────────────────────────────── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="glass-card glow-green" style={{ padding: '16px' }}>
                <div className="flex-between" style={{ marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px', color: '#fff' }}>Enquiry #{selectedEnquiry.id}</h3>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: getStatusColor(selectedEnquiry.status), textTransform: 'uppercase', fontWeight: 600 }}>
                    {selectedEnquiry.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <div>Request Name: <span style={{ color: '#fff' }}>{selectedEnquiry.name}</span></div>
                  <div>System size: <span style={{ color: '#fff' }}>{selectedEnquiry.system_size_kw ? `${selectedEnquiry.system_size_kw} kW` : '—'}</span></div>
                  <div>Assigned Engineer: <span style={{ color: '#fff' }}>{selectedEnquiry.engineer_name || 'Allocating...'}</span></div>
                </div>
                <button onClick={() => setSelectedEnquiry(null)} className="btn btn-secondary" style={{ marginTop: '12px', padding: '4px 8px', fontSize: '11px', width: '100%' }}>
                  Back to List
                </button>
              </div>

              {/* Timeline logs */}
              <div className="glass-card" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '13px', color: '#fff', marginBottom: '12px', fontWeight: 600 }}>Lifecycle History Timeline</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', paddingLeft: '16px', borderLeft: '2px solid rgba(255,255,255,0.06)' }}>
                  {selectedEnquiry.timeline && selectedEnquiry.timeline.length > 0 ? (
                    selectedEnquiry.timeline.map((item, idx) => (
                      <div key={idx} style={{ position: 'relative' }}>
                        <div style={{ 
                          position: 'absolute', left: '-22px', top: '3px', 
                          width: '10px', height: '10px', borderRadius: '50%', 
                          background: 'var(--color-green)', border: '2px solid var(--color-bg)' 
                        }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: '#fff' }}>
                          <span>{item.action}</span>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>{item.created_at.split(' ')[0]}</span>
                        </div>
                        {item.note && (
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '4px 6px', borderRadius: '4px', marginTop: '4px' }}>
                            "{item.note}"
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No actions logged.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ── 3. LIST VIEW (TABS TOGGLE) ─────────────────────────────── */
            <>
              {/* Tabs selector */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button 
                  onClick={() => setActiveQuoteTab('quotes')} 
                  className={`btn ${activeQuoteTab === 'quotes' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '10px 8px', fontSize: '12px', margin: 0 }}
                >
                  Proposals & Quotes
                </button>
                <button 
                  onClick={() => setActiveQuoteTab('enquiries')} 
                  className={`btn ${activeQuoteTab === 'enquiries' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '10px 8px', fontSize: '12px', margin: 0 }}
                >
                  Lead Enquiries
                </button>
              </div>

              {activeQuoteTab === 'quotes' ? (
                /* QUOTES LIST */
                loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[1, 2].map(i => (
                      <div key={i} style={{ height: '70px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s infinite' }} />
                    ))}
                  </div>
                ) : quotes.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {quotes.map(q => (
                      <div key={q.id} className="glass-card hover-glow" onClick={() => viewQuoteDetails(q.id)} style={{ padding: '14px', cursor: 'pointer', marginBottom: 0 }}>
                        <div className="flex-between">
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Quote #{String(q.id).padStart(6, '0')}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Amount: ${Number(q.grand_total).toLocaleString()}</div>
                          </div>
                          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', color: getStatusColor(q.status), fontWeight: 600, textTransform: 'uppercase' }}>
                            {q.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-card" style={{ textAlign: 'center', padding: '30px' }}>No proposals received yet.</div>
                )
              ) : (
                /* ENQUIRIES LIST */
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '16px' }}>
                    <input 
                      type="search" 
                      className="form-input" 
                      placeholder="Search quotes..." 
                      value={enqSearch}
                      onChange={e => setEnqSearch(e.target.value)}
                      style={{ fontSize: '13px', height: '36px' }}
                    />
                    <select 
                      className="form-input" 
                      value={enqStatusFilter}
                      onChange={e => setEnqStatusFilter(e.target.value)}
                      style={{ fontSize: '12px', height: '36px' }}
                    >
                      <option value="">All</option>
                      <option value="new">New</option>
                      <option value="site_visit_scheduled">Visit Scheduled</option>
                      <option value="quotation_sent">Quotation Sent</option>
                      <option value="approved">Approved</option>
                    </select>
                  </div>

                  {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[1, 2].map(i => (
                        <div key={i} style={{ height: '70px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s infinite' }} />
                      ))}
                    </div>
                  ) : filteredEnquiries.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {filteredEnquiries.map(enq => (
                        <div key={enq.id} className="glass-card hover-glow" onClick={() => viewEnquiryDetails(enq.id)} style={{ padding: '14px', cursor: 'pointer', marginBottom: 0 }}>
                          <div className="flex-between">
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Quote Request #{enq.id}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>System size: {enq.system_size_kw ? `${enq.system_size_kw} kW` : '—'}</div>
                            </div>
                            <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', color: getStatusColor(enq.status), fontWeight: 600, textTransform: 'uppercase' }}>
                              {enq.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '30px' }}>No matching enquiries found.</div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── PDF PREVIEW MODAL OVERLAY (CUSTOMER SIDE) ────────────────── */}
          {showQuotePdf && selectedQuote && (
            <div className="modal-overlay">
              <div className="modal-content animate-slide" style={{ maxHeight: '90%', padding: '20px', overflowY: 'auto' }}>
                <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Proposal PDF Invoice Preview</span>
                  <button onClick={() => setShowQuotePdf(false)} className="modal-close" style={{ width: '30px', height: '30px' }}><X size={14} /></button>
                </div>

                <div style={{ background: '#fff', color: '#0f172a', padding: '20px', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
                  <div className="flex-between" style={{ borderBottom: '2px solid #0f172a', paddingBottom: '10px' }}>
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>AKV ENERGY SOLAR</h2>
                      <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: '#475569' }}>Ahmedabad, Gujarat • support@akvenergy.com</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <h3 style={{ margin: 0 }}>QUOTATION</h3>
                      <p style={{ margin: '2px 0 0 0' }}>QT-{String(selectedQuote.id).padStart(6, '0')}</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '14px 0', fontSize: '10px' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Client Info</span>
                      <strong>{selectedQuote.customer_name}</strong>
                      <div>{selectedQuote.customer_phone}</div>
                      <div>{selectedQuote.customer_address || 'Gujarat, India'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Issued Date</span>
                      <div>{selectedQuote.created_at.split(' ')[0]}</div>
                      <div style={{ marginTop: '4px', fontWeight: 'bold' }}>Validity: {selectedQuote.validity_date || '—'}</div>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0', fontSize: '10px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #0f172a' }}>
                        <th style={{ textAlign: 'left', padding: '6px' }}>Product</th>
                        <th style={{ textAlign: 'center', padding: '6px' }}>Qty</th>
                        <th style={{ textAlign: 'right', padding: '6px' }}>Price</th>
                        <th style={{ textAlign: 'right', padding: '6px' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedQuote.items?.map((it: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '6px' }}>{it.product_name}</td>
                          <td style={{ textAlign: 'center', padding: '6px' }}>{it.quantity}</td>
                          <td style={{ textAlign: 'right', padding: '6px' }}>${Number(it.price).toLocaleString()}</td>
                          <td style={{ textAlign: 'right', padding: '6px' }}>${(it.quantity * it.price).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
                      <div className="flex-between"><span>Subtotal:</span><span>${Number(selectedQuote.subtotal).toLocaleString()}</span></div>
                      <div className="flex-between"><span>Discount:</span><span>-${Number(selectedQuote.discount).toLocaleString()}</span></div>
                      <div className="flex-between"><span>GST Tax (18%):</span><span>${Number(selectedQuote.gst).toLocaleString()}</span></div>
                      <div className="flex-between"><span>Civil & Logistics:</span><span>${(Number(selectedQuote.installation_charges) + Number(selectedQuote.transportation_charges)).toLocaleString()}</span></div>
                      <div className="flex-between" style={{ borderTop: '2px solid #0f172a', paddingTop: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                        <span>Grand Total:</span><span>${Number(selectedQuote.grand_total).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '24px', paddingTop: '10px', fontSize: '9px', color: '#64748b' }}>
                    <span style={{ fontWeight: 'bold', color: '#0f172a' }}>Terms:</span>
                    <div>All calculations include PM Surya Ghar subsidy paper checks. Grid synching clearance clear in 15 business days.</div>
                  </div>
                </div>

                <button onClick={() => showToast('Proposal PDF downloaded successfully!', 'success')} className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                  Download PDF Copy
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SCREEN: INSTALLATION TRACKER ─────────────────────────────────── */}
      {screen === 'tracker' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeProject ? (
            <>
              {/* Overview panel */}
              <div className="glass-card glow-cyan" style={{ padding: '16px' }}>
                <div className="flex-between" style={{ marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '15px', color: '#fff', fontWeight: 600 }}>Active Solar Project</h3>
                  <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: 'var(--color-green)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {activeProject.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {activeProject.estimated_completion_date && (
                    <div>Expected Commissioning: <span style={{ color: '#fff', fontWeight: 600 }}>{activeProject.estimated_completion_date}</span></div>
                  )}
                  {activeProject.scheduled_survey_date && (
                    <div>Survey Date & Time: <span style={{ color: 'var(--color-cyan)' }}>{activeProject.scheduled_survey_date}</span></div>
                  )}
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                  <div className="flex-between" style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <span>Milestones Completed</span>
                    <span style={{ color: 'var(--color-green)', fontWeight: 600 }}>
                      {activeProject.tasks ? Math.round((activeProject.tasks.filter((t: any) => t.status === 'completed').length / activeProject.tasks.length) * 100) : 0}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${activeProject.tasks ? Math.round((activeProject.tasks.filter((t: any) => t.status === 'completed').length / activeProject.tasks.length) * 100) : 0}%`, 
                      height: '100%', 
                      background: 'var(--color-green)', 
                      borderRadius: '4px' 
                    }} />
                  </div>
                </div>
              </div>

              {/* Assigned Engineers Roster */}
              {activeProject.assigned_engineers && activeProject.assigned_engineers.length > 0 && (
                <div className="glass-card" style={{ padding: '16px' }}>
                  <h4 style={{ fontSize: '13px', color: '#fff', marginBottom: '10px', fontWeight: 600 }}>Assigned Team</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                    {activeProject.assigned_engineers.map((eng: any) => (
                      <div key={eng.id} className="flex-between" style={{ background: 'rgba(255,255,255,0.01)', padding: '6px 8px', borderRadius: '6px' }}>
                        <span>👷 {eng.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--color-green)' }}>{eng.mobile}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Milestones List */}
              <div className="glass-card" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '13px', color: '#fff', marginBottom: '14px', fontWeight: 600 }}>Project Milestones Timeline</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', paddingLeft: '18px', borderLeft: '2px solid rgba(255,255,255,0.06)' }}>
                  {activeProject.tasks?.map((task: any, idx: number) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <div style={{ 
                        position: 'absolute', left: '-24px', top: '3px', 
                        width: '10px', height: '10px', borderRadius: '50%', 
                        background: task.status === 'completed' ? 'var(--color-green)' : 'rgba(255,255,255,0.15)',
                        border: '2px solid var(--color-bg)' 
                      }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: task.status === 'completed' ? '#fff' : 'var(--text-muted)' }}>
                        <span>{task.title}</span>
                        <span style={{ fontSize: '10px', fontWeight: 'normal', color: task.status === 'completed' ? 'var(--color-green)' : 'var(--text-muted)' }}>
                          {task.status === 'completed' ? 'Done' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Image galleries */}
              {((activeProject.site_photos && activeProject.site_photos.length > 0) || 
                (activeProject.completion_photos && activeProject.completion_photos.length > 0)) && (
                <div className="glass-card" style={{ padding: '16px' }}>
                  <h4 style={{ fontSize: '13px', color: '#fff', marginBottom: '10px', fontWeight: 600 }}>Site Gallery Uploads</h4>
                  {activeProject.site_photos && activeProject.site_photos.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Rooftop Survey Photos</span>
                      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                        {activeProject.site_photos.map((url: string, i: number) => (
                          <img key={i} src={url} alt={`Survey ${i}`} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="glass-card glow-cyan" style={{ textAlign: 'center', padding: '40px' }}>
              <Wrench size={28} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <h3 style={{ fontSize: '15px', color: '#fff', marginBottom: '6px' }}>No Active Project</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Your solar installation project tracker will activate once site calculations survey has been confirmed.</p>
            </div>
          )}
        </div>
      )}

      {/* ── SCREEN: MY TICKETS ───────────────────────────────────────────── */}
      {screen === 'tickets' && (
        <div>
          {showAddTicket ? (
            <div className="glass-card" style={{ padding: '16px' }}>
              <div className="flex-between" style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '15px', color: '#fff' }}>File Support Complaint</h3>
                <button onClick={() => setShowAddTicket(false)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={16} /></button>
              </div>

              <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Issue Parameter</label>
                  <select className="form-input" value={issueType} onChange={e => setIssueType(e.target.value)}>
                    <option value="Inverter Offline">Inverter Offline / Loss of Generation</option>
                    <option value="Physical panel damage">Physical Panel Damage / Cracks</option>
                    <option value="Cleaning maintenance">Cleaning / Dust Removal Request</option>
                    <option value="Billing / Net Metering">Billing / Net Metering Queries</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Priority Level</label>
                  <select className="form-input" value={ticketPriority} onChange={e => setTicketPriority(e.target.value)}>
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High / Emergency Priority</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Describe problem *</label>
                  <textarea className="form-input" placeholder="Give brief details..." value={ticketDesc} onChange={e => setTicketDesc(e.target.value)} style={{ minHeight: '60px' }} required />
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button type="button" onClick={handleSimulatePhoto} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <Camera size={14} /> Attach Damage Photo
                  </button>
                  {ticketPhoto && <span style={{ fontSize: '10px', color: 'var(--color-green)' }}>Photo attached!</span>}
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '6px' }} disabled={savingTicket}>
                  {savingTicket ? 'Raising Ticket...' : 'File Ticket'}
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className="flex-between" style={{ marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', color: '#fff' }}>My Tickets</h3>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Check status and file inverter complaints</p>
                </div>
                <button onClick={() => setShowAddTicket(true)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '11px' }}>+ Raise Ticket</button>
              </div>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[1, 2].map(i => (
                    <div key={i} style={{ height: '80px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s infinite' }} />
                  ))}
                </div>
              ) : tickets.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {tickets.map(t => (
                    <div key={t.id} className="glass-card" style={{ padding: '14px', marginBottom: 0 }}>
                      <div className="flex-between" style={{ marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{t.issue_type}</span>
                        <span className={`badge ${t.status === 'resolved' ? 'badge-success' : 'badge-warning'}`}>{t.status}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: '1.4' }}>{t.description}</p>
                      
                      <div className="flex-between" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px', fontSize: '10px' }}>
                        <span style={{ color: t.priority === 'high' ? '#f87171' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{t.priority} Priority</span>
                        {t.status !== 'resolved' && (
                          <button onClick={() => handleCloseTicket(t.id)} className="btn" style={{ padding: '2px 8px', fontSize: '10px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-green)' }}>
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card" style={{ textAlign: 'center', padding: '30px' }}>No active support tickets raised.</div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── SCREEN: DOCUMENTS ────────────────────────────────────────────── */}
      {screen === 'docs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { name: 'Quotation Proposal.pdf', desc: 'Estimations system proposal', size: '1.2 MB' },
            { name: 'Tax Invoice Receipt.pdf', desc: 'Installation cost billing invoice', size: '2.4 MB' },
            { name: 'Warranty Certification.pdf', desc: '25 Years panels performance warranty', size: '920 KB' },
            { name: 'Commissioning Certificate.pdf', desc: 'Grid syncing clearance clearance sign-off', size: '640 KB' },
          ].map((doc, idx) => (
            <div key={idx} className="glass-card flex-between" style={{ padding: '14px', marginBottom: 0 }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff', display: 'block' }}>{doc.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{doc.desc} • {doc.size}</span>
              </div>
              <button onClick={() => handleDownloadDoc(doc.name)} className="modal-close" style={{ width: '32px', height: '32px', color: 'var(--color-cyan)' }}>
                <Download size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── SCREEN: NOTIFICATIONS ────────────────────────────────────────── */}
      {screen === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { title: 'Site visit confirmed', desc: 'Engineer Sanjay Patel is arriving today at 3 PM.', time: '1h ago', category: 'update' },
            { title: 'Subsidy approval complete', desc: 'Rooftop solar document validation approved.', time: '1d ago', category: 'update' },
            { title: 'Inverter cleaning alert', desc: 'Service recommendation: panels dust cleaning recommended.', time: '3d ago', category: 'reminder' },
            { title: 'Referral Promo Active', desc: 'Refer a neighbor and earn ₹5,000 cash rewards!', time: '1w ago', category: 'offer' },
          ].map((notif, idx) => (
            <div key={idx} className="glass-card" style={{ padding: '14px', marginBottom: 0 }}>
              <div className="flex-between" style={{ marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{notif.title}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{notif.time}</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{notif.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── SCREEN: PORTAL SETTINGS ─────────────────────────────────────── */}
      {screen === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Toggles */}
          <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="flex-between">
              <span style={{ fontSize: '13px', color: '#fff', display: 'flex', gap: '8px', alignItems: 'center' }}><Moon size={15} /> Dark Theme Toggler</span>
              <input type="checkbox" checked={darkMode} onChange={e => setDarkMode(e.target.checked)} />
            </div>
            <div className="flex-between">
              <span style={{ fontSize: '13px', color: '#fff', display: 'flex', gap: '8px', alignItems: 'center' }}><Bell size={15} /> Operational Notifications</span>
              <input type="checkbox" checked={alerts} onChange={e => setAlerts(e.target.checked)} />
            </div>
            <div className="flex-between">
              <span style={{ fontSize: '13px', color: '#fff', display: 'flex', gap: '8px', alignItems: 'center' }}><Globe size={15} /> Language Settings</span>
              <select value={language} onChange={e => setLanguage(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', padding: '4px', fontSize: '11px' }}>
                <option value="English">English</option>
                <option value="Hindi">Hindi / हिन्दी</option>
                <option value="Gujarati">Gujarati / ગુજરાતી</option>
              </select>
            </div>
          </div>

          {/* Legal / Policy */}
          <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}><Shield size={15} /> Privacy & Legal Terms</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              <a href="#" style={{ color: 'var(--color-cyan)', textDecoration: 'none' }}>Privacy Policy terms</a>
              <a href="#" style={{ color: 'var(--color-cyan)', textDecoration: 'none' }}>Consumer System licensing guidelines</a>
              <a href="#" style={{ color: 'var(--color-cyan)', textDecoration: 'none' }}>AKV Energy warranties details</a>
            </div>
          </div>

          {/* About */}
          <div className="glass-card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Info size={18} color="var(--color-green)" style={{ marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>About AKV Energy</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                AKV Energy is one of India's leading smart solar system installers, optimizing rooftop generation efficiency with clean GI framework setups and Net Metering integrations.
              </p>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>Version 3.0.4 • Stable Distribution</span>
            </div>
          </div>
        </div>
      )}

      {/* ── SCREEN: MY INVOICES ──────────────────────────────────────────── */}
      {screen === 'invoices' && (
        <div>
          {selectedInvoice ? (
            // Invoice Detail View
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <button
                onClick={() => { setSelectedInvoice(null); setInvoicePayments([]); setShowInvPdfPreview(false); setShowReceiptPreview(null); }}
                className="btn btn-secondary"
                style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '6px 12px', fontSize: '12px', width: 'fit-content' }}
              >
                <ArrowLeft size={14} /> Back to Invoices
              </button>

              {/* Invoice summary card */}
              <div className="glass-card glow-cyan" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '16px', color: '#fff', fontWeight: 700 }}>{selectedInvoice.invoice_num}</h3>
                  <span className={`badge ${selectedInvoice.status === 'paid' ? 'badge-success' : selectedInvoice.status === 'cancelled' ? 'badge-secondary' : 'badge-warning'}`}
                    style={selectedInvoice.status === 'cancelled' ? { background: 'rgba(239,68,68,0.1)', color: '#ef4444' } : {}}>
                    {selectedInvoice.status === 'partially_paid' ? 'Partial' : selectedInvoice.status}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Invoice Date: <span style={{ color: '#fff' }}>{selectedInvoice.created_at?.split(' ')[0]}</span>
                </div>
                {selectedInvoice.due_date && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Due Date: <span style={{ color: selectedInvoice.status !== 'paid' ? '#f87171' : '#fff' }}>{selectedInvoice.due_date}</span>
                  </div>
                )}

                {/* Balance summary grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Grand Total</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>₹{Number(selectedInvoice.grand_total).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Paid</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-green)' }}>₹{Number(selectedInvoice.paid_amount).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Balance</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: selectedInvoice.status === 'paid' ? 'var(--color-green)' : '#f87171' }}>
                      ₹{(Number(selectedInvoice.grand_total) - Number(selectedInvoice.paid_amount)).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* GST/Discount breakdown */}
                <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                    <span style={{ color: '#fff' }}>₹{Number(selectedInvoice.subtotal || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Discount</span>
                    <span style={{ color: '#f87171' }}>-₹{Number(selectedInvoice.discount || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>GST (18%)</span>
                    <span style={{ color: '#fff' }}>₹{Number(selectedInvoice.gst || 0).toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowInvPdfPreview(true)}
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '14px', display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', padding: '8px', fontSize: '12px' }}
                >
                  <FileText size={14} /> View PDF Invoice
                </button>
              </div>

              {/* Payment History */}
              <div className="glass-card" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '13px', color: '#fff', fontWeight: 600, marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Receipt size={15} color="var(--color-green)" /> Payment History
                </h4>

                {loading ? (
                  <div style={{ height: '60px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
                ) : invoicePayments.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {invoicePayments.map((p: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-green)' }}>₹{Number(p.amount).toLocaleString()}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.method?.toUpperCase()} • {p.pay_date?.split(' ')[0]}</div>
                          {p.txn_id && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Ref: {p.txn_id}</div>}
                        </div>
                        <button
                          onClick={() => setShowReceiptPreview(p)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '10px', display: 'flex', gap: '4px', alignItems: 'center' }}
                        >
                          <Download size={11} /> Receipt
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '16px' }}>
                    No payment transactions recorded yet.
                  </div>
                )}
              </div>

              {/* Outstanding balance notice */}
              {selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'cancelled' && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', color: '#fbbf24', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>You have an outstanding balance of <strong>₹{(Number(selectedInvoice.grand_total) - Number(selectedInvoice.paid_amount)).toLocaleString()}</strong>. Please contact AKV Energy to make payment.</span>
                </div>
              )}

              {/* ── INVOICE PDF PREVIEW OVERLAY ── */}
              {showInvPdfPreview && (
                <div className="modal-overlay">
                  <div className="modal-content animate-slide" style={{ maxHeight: '90%', padding: '20px', overflowY: 'auto' }}>
                    <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Tax Invoice Preview</span>
                      <button onClick={() => setShowInvPdfPreview(false)} className="modal-close" style={{ width: '30px', height: '30px' }}><X size={14} /></button>
                    </div>
                    <div style={{ background: '#fff', color: '#0f172a', padding: '20px', borderRadius: '8px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '14px' }}>
                        <div>
                          <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>AKV ENERGY SOLAR</h2>
                          <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#475569' }}>Ahmedabad, Gujarat • support@akvenergy.com • GSTIN: 24XXXXX</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>TAX INVOICE</div>
                          <div>{selectedInvoice.invoice_num}</div>
                          <div style={{ fontSize: '10px', color: '#475569' }}>{selectedInvoice.created_at?.split(' ')[0]}</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '14px' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}>Bill To</div>
                          <div style={{ fontWeight: 'bold' }}>{selectedInvoice.customer_name}</div>
                          <div>{selectedInvoice.customer_phone}</div>
                        </div>
                        {selectedInvoice.quotation_number && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}>Quotation Ref</div>
                            <div>{selectedInvoice.quotation_number}</div>
                            {selectedInvoice.due_date && <div style={{ marginTop: '4px' }}>Due: {selectedInvoice.due_date}</div>}
                          </div>
                        )}
                      </div>
                      <div style={{ width: '100%', borderCollapse: 'collapse', display: 'table', marginBottom: '14px', fontSize: '10px' }}>
                        <div style={{ display: 'table-row', fontWeight: 'bold', borderBottom: '1px solid #0f172a' }}>
                          <div style={{ display: 'table-cell', padding: '6px 4px' }}>Description</div>
                          <div style={{ display: 'table-cell', padding: '6px 4px', textAlign: 'right' }}>Amount</div>
                        </div>
                        <div style={{ display: 'table-row' }}>
                          <div style={{ display: 'table-cell', padding: '6px 4px' }}>Solar System Installation (as per quotation)</div>
                          <div style={{ display: 'table-cell', padding: '6px 4px', textAlign: 'right' }}>₹{Number(selectedInvoice.subtotal || 0).toLocaleString()}</div>
                        </div>
                        <div style={{ display: 'table-row', color: '#16a34a' }}>
                          <div style={{ display: 'table-cell', padding: '6px 4px' }}>Discount</div>
                          <div style={{ display: 'table-cell', padding: '6px 4px', textAlign: 'right' }}>-₹{Number(selectedInvoice.discount || 0).toLocaleString()}</div>
                        </div>
                        <div style={{ display: 'table-row' }}>
                          <div style={{ display: 'table-cell', padding: '6px 4px' }}>GST @ 18%</div>
                          <div style={{ display: 'table-cell', padding: '6px 4px', textAlign: 'right' }}>₹{Number(selectedInvoice.gst || 0).toLocaleString()}</div>
                        </div>
                        <div style={{ display: 'table-row', fontWeight: 'bold', borderTop: '1px solid #0f172a', fontSize: '12px' }}>
                          <div style={{ display: 'table-cell', padding: '6px 4px' }}>Grand Total</div>
                          <div style={{ display: 'table-cell', padding: '6px 4px', textAlign: 'right' }}>₹{Number(selectedInvoice.grand_total).toLocaleString()}</div>
                        </div>
                        <div style={{ display: 'table-row', color: '#16a34a', fontWeight: 'bold' }}>
                          <div style={{ display: 'table-cell', padding: '6px 4px' }}>Amount Paid</div>
                          <div style={{ display: 'table-cell', padding: '6px 4px', textAlign: 'right' }}>₹{Number(selectedInvoice.paid_amount).toLocaleString()}</div>
                        </div>
                        <div style={{ display: 'table-row', fontWeight: 'bold', borderTop: '2px solid #0f172a', fontSize: '13px' }}>
                          <div style={{ display: 'table-cell', padding: '8px 4px' }}>Balance Due</div>
                          <div style={{ display: 'table-cell', padding: '8px 4px', textAlign: 'right' }}>₹{(Number(selectedInvoice.grand_total) - Number(selectedInvoice.paid_amount)).toLocaleString()}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px', borderTop: '1px dashed #cbd5e1', paddingTop: '20px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ height: '30px', fontStyle: 'italic', color: '#475569', fontWeight: 'bold' }}>AKV Energy</div>
                          <div style={{ width: '120px', borderTop: '1px solid #0f172a', paddingTop: '4px', fontSize: '10px' }}>Authorised Signatory</div>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => showToast('Invoice PDF download started!', 'success')} className="btn btn-primary" style={{ width: '100%', marginTop: '16px', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                      <Download size={14} /> Download PDF Invoice
                    </button>
                  </div>
                </div>
              )}

              {/* ── RECEIPT PREVIEW OVERLAY ── */}
              {showReceiptPreview && (
                <div className="modal-overlay">
                  <div className="modal-content animate-slide" style={{ maxHeight: '80%', padding: '20px' }}>
                    <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Payment Receipt</span>
                      <button onClick={() => setShowReceiptPreview(null)} className="modal-close" style={{ width: '30px', height: '30px' }}><X size={14} /></button>
                    </div>
                    <div style={{ background: '#fff', color: '#0f172a', padding: '20px', borderRadius: '8px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '14px' }}>
                        <div>
                          <h2 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>AKV ENERGY SOLAR</h2>
                          <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#475569' }}>Official Payment Receipt</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold' }}>RECEIPT</div>
                          <div style={{ fontSize: '10px' }}>REC-{showReceiptPreview.id}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Customer:</span>
                          <span style={{ fontWeight: 'bold' }}>{selectedInvoice.customer_name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Invoice Ref:</span>
                          <span>{selectedInvoice.invoice_num}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Payment Method:</span>
                          <span>{showReceiptPreview.method?.toUpperCase()}</span>
                        </div>
                        {showReceiptPreview.txn_id && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Transaction ID:</span>
                            <span>{showReceiptPreview.txn_id}</span>
                          </div>
                        )}
                        {showReceiptPreview.ref_num && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Reference No:</span>
                            <span>{showReceiptPreview.ref_num}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Payment Date:</span>
                          <span>{showReceiptPreview.pay_date?.split(' ')[0]}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '8px 0', marginTop: '6px', fontSize: '14px', fontWeight: 'bold', color: '#16a34a' }}>
                          <span>Amount Received:</span>
                          <span>₹{Number(showReceiptPreview.amount).toLocaleString()}</span>
                        </div>
                        {showReceiptPreview.remarks && (
                          <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>{showReceiptPreview.remarks}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px dashed #cbd5e1', paddingTop: '20px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ height: '25px', fontStyle: 'italic', color: '#475569', fontWeight: 'bold' }}>AKV Energy</div>
                          <div style={{ width: '120px', borderTop: '1px solid #0f172a', paddingTop: '4px', fontSize: '10px' }}>Authorised Stamp</div>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => showToast('Receipt PDF download started!', 'success')} className="btn btn-primary" style={{ width: '100%', marginTop: '16px', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                      <Download size={14} /> Download Receipt PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Invoice List View
            <>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '4px' }}>My Invoices</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>View billing history and download payment receipts</p>
              </div>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[1, 2].map(i => (
                    <div key={i} style={{ height: '80px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s infinite' }} />
                  ))}
                </div>
              ) : invoices.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {invoices.map((inv: any) => (
                    <div key={inv.id} className="glass-card" style={{ padding: '14px', marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-cyan)' }}>{inv.invoice_num}</span>
                        <span className={`badge ${inv.status === 'paid' ? 'badge-success' : inv.status === 'cancelled' ? 'badge-secondary' : 'badge-warning'}`}
                          style={inv.status === 'cancelled' ? { background: 'rgba(239,68,68,0.1)', color: '#ef4444' } : {}}>
                          {inv.status === 'partially_paid' ? 'Partial' : inv.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '10px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Total: <strong style={{ color: '#fff' }}>₹{Number(inv.grand_total).toLocaleString()}</strong></span>
                        <span style={{ color: 'var(--text-muted)' }}>Paid: <strong style={{ color: 'var(--color-green)' }}>₹{Number(inv.paid_amount).toLocaleString()}</strong></span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '10px' }}>{inv.created_at?.split(' ')[0]}</div>
                      <button
                        onClick={() => viewInvoiceDetails(inv.id)}
                        className="btn btn-secondary"
                        style={{ width: '100%', padding: '6px', fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <FileText size={12} /> View Invoice Details
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card glow-cyan" style={{ textAlign: 'center', padding: '40px' }}>
                  <CreditCard size={28} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
                  <h3 style={{ fontSize: '15px', color: '#fff', marginBottom: '6px' }}>No Invoices Yet</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Your invoices will appear here once AKV Energy generates them.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── SCREEN: MY DOCUMENTS ─────────────────────────────────────────── */}
      {screen === 'docs' && (
        <div>
          {/* Header */}
          <div className="flex-between" style={{ marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '17px', color: '#fff', marginBottom: '2px' }}>My Documents</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Upload and track your verification status</p>
            </div>
            <button
              onClick={() => { setShowDocUpload(v => !v); setUploadFile(null); }}
              className="btn btn-primary"
              style={{ padding: '7px 12px', fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'center' }}
            >
              <Download size={12} style={{ transform: 'rotate(180deg)' }} />
              {showDocUpload ? 'Cancel' : 'Upload'}
            </button>
          </div>

          {/* Upload form */}
          {showDocUpload && (
            <form onSubmit={handleDocUpload} className="glass-card glow-cyan" style={{ padding: '16px', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '13px', color: '#fff', marginBottom: '12px', fontWeight: 700 }}>Upload New Document</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Document Type</label>
                  <select className="form-input" value={uploadDocType} onChange={e => setUploadDocType(e.target.value)} style={{ fontSize: '12px' }}>
                    {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    File (PDF, JPG, PNG, WEBP — max 20 MB)
                  </label>
                  <div
                    style={{
                      border: '2px dashed rgba(255,255,255,0.12)', borderRadius: '10px',
                      padding: '16px', textAlign: 'center', cursor: 'pointer',
                      background: uploadFile ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)'
                    }}
                    onClick={() => docFileRef.current?.click()}
                  >
                    {uploadFile ? (
                      <>
                        <CheckCircle2 size={18} color="var(--color-green)" style={{ margin: '0 auto 4px', display: 'block' }} />
                        <div style={{ fontSize: '11px', color: '#fff' }}>{uploadFile.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</div>
                      </>
                    ) : (
                      <>
                        <FileText size={18} color="var(--text-muted)" style={{ margin: '0 auto 4px', display: 'block' }} />
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tap to browse</div>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={docFileRef}
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    style={{ display: 'none' }}
                    onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                {uploading && (
                  <div style={{ borderRadius: '4px', background: 'rgba(255,255,255,0.06)', height: '5px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'linear-gradient(90deg, var(--color-cyan), var(--color-green))', transition: 'width 0.3s', borderRadius: '4px' }} />
                  </div>
                )}
                <button type="submit" className="btn btn-primary" disabled={uploading} style={{ fontSize: '12px' }}>
                  {uploading ? `Uploading... ${uploadProgress}%` : 'Submit Document'}
                </button>
              </div>
            </form>
          )}

          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <select
              className="form-input"
              value={docTypeFilter}
              onChange={e => { setDocTypeFilter(e.target.value); }}
              style={{ fontSize: '11px', height: '34px' }}
            >
              <option value="">All Types</option>
              {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select
              className="form-input"
              value={docStatusFilter}
              onChange={e => { setDocStatusFilter(e.target.value); }}
              style={{ fontSize: '11px', height: '34px' }}
            >
              <option value="">All Statuses</option>
              <option value="uploaded">Uploaded</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* List */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: '72px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : myDocs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myDocs.map((doc: any) => (
                <div key={doc.id} className="glass-card" style={{ padding: '12px', marginBottom: 0 }}>
                  <div className="flex-between" style={{ marginBottom: '5px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                      {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                    </span>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', textTransform: 'uppercase',
                      background: `${DOC_STATUS_COLOR[doc.status] ?? '#64748b'}22`,
                      color: DOC_STATUS_COLOR[doc.status] ?? '#64748b',
                      border: `1px solid ${DOC_STATUS_COLOR[doc.status] ?? '#64748b'}44`,
                    }}>{doc.status}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: doc.notes ? '6px' : '8px' }}>
                    {doc.file_name} • {doc.uploaded_at?.split(' ')[0]}
                  </div>
                  {doc.notes && (
                    <div style={{ fontSize: '10px', color: doc.status === 'rejected' ? '#f87171' : 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '5px 8px', borderRadius: '6px', marginBottom: '8px' }}>
                      📋 {doc.notes}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => {
                        const fileUrl = getFullFileUrl(doc.file_url);
                        if (fileUrl) {
                          window.open(fileUrl, '_blank');
                        } else {
                          showToast('Invalid file URL.', 'error');
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '10px', display: 'flex', gap: '3px', alignItems: 'center' }}
                    >
                      <Download size={10} /> Download / View
                    </button>
                    {doc.status !== 'verified' && (
                      <button
                        onClick={async () => {
                          const res = await apiFetch(`delete_document&id=${doc.id}`, { method: 'DELETE' });
                          if (res.ok) { showToast('Document removed.', 'success'); fetchMyDocs(); }
                          else showToast(res.error || 'Failed to delete.', 'error');
                        }}
                        className="btn"
                        style={{ padding: '3px 8px', fontSize: '10px', display: 'flex', gap: '3px', alignItems: 'center', background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
                      >
                        <X size={10} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
              <FileText size={28} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <h3 style={{ fontSize: '14px', color: '#fff', marginBottom: '6px' }}>No Documents Yet</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Upload your KYC and property documents using the button above.</p>
            </div>
          )}
        </div>
      )}

      {/* ── SNACKBAR TOAST ──────────────────────────────────────────────── */}
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
