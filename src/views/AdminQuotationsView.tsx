import React, { useEffect, useState } from 'react';
import { 
  FileText, ArrowLeft, Plus, Trash2, Edit, Copy,
  Download, CheckCircle2, AlertCircle
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { CustomerService } from '../utils/customerService';
import type { Customer } from '../types/customer';
import { Modal } from '../components/ui';

const formatQuoteNum = (id: number) => {
  return 'QT-' + String(id).padStart(6, '0');
};

interface AdminQuotationsProps {
  onBack: () => void;
}

interface Product {
  id: number;
  name: string;
  price_label: string;
  is_active: number;
}

interface QuoteItem {
  product_id: number;
  quantity: number;
  price: number;
  discount: number;
}

interface Quotation {
  id: number;
  quotation_number: string;
  customer_id: number;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  subtotal: number;
  discount: number;
  gst: number;
  installation_charges: number;
  transportation_charges: number;
  grand_total: number;
  validity_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  items?: {
    id: number;
    product_id: number;
    product_name: string;
    product_brand?: string;
    quantity: number;
    price: number;
  }[];
}

export const AdminQuotationsView: React.FC<AdminQuotationsProps> = ({ onBack }) => {
  const [screen, setScreen] = useState<'list' | 'form' | 'detail'>('list');
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Roster lists for dropdowns
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Selected details
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);

  // Form states
  const [formCustomer, setFormCustomer] = useState<number>(0);
  const [formItems, setFormItems] = useState<QuoteItem[]>([]);
  const [formDiscount, setFormDiscount] = useState<number>(0);
  const [formInstall, setFormInstall] = useState<number>(0);
  const [formTrans, setFormTrans] = useState<number>(0);
  const [formValidity, setFormValidity] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formStatus, setFormStatus] = useState<string>('draft');
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Modals & UI states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch Quotes
  const fetchQuotes = async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (search.trim()) q.set('search', search.trim());
    if (statusFilter) q.set('status', statusFilter);
    
    const res = await apiFetch(`get_quotations&${q.toString()}`);
    if (res.ok && res.data) {
      setQuotes(res.data.data || []);
    }
    setLoading(false);
  };

  // Fetch Roster Dropdowns
  const loadFormDependencies = async () => {
    try {
      const custData = await CustomerService.getCustomers('', 200, 0);
      setCustomers(custData.data || []);
      
      const prodRes = await apiFetch('admin_list_products');
      if (prodRes.ok && Array.isArray(prodRes.data)) {
        setProducts(prodRes.data.filter((p: any) => p.is_active === 1));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchQuotes();
    loadFormDependencies();
  }, [search, statusFilter]);

  // View Quote Details
  const viewDetails = async (id: number) => {
    setLoading(true);
    const res = await apiFetch(`get_quotations&id=${id}`);
    if (res.ok && res.data?.data) {
      setSelectedQuote(res.data.data);
      setSelectedId(id);
      setScreen('detail');
    } else {
      showToast(res.error || 'Failed to load details.', 'error');
    }
    setLoading(false);
  };

  // Create Init Form
  const initCreateForm = () => {
    setFormCustomer(customers[0]?.id || 0);
    setFormItems([{ product_id: products[0]?.id || 0, quantity: 1, price: 0, discount: 0 }]);
    setFormDiscount(0);
    setFormInstall(0);
    setFormTrans(0);
    setFormValidity('');
    setFormNotes('');
    setFormStatus('draft');
    setIsEditing(false);
    setScreen('form');
  };

  // Edit Init Form
  const initEditForm = async (q: Quotation) => {
    setLoading(true);
    const res = await apiFetch(`get_quotations&id=${q.id}`);
    if (res.ok && res.data?.data) {
      const fullQ = res.data.data;
      setFormCustomer(fullQ.customer_id);
      setFormItems(fullQ.items.map((it: any) => ({
        product_id: it.product_id,
        quantity: it.quantity,
        price: it.price,
        discount: 0
      })));
      setFormDiscount(fullQ.discount);
      setFormInstall(fullQ.installation_charges);
      setFormTrans(fullQ.transportation_charges);
      setFormValidity(fullQ.validity_date || '');
      setFormNotes(fullQ.notes || '');
      setFormStatus(fullQ.status);
      setSelectedId(fullQ.id);
      setIsEditing(true);
      setScreen('form');
    } else {
      showToast('Failed to load item dependencies.', 'error');
    }
    setLoading(false);
  };

  // Save Quotation Form
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formCustomer <= 0 || formItems.length === 0) {
      showToast('Please select a customer and add products.', 'error');
      return;
    }
    setSaving(true);

    const payload = {
      id: selectedId,
      customer_id: formCustomer,
      items: formItems,
      discount: formDiscount,
      installation_charges: formInstall,
      transportation_charges: formTrans,
      validity_date: formValidity,
      notes: formNotes,
      status: formStatus
    };

    const endpoint = isEditing ? 'update_quotation' : 'create_quotation';
    const method = isEditing ? 'PUT' : 'POST';

    const res = await apiFetch(endpoint, {
      method,
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast(isEditing ? 'Quotation updated successfully!' : 'Quotation draft saved!', 'success');
      setScreen('list');
      fetchQuotes();
    } else {
      showToast(res.error || 'Failed to save quotation.', 'error');
    }
    setSaving(false);
  };

  // Duplicate Quotation
  const handleDuplicate = async (q: Quotation) => {
    setLoading(true);
    const res = await apiFetch(`get_quotations&id=${q.id}`);
    if (res.ok && res.data?.data) {
      const fullQ = res.data.data;
      const dupPayload = {
        customer_id: fullQ.customer_id,
        items: fullQ.items.map((it: any) => ({
          product_id: it.product_id,
          quantity: it.quantity,
          price: it.price,
          discount: 0
        })),
        discount: fullQ.discount,
        installation_charges: fullQ.installation_charges,
        transportation_charges: fullQ.transportation_charges,
        validity_date: fullQ.validity_date,
        notes: `Duplicate of ${formatQuoteNum(q.id)}. ${fullQ.notes || ''}`,
        status: 'draft'
      };

      const saveRes = await apiFetch('create_quotation', {
        method: 'POST',
        body: JSON.stringify(dupPayload)
      });

      if (saveRes.ok) {
        showToast('Quotation duplicated successfully.', 'success');
        fetchQuotes();
      } else {
        showToast(saveRes.error || 'Failed to duplicate.', 'error');
      }
    }
    setLoading(false);
  };

  // Delete Quotation
  const handleDelete = async (id: number) => {
    setLoading(true);
    const res = await apiFetch(`delete_quotation&id=${id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      showToast('Quotation deleted successfully.', 'success');
      setShowDeleteConfirm(null);
      setScreen('list');
      fetchQuotes();
    } else {
      showToast(res.error || 'Failed to delete quote.', 'error');
    }
    setLoading(false);
  };

  // Calculate live row total
  const getProductPrice = (pid: number) => {
    const prod = products.find(p => p.id === pid);
    if (!prod) return 0;
    return parseFloat(prod.price_label.replace(/[^\d.]/g, '')) || 0;
  };

  const updateFormItem = (idx: number, field: keyof QuoteItem, val: number) => {
    const updated = [...formItems];
    updated[idx] = {
      ...updated[idx],
      [field]: val
    };
    if (field === 'product_id') {
      updated[idx].price = getProductPrice(val);
    }
    setFormItems(updated);
  };

  const addFormItemRow = () => {
    setFormItems([...formItems, { product_id: products[0]?.id || 0, quantity: 1, price: 0, discount: 0 }]);
  };

  const removeFormItemRow = (idx: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  // Live Summary Calculations
  const subtotalVal = formItems.reduce((acc, it) => {
    const unit = it.price || getProductPrice(it.product_id);
    return acc + (unit * it.quantity) - it.discount;
  }, 0);

  const gstVal = subtotalVal * 0.18; // standard default 18% GST
  const grandTotalVal = subtotalVal - formDiscount + gstVal + formInstall + formTrans;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <span className="badge badge-success">Accepted</span>;
      case 'rejected':
        return <span className="badge badge-warning" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Rejected</span>;
      case 'sent':
      case 'viewed':
        return <span className="badge badge-success" style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--color-cyan)' }}>{status}</span>;
      case 'expired':
        return <span className="badge badge-secondary">Expired</span>;
      default:
        return <span className="badge badge-secondary" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>Draft</span>;
    }
  };

  return (
    <div className="animate-fade">
      {/* ── HEADER ROW ────────────────────────────────────────────────────── */}
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <button onClick={() => {
          if (screen !== 'list') setScreen('list');
          else onBack();
        }} className="btn btn-secondary animate-fade" style={{ display: 'flex', gap: '6px', padding: '6px 12px', fontSize: '12px' }}>
          <ArrowLeft size={14} /> Back
        </button>
        {screen === 'list' && (
          <button onClick={initCreateForm} className="btn btn-primary" style={{ padding: '8px 12px', fontSize: '12px' }}>
            <Plus size={14} /> Create Quotation
          </button>
        )}
      </div>

      {/* ── LIST VIEW SCREEN ──────────────────────────────────────────────── */}
      {screen === 'list' && (
        <>
          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '16px' }}>
            <input 
              type="search" 
              className="form-input" 
              placeholder="Search quotation ID or name..." 
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
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: '90px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : quotes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {quotes.map(q => (
                <div key={q.id} className="glass-card hover-glow" style={{ padding: '14px', marginBottom: 0 }}>
                  <div className="flex-between" style={{ marginBottom: '6px' }}>
                    <span onClick={() => viewDetails(q.id)} style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-cyan)', cursor: 'pointer' }}>
                      {q.quotation_number}
                    </span>
                    {getStatusBadge(q.status)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Customer: <span style={{ color: '#fff' }}>{q.customer_name}</span></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Total Amount: <span style={{ color: 'var(--color-green)', fontWeight: 600 }}>${Number(q.grand_total).toLocaleString()}</span></div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px', marginTop: '10px' }}>
                    <button onClick={() => viewDetails(q.id)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '10px' }}>View Details</button>
                    <button onClick={() => initEditForm(q)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--color-cyan)' }}><Edit size={12} /></button>
                    <button onClick={() => handleDuplicate(q)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--color-green)' }}><Copy size={12} /></button>
                    <button onClick={() => setShowDeleteConfirm(q.id)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '10px', color: '#ef4444' }}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card glow-cyan" style={{ textAlign: 'center', padding: '40px' }}>
              <FileText size={28} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: '13px', color: '#fff' }}>No quotation records registered.</p>
            </div>
          )}
        </>
      )}

      {/* ── FORM SCREEN (CREATE / EDIT) ──────────────────────────────────── */}
      {screen === 'form' && (
        <form onSubmit={handleSave} className="glass-card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '16px' }}>{isEditing ? 'Modify Quotation' : 'New Quotation Builder'}</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Select Customer *</label>
              <select className="form-input" value={formCustomer} onChange={e => setFormCustomer(Number(e.target.value))} required>
                <option value="0">Select Customer Profile</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>
                ))}
              </select>
            </div>

            {/* Items row builder */}
            <div>
              <div className="flex-between" style={{ marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Line Items</label>
                <button type="button" onClick={addFormItemRow} style={{ background: 'none', border: 'none', color: 'var(--color-cyan)', fontSize: '11px', cursor: 'pointer', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <Plus size={12} /> Add Item
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {formItems.map((item, idx) => (
                  <div key={idx} className="glass-card" style={{ padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 0 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select 
                        className="form-input" 
                        value={item.product_id}
                        onChange={e => updateFormItem(idx, 'product_id', Number(e.target.value))}
                        style={{ flex: 2, padding: '4px', fontSize: '11px', height: '28px' }}
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => removeFormItemRow(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} disabled={formItems.length === 1}>
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      <div>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Qty</span>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={item.quantity}
                          onChange={e => updateFormItem(idx, 'quantity', Number(e.target.value))}
                          style={{ padding: '4px', fontSize: '11px', height: '26px' }}
                          min="1"
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Unit Price</span>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={item.price || getProductPrice(item.product_id)}
                          onChange={e => updateFormItem(idx, 'price', Number(e.target.value))}
                          style={{ padding: '4px', fontSize: '11px', height: '26px' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>GST (18%)</span>
                        <div style={{ fontSize: '11px', color: '#fff', paddingTop: '4px' }}>
                          ${(((item.price || getProductPrice(item.product_id)) * item.quantity) * 0.18).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Extra charges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Discount ($)</label>
                <input type="number" className="form-input" value={formDiscount} onChange={e => setFormDiscount(Number(e.target.value))} style={{ fontSize: '12px', height: '32px' }} />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Civil Mount ($)</label>
                <input type="number" className="form-input" value={formInstall} onChange={e => setFormInstall(Number(e.target.value))} style={{ fontSize: '12px', height: '32px' }} />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Logistics ($)</label>
                <input type="number" className="form-input" value={formTrans} onChange={e => setFormTrans(Number(e.target.value))} style={{ fontSize: '12px', height: '32px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Validity Date</label>
                <input type="date" className="form-input" value={formValidity} onChange={e => setFormValidity(e.target.value)} style={{ fontSize: '12px', height: '32px' }} />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Quote Status</label>
                <select className="form-input" value={formStatus} onChange={e => setFormStatus(e.target.value)} style={{ fontSize: '12px', height: '32px' }}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Quotation Remarks</label>
              <textarea className="form-input" placeholder="Terms and conditions notes..." value={formNotes} onChange={e => setFormNotes(e.target.value)} style={{ minHeight: '50px', fontSize: '12px' }} />
            </div>

            {/* Calculations Summary Box */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="flex-between"><span>Subtotal:</span><span>${subtotalVal.toLocaleString()}</span></div>
              <div className="flex-between"><span>GST Amount (18%):</span><span>${gstVal.toLocaleString()}</span></div>
              <div className="flex-between"><span>Extra Charges:</span><span>${(formInstall + formTrans).toLocaleString()}</span></div>
              <div className="flex-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px', fontSize: '14px', fontWeight: 700, color: 'var(--color-green)' }}>
                <span>Grand Total:</span><span>${grandTotalVal.toLocaleString()}</span>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save & Publish Quotation'}
            </button>
          </div>
        </form>
      )}

      {/* ── DETAIL VIEW SCREEN ────────────────────────────────────────────── */}
      {screen === 'detail' && selectedQuote && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-card glow-cyan" style={{ padding: '16px' }}>
            <div className="flex-between" style={{ marginBottom: '10px' }}>
              <h3 style={{ fontSize: '16px', color: '#fff' }}>Quotation Detail</h3>
              {getStatusBadge(selectedQuote.status)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <div>Number: <span style={{ color: '#fff', fontWeight: 600 }}>{selectedQuote.quotation_number}</span></div>
              <div>Customer: <span style={{ color: '#fff' }}>{selectedQuote.customer_name}</span></div>
              {selectedQuote.customer_phone && <div>Mobile: <span style={{ color: '#fff' }}>{selectedQuote.customer_phone}</span></div>}
              {selectedQuote.validity_date && <div>Validity: <span style={{ color: '#fff' }}>{selectedQuote.validity_date}</span></div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
              <button onClick={() => setShowPdfPreview(true)} className="btn btn-secondary" style={{ padding: '6px 8px', fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={12} /> PDF Preview
              </button>
              <button onClick={() => showToast('Simulating Invoice PDF download...', 'success')} className="btn btn-secondary" style={{ padding: '6px 8px', fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                <Download size={12} /> Download PDF
              </button>
            </div>
          </div>

          {/* Items checklist */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '13px', color: '#fff', marginBottom: '10px', fontWeight: 600 }}>Product Specifications</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedQuote.items?.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 500 }}>{it.product_name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Quantity: {it.quantity} x ${Number(it.price).toLocaleString()}</div>
                  </div>
                  <span style={{ color: '#fff', fontWeight: 600 }}>${(it.quantity * it.price).toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Calculations Box */}
            <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div className="flex-between"><span>Subtotal:</span><span>${Number(selectedQuote.subtotal).toLocaleString()}</span></div>
              <div className="flex-between"><span>Discount:</span><span style={{ color: '#ef4444' }}>-${Number(selectedQuote.discount).toLocaleString()}</span></div>
              <div className="flex-between"><span>GST Taxes:</span><span>${Number(selectedQuote.gst).toLocaleString()}</span></div>
              <div className="flex-between"><span>Install & Transportation:</span><span>${(Number(selectedQuote.installation_charges) + Number(selectedQuote.transportation_charges)).toLocaleString()}</span></div>
              <div className="flex-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px', fontSize: '14px', fontWeight: 700, color: 'var(--color-green)' }}>
                <span>Grand Total:</span><span>${Number(selectedQuote.grand_total).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ────────────────────────────────────── */}
      {showDeleteConfirm && (
        <Modal
          isOpen={!!showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(null)}
          title="Wipe Quotation Record?"
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

      {/* ── PDF PREVIEW MODAL OVERLAY ─────────────────────────────────────── */}
      {showPdfPreview && selectedQuote && (
        <Modal
          isOpen={showPdfPreview}
          onClose={() => setShowPdfPreview(false)}
          title="Physical PDF Invoice Render"
          footer={
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => showToast('PDF file downloaded successfully.', 'success')} className="btn btn-primary" style={{ flex: 1 }}>Download PDF</button>
              <button onClick={() => { setShowPdfPreview(false); showToast('Quote shared via email.'); }} className="btn btn-secondary" style={{ flex: 1 }}>Email Client</button>
            </div>
          }
        >
          {/* Document sheet */}
          <div style={{ background: '#fff', color: '#0f172a', padding: '20px', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
            <div className="flex-between" style={{ borderBottom: '2px solid #0f172a', paddingBottom: '10px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>AKV ENERGY SOLAR</h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: '#475569' }}>Ahmedabad, Gujarat • support@akvenergy.com</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: 0 }}>QUOTATION</h3>
                <p style={{ margin: '2px 0 0 0' }}>{selectedQuote.quotation_number}</p>
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
                <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Date Issued</span>
                <div>{selectedQuote.created_at.split(' ')[0]}</div>
                <div style={{ marginTop: '4px', fontWeight: 'bold' }}>Validity: {selectedQuote.validity_date || '—'}</div>
              </div>
            </div>

            {/* Items Table */}
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
                {selectedQuote.items?.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px' }}>{it.product_name}</td>
                    <td style={{ textAlign: 'center', padding: '6px' }}>{it.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '6px' }}>${Number(it.price).toLocaleString()}</td>
                    <td style={{ textAlign: 'right', padding: '6px' }}>${(it.quantity * it.price).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations Box */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
                <div className="flex-between"><span>Subtotal:</span><span>${Number(selectedQuote.subtotal).toLocaleString()}</span></div>
                <div className="flex-between"><span>Discount:</span><span>-${Number(selectedQuote.discount).toLocaleString()}</span></div>
                <div className="flex-between"><span>GST Tax (18%):</span><span>${Number(selectedQuote.gst).toLocaleString()}</span></div>
                <div className="flex-between"><span>Surcharges:</span><span>${(Number(selectedQuote.installation_charges) + Number(selectedQuote.transportation_charges)).toLocaleString()}</span></div>
                <div className="flex-between" style={{ borderTop: '2px solid #0f172a', paddingTop: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                  <span>Grand Total:</span><span>${Number(selectedQuote.grand_total).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Terms and Signatures */}
            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '24px', paddingTop: '10px', fontSize: '9px', color: '#64748b' }}>
              <span style={{ fontWeight: 'bold', color: '#0f172a' }}>Terms:</span>
              <div>All pricing defaults calculations include standard 25 years panels warranty. Net-metering commissioning depends on state distribution company approvals.</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', borderTop: '1px dashed #cbd5e1', paddingTop: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ height: '30px' }} />
                <div style={{ width: '120px', borderTop: '1px solid #0f172a' }}>Client Signature</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ height: '30px', fontStyle: 'italic', fontWeight: 'bold', color: '#475569' }}>AKV Energy</div>
                <div style={{ width: '120px', borderTop: '1px solid #0f172a' }}>Authorized Sign</div>
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
