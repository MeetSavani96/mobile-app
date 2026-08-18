import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Plus, CheckCircle2, AlertCircle, X, FileText, DollarSign
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { Modal } from '../components/ui';

interface AdminInvoicesProps {
  onBack: () => void;
}

interface Quote {
  id: number;
  quotation_number: string;
  customer_name: string;
  grand_total: number;
  status: string;
}

interface Payment {
  id: number;
  amount: number;
  method: string;
  txn_id: string | null;
  ref_num: string | null;
  pay_date: string;
  remarks: string | null;
}

interface Invoice {
  id: number;
  quote_id: number | null;
  customer_id: number;
  invoice_num: string;
  subtotal: number;
  discount: number;
  gst: number;
  grand_total: number;
  paid_amount: number;
  status: string;
  due_date: string | null;
  created_at: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  quotation_number?: string;
  items?: {
    id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    price: number;
  }[];
  payments?: Payment[];
}

export const AdminInvoicesView: React.FC<AdminInvoicesProps> = ({ onBack }) => {
  const [screen, setScreen] = useState<'list' | 'form' | 'detail'>('list');
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Dropdowns lists
  const [acceptedQuotes, setAcceptedQuotes] = useState<Quote[]>([]);

  // Selected details
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Form states (Generate Invoice)
  const [formQuoteId, setFormQuoteId] = useState(0);
  const [formDueDate, setFormDueDate] = useState('');
  const [formStatus, setFormStatus] = useState('generated');
  const [saving, setSaving] = useState(false);

  // Form states (Record Payment)
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'card'>('cash');
  const [payTxnId, setPayTxnId] = useState('');
  const [payRefNum, setPayRefNum] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Preview overlay Modals
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState<Payment | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch Invoices
  const fetchInvoices = async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (search.trim()) q.set('search', search.trim());
    if (statusFilter) q.set('status', statusFilter);

    const res = await apiFetch(`get_invoices&${q.toString()}`);
    if (res.ok && res.data) {
      setInvoices(res.data.data || []);
    }
    setLoading(false);
  };

  // Fetch Accepted Proposals dropdown
  const loadAcceptedQuotes = async () => {
    const res = await apiFetch('get_quotations');
    if (res.ok && Array.isArray(res.data?.data)) {
      // Show quotes that are accepted and don't have invoices yet
      setAcceptedQuotes(res.data.data.filter((q: any) => q.status === 'accepted'));
    }
  };

  useEffect(() => {
    fetchInvoices();
    loadAcceptedQuotes();
  }, [search, statusFilter]);

  // View Invoice detail
  const viewDetails = async (id: number) => {
    setLoading(true);
    const res = await apiFetch(`get_invoices&id=${id}`);
    if (res.ok && res.data?.data) {
      setSelectedInvoice(res.data.data);
      setSelectedId(id);
      setScreen('detail');
    } else {
      showToast(res.error || 'Failed to load details.', 'error');
    }
    setLoading(false);
  };

  // Generate Invoice Submit
  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formQuoteId <= 0) {
      showToast('Please select a quotation profile.', 'error');
      return;
    }
    setSaving(true);

    const res = await apiFetch('create_invoice', {
      method: 'POST',
      body: JSON.stringify({
        quote_id: formQuoteId,
        due_date: formDueDate,
        status: formStatus
      })
    });

    if (res.ok) {
      showToast('Invoice generated successfully!', 'success');
      setScreen('list');
      fetchInvoices();
    } else {
      showToast(res.error || 'Failed to generate invoice.', 'error');
    }
    setSaving(false);
  };

  // Record Payment Submit
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0 || !selectedId) {
      showToast('Please enter a valid amount.', 'error');
      return;
    }
    setRecordingPayment(true);

    const res = await apiFetch('create_payment', {
      method: 'POST',
      body: JSON.stringify({
        invoice_id: selectedId,
        amount: payAmount,
        method: payMethod,
        txn_id: payTxnId,
        ref_num: payRefNum,
        remarks: payRemarks
      })
    });

    if (res.ok) {
      showToast('Payment transaction recorded successfully!', 'success');
      setShowPaymentForm(false);
      setPayAmount(0);
      setPayTxnId('');
      setPayRefNum('');
      setPayRemarks('');
      viewDetails(selectedId);
    } else {
      showToast(res.error || 'Failed to record payment.', 'error');
    }
    setRecordingPayment(false);
  };

  // Cancel Invoice status update
  const handleCancelInvoice = async (id: number) => {
    setLoading(true);
    const res = await apiFetch('update_invoice', {
      method: 'PUT',
      body: JSON.stringify({
        id,
        status: 'cancelled'
      })
    });
    if (res.ok) {
      showToast('Invoice cancelled successfully.', 'success');
      setShowCancelConfirm(null);
      viewDetails(id);
    } else {
      showToast(res.error || 'Failed to cancel invoice.', 'error');
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="badge badge-success">Paid</span>;
      case 'partially_paid':
        return <span className="badge badge-warning" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--color-amber)' }}>Partial</span>;
      case 'cancelled':
        return <span className="badge badge-secondary" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Cancelled</span>;
      case 'overdue':
        return <span className="badge badge-secondary" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Overdue</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
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
          <button onClick={() => {
            setFormQuoteId(acceptedQuotes[0]?.id || 0);
            setFormDueDate('');
            setFormStatus('generated');
            setScreen('form');
          }} className="btn btn-primary" style={{ padding: '8px 12px', fontSize: '12px' }}>
            <Plus size={14} /> Generate Invoice
          </button>
        )}
      </div>

      {/* ── LIST VIEW SCREEN ──────────────────────────────────────────────── */}
      {screen === 'list' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '16px' }}>
            <input
              type="search"
              className="form-input"
              placeholder="Search invoice number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: '13px', height: '36px' }}
            />
            <select
              className="form-input"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ fontSize: '12px', height: '36px' }}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="generated">Generated</option>
              <option value="sent">Sent</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: '80px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : invoices.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {invoices.map(inv => (
                <div key={inv.id} className="glass-card hover-glow" style={{ padding: '14px', marginBottom: 0 }}>
                  <div className="flex-between" style={{ marginBottom: '6px' }}>
                    <span onClick={() => viewDetails(inv.id)} style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-cyan)', cursor: 'pointer' }}>
                      {inv.invoice_num}
                    </span>
                    {getStatusBadge(inv.status)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Customer: <span style={{ color: '#fff' }}>{inv.customer_name}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span>Total Amount: <span style={{ color: '#fff', fontWeight: 600 }}>${Number(inv.grand_total).toLocaleString()}</span></span>
                    <span>Paid: <span style={{ color: 'var(--color-green)', fontWeight: 600 }}>${Number(inv.paid_amount).toLocaleString()}</span></span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px', marginTop: '10px' }}>
                    <button onClick={() => viewDetails(inv.id)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '10px' }}>View Details</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card glow-cyan" style={{ textAlign: 'center', padding: '40px' }}>
              <FileText size={28} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: '13px', color: '#fff' }}>No invoice records generated.</p>
            </div>
          )}
        </>
      )}

      {/* ── FORM SCREEN (GENERATE INVOICE) ────────────────────────────────── */}
      {screen === 'form' && (
        <form onSubmit={handleGenerateInvoice} className="glass-card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '16px' }}>Generate Invoice from Proposal</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Select Accepted Proposal *</label>
              <select className="form-input" value={formQuoteId} onChange={e => setFormQuoteId(Number(e.target.value))} required>
                <option value="0">Select Accepted Quotation</option>
                {acceptedQuotes.map(q => (
                  <option key={q.id} value={q.id}>{q.quotation_number} • {q.customer_name} (${Number(q.grand_total).toLocaleString()})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Invoice Due Date</label>
              <input type="date" className="form-input" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Invoice Status</label>
              <select className="form-input" value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="generated">Generated</option>
                <option value="sent">Sent</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }} disabled={saving}>
              {saving ? 'Generating...' : 'Compile Invoice'}
            </button>
          </div>
        </form>
      )}

      {/* ── DETAIL VIEW SCREEN ────────────────────────────────────────────── */}
      {screen === 'detail' && selectedInvoice && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Main Info */}
          <div className="glass-card glow-cyan" style={{ padding: '16px' }}>
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <h3 style={{ fontSize: '16px', color: '#fff' }}>{selectedInvoice.invoice_num}</h3>
              {getStatusBadge(selectedInvoice.status)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <div>Customer: <span style={{ color: '#fff' }}>{selectedInvoice.customer_name}</span></div>
              {selectedInvoice.due_date && <div>Due Date: <span style={{ color: '#fff' }}>{selectedInvoice.due_date}</span></div>}
              {selectedInvoice.quotation_number && <div>Quote Reference: <span style={{ color: 'var(--color-green)' }}>{selectedInvoice.quotation_number}</span></div>}
            </div>

            {/* Balances summary indicators */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Bills</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>${Number(selectedInvoice.grand_total).toLocaleString()}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Paid</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-green)' }}>${Number(selectedInvoice.paid_amount).toLocaleString()}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Balance Due</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#f87171' }}>
                  ${(Number(selectedInvoice.grand_total) - Number(selectedInvoice.paid_amount)).toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
              <button onClick={() => setShowPdfPreview(true)} className="btn btn-secondary" style={{ padding: '6px 8px', fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={12} /> Invoice PDF
              </button>
              {selectedInvoice.status !== 'cancelled' && (
                <button onClick={() => setShowPaymentForm(true)} className="btn btn-primary" style={{ padding: '6px 8px', fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={12} /> Record Payment
                </button>
              )}
            </div>
            {selectedInvoice.status !== 'cancelled' && (
              <button onClick={() => setShowCancelConfirm(selectedInvoice.id)} className="btn btn-secondary" style={{ width: '100%', marginTop: '8px', padding: '6px', fontSize: '11px', color: '#ef4444' }}>
                Cancel Invoice
              </button>
            )}
          </div>

          {/* Payment form modal overlay */}
          {showPaymentForm && (
            <div className="modal-overlay">
              <form onSubmit={handleRecordPayment} className="modal-content animate-slide" style={{ maxHeight: '85%', overflowY: 'auto' }}>
                <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '15px', color: '#fff' }}>Record Payment Entry</h3>
                  <button type="button" onClick={() => setShowPaymentForm(false)} className="modal-close"><X size={14} /></button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Payment Method *</label>
                    <select className="form-input" value={payMethod} onChange={e => setPayMethod(e.target.value as any)} style={{ fontSize: '12px' }}>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="card">Debit/Credit Card</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Amount to Record ($) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={payAmount || ''}
                      onChange={e => setPayAmount(Number(e.target.value))}
                      required
                      style={{ fontSize: '12px' }}
                      max={Number(selectedInvoice.grand_total) - Number(selectedInvoice.paid_amount)}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Outstanding limit: ${(Number(selectedInvoice.grand_total) - Number(selectedInvoice.paid_amount)).toLocaleString()}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Transaction ID</label>
                      <input type="text" className="form-input" value={payTxnId} onChange={e => setPayTxnId(e.target.value)} style={{ fontSize: '12px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Ref Number</label>
                      <input type="text" className="form-input" value={payRefNum} onChange={e => setPayRefNum(e.target.value)} style={{ fontSize: '12px' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Remarks / Memo</label>
                    <textarea className="form-input" value={payRemarks} onChange={e => setPayRemarks(e.target.value)} style={{ fontSize: '12px', minHeight: '40px' }} />
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={recordingPayment}>
                    {recordingPayment ? 'Recording...' : 'Register Payment'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Payments History List */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '13px', color: '#fff', marginBottom: '12px', fontWeight: 600 }}>Payment Receipt Logs</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 ? (
                selectedInvoice.payments.map((p, idx) => (
                  <div key={idx} className="flex-between" style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#fff', fontWeight: 500 }}>${Number(p.amount).toLocaleString()}</div>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{p.method.toUpperCase()} • {p.pay_date.split(' ')[0]}</span>
                    </div>
                    <button onClick={() => setShowReceiptPreview(p)} className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '9px' }}>
                      Receipt
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No transactions recorded yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CANCEL INVOICE MODAL ─────────────────────────────────────────── */}
      {showCancelConfirm && (
        <Modal
          isOpen={!!showCancelConfirm}
          onClose={() => setShowCancelConfirm(null)}
          title="Cancel Tax Invoice?"
          footer={
            <div className="grid-2" style={{ gap: '8px' }}>
              <button onClick={() => setShowCancelConfirm(null)} className="btn btn-secondary">Go Back</button>
              <button onClick={() => handleCancelInvoice(showCancelConfirm)} className="btn btn-danger">Confirm</button>
            </div>
          }
        >
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>This action is permanent and sets status to Cancelled.</p>
        </Modal>
      )}

      {/* ── INVOICE PDF PREVIEW OVERLAY ────────────────────────────────────── */}
      {showPdfPreview && selectedInvoice && (
        <Modal
          isOpen={showPdfPreview}
          onClose={() => setShowPdfPreview(false)}
          title="Physical PDF Invoice Render"
          footer={
            <button onClick={() => showToast('Invoice PDF downloaded successfully.', 'success')} className="btn btn-primary" style={{ width: '100%' }}>
              Download PDF Copy
            </button>
          }
        >
          <div style={{ background: '#fff', color: '#0f172a', padding: '20px', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
            <div className="flex-between" style={{ borderBottom: '2px solid #0f172a', paddingBottom: '10px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>AKV ENERGY SOLAR</h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: '#475569' }}>Ahmedabad, Gujarat • support@akvenergy.com</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: 0 }}>TAX INVOICE</h3>
                <p style={{ margin: '2px 0 0 0' }}>{selectedInvoice.invoice_num}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '14px 0', fontSize: '10px' }}>
              <div>
                <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Client details</span>
                <strong>{selectedInvoice.customer_name}</strong>
                <div>{selectedInvoice.customer_phone}</div>
                <div>{selectedInvoice.customer_address || 'Gujarat, India'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Invoice Date</span>
                <div>{selectedInvoice.created_at.split(' ')[0]}</div>
                <div style={{ marginTop: '4px', fontWeight: 'bold' }}>Due Limit: {selectedInvoice.due_date || '—'}</div>
              </div>
            </div>

            {/* Items details */}
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0', fontSize: '10px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #0f172a' }}>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Item Specification</th>
                  <th style={{ textAlign: 'center', padding: '6px' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Price</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                  selectedInvoice.items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px' }}>{it.product_name}</td>
                      <td style={{ textAlign: 'center', padding: '6px' }}>{it.quantity}</td>
                      <td style={{ textAlign: 'right', padding: '6px' }}>${Number(it.price).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', padding: '6px' }}>${(it.quantity * it.price).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ padding: '6px', textAlign: 'center' }}>Direct solar kit system installation quotation references</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Calculations Box */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
                <div className="flex-between"><span>Subtotal:</span><span>${Number(selectedInvoice.subtotal).toLocaleString()}</span></div>
                <div className="flex-between"><span>Discount:</span><span>-${Number(selectedInvoice.discount).toLocaleString()}</span></div>
                <div className="flex-between"><span>GST Taxes (18%):</span><span>${Number(selectedInvoice.gst).toLocaleString()}</span></div>
                <div className="flex-between" style={{ borderTop: '1px solid #0f172a', paddingTop: '4px' }}>
                  <span>Grand Total:</span><span>${Number(selectedInvoice.grand_total).toLocaleString()}</span>
                </div>
                <div className="flex-between" style={{ fontWeight: 'bold', fontSize: '11px', color: '#16a34a' }}>
                  <span>Amount Paid:</span><span>${Number(selectedInvoice.paid_amount).toLocaleString()}</span>
                </div>
                <div className="flex-between" style={{ borderTop: '2px solid #0f172a', paddingTop: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                  <span>Balance Due:</span><span>${(Number(selectedInvoice.grand_total) - Number(selectedInvoice.paid_amount)).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', borderTop: '1px dashed #cbd5e1', paddingTop: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ height: '30px' }} />
                <div style={{ width: '120px', borderTop: '1px solid #0f172a' }}>Client Sign</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ height: '30px', fontStyle: 'italic', fontWeight: 'bold', color: '#475569' }}>AKV Energy</div>
                <div style={{ width: '120px', borderTop: '1px solid #0f172a' }}>Authorized Sign</div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── RECEIPT PDF PREVIEW OVERLAY ────────────────────────────────────── */}
      {showReceiptPreview && selectedInvoice && (
        <Modal
          isOpen={!!showReceiptPreview}
          onClose={() => setShowReceiptPreview(null)}
          title="Official Payment Receipt Preview"
          footer={
            <button onClick={() => showToast('Official receipt PDF downloaded successfully.', 'success')} className="btn btn-primary" style={{ width: '100%' }}>
              Download PDF Receipt
            </button>
          }
        >
          <div style={{ background: '#fff', color: '#0f172a', padding: '20px', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
            <div className="flex-between" style={{ borderBottom: '2px solid #0f172a', paddingBottom: '10px' }}>
              <div>
                <h2 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>AKV ENERGY SOLAR RECEIPT</h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: '#475569' }}>Ahmedabad, Gujarat • support@akvenergy.com</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3>RECEIPT LOG</h3>
                <p>REC-{showReceiptPreview.id}</p>
              </div>
            </div>

            <div style={{ margin: '14px 0', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>Client Profile: <strong>{selectedInvoice.customer_name}</strong></div>
              <div>Invoice Reference: <strong>{selectedInvoice.invoice_num}</strong></div>
              <div>Payment Method: <strong>{showReceiptPreview.method.toUpperCase()}</strong></div>
              {showReceiptPreview.txn_id && <div>Transaction ID: <strong>{showReceiptPreview.txn_id}</strong></div>}
              <div>Payment Date: <strong>{showReceiptPreview.pay_date}</strong></div>
              <div style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '8px 0', marginTop: '6px', fontSize: '13px', color: '#16a34a', fontWeight: 'bold' }}>
                Amount Received: ${Number(showReceiptPreview.amount).toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ height: '30px', fontStyle: 'italic', fontWeight: 'bold', color: '#475569' }}>AKV Energy</div>
                <div style={{ width: '120px', borderTop: '1px solid #0f172a' }}>Authorized Stamp</div>
              </div>
            </div>
          </div>
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
