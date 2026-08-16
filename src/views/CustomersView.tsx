import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Search, Plus, ArrowLeft, Trash2,
  Phone, Mail, Zap, RefreshCw,
  ChevronRight, X, MessageSquare, Download
} from 'lucide-react';
import { CustomerService } from '../utils/customerService';
import type { Customer, CustomerPayload } from '../types/customer';
import { PageHeader, Modal } from '../components/ui';

function emptyForm(): CustomerPayload {
  return {
    full_name: '', phone: '', email: '', address: '',
    city: '', state: '', pincode: '',
    monthly_units: null, property_type: 'Residential',
    roof_type: 'Flat RCC', roof_area: null, system_type: 'on_grid',
  };
}

type Screen = 'list' | 'detail' | 'form';

interface CustomersViewProps {
  initialCustomerId?: number | null;
  onClearInitialCustomerId?: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ initialCustomerId, onClearInitialCustomerId }) => {
  const [screen, setScreen] = useState<Screen>('list');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const exportCustomersToCSV = () => {
    if (customers.length === 0) return;
    const headers = ['ID', 'Name', 'Phone', 'Email', 'Address', 'City', 'State', 'Pincode', 'Monthly kWh', 'Roof Type', 'Roof Area', 'System Type', 'Created At'];
    const rows = customers.map(c => [
      c.id,
      `"${c.full_name.replace(/"/g, '""')}"`,
      c.phone,
      c.email ?? '',
      `"${(c.address ?? '').replace(/"/g, '""')}"`,
      `"${(c.city ?? '').replace(/"/g, '""')}"`,
      `"${(c.state ?? '').replace(/"/g, '""')}"`,
      c.pincode ?? '',
      c.monthly_units ?? '',
      c.roof_type ?? '',
      c.roof_area ?? '',
      c.system_type ?? '',
      c.created_at
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `akv_customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [selected, setSelected] = useState<Customer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [form, setForm] = useState<CustomerPayload>(emptyForm());
  const [isEdit, setIsEdit] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchList = useCallback(async (q = '') => {
    setListLoading(true);
    setListError('');
    try {
      const { data, total: t } = await CustomerService.getCustomers(q);
      setCustomers(data);
      setTotal(t);
    } catch (e: any) {
      setListError(e.message ?? 'Failed to load customers.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchList(search);
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, fetchList]);

  const openDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    setScreen('detail');
    try {
      const customer = await CustomerService.getCustomer(id);
      setSelected(customer);
    } catch (e: any) {
      showToast(e.message ?? 'Failed to load details.', 'error');
      setScreen('list');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialCustomerId) {
      openDetail(initialCustomerId);
    }
  }, [initialCustomerId, openDetail]);

  const openAdd = () => {
    setForm(emptyForm());
    setIsEdit(false);
    setFormError('');
    setFormSuccess('');
    setScreen('form');
  };

  const openEdit = (c: Customer) => {
    setForm({
      full_name: c.full_name,
      phone: c.phone,
      email: c.email ?? '',
      address: c.address ?? '',
      city: c.city ?? '',
      state: c.state ?? '',
      pincode: c.pincode ?? '',
      monthly_units: c.monthly_units ?? null,
      property_type: c.property_type ?? 'Residential',
      roof_type: c.roof_type ?? 'Flat RCC',
      roof_area: c.roof_area ?? null,
      system_type: c.system_type ?? 'on_grid',
    });
    setIsEdit(true);
    setFormError('');
    setFormSuccess('');
    setScreen('form');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) { setFormError('Full Name is required.'); return; }
    if (!form.phone.trim()) { setFormError('Phone number is required.'); return; }

    setFormSaving(true);
    setFormError('');
    setFormSuccess('');

    try {
      if (isEdit && selected) {
        console.log('[CustomersView] Updating customer payload:', { ...form, id: selected.id });
        await CustomerService.updateCustomer({ ...form, id: selected.id });
        const updated = await CustomerService.getCustomer(selected.id);
        setSelected(updated);
        fetchList();
        showToast('Customer updated successfully.', 'success');
        setScreen('detail');
      } else {
        console.log('[CustomersView] Creating customer payload:', form);
        await CustomerService.createCustomer(form);
        showToast('New customer added successfully.', 'success');
        fetchList();
        setScreen('list');
      }
    } catch (err: any) {
      console.error('[CustomersView] Customer save error:', err);
      setFormError(err.message ?? 'Failed to save customer.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      await CustomerService.deleteCustomer(id);
      showToast('Customer deleted.', 'success');
      setConfirmDeleteId(null);
      if (screen === 'detail') {
        setSelected(null);
        setScreen('list');
      }
      fetchList();
    } catch (e: any) {
      showToast(e.message ?? 'Failed to delete.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const f = <K extends keyof CustomerPayload>(key: K, val: CustomerPayload[K]) => {
    setForm(p => ({ ...p, [key]: val }));
    setFormError('');
  };

  // ══════════════════════════════════════════════════════════════════════
  // SCREEN: CUSTOMER LIST
  // ══════════════════════════════════════════════════════════════════════
  if (screen === 'list') return (
    <div className="view-content animate-fade">
      <PageHeader
        title="Customers"
        subtitle={`${total} record${total !== 1 ? 's' : ''} total`}
        action={
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={exportCustomersToCSV} className="btn btn-secondary btn-sm" title="Export CSV">
              <Download size={14} />
            </button>
            <button onClick={openAdd} className="btn btn-primary btn-sm">
              <Plus size={14} /> Add
            </button>
          </div>
        }
      />

      {/* Search bar */}
      <div className="search-bar">
        <Search size={16} color="var(--text-muted)" />
        <input
          type="search"
          placeholder="Search by name, phone or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* Error */}
      {listError && (
        <div className="card" style={{ padding: '12px', background: 'var(--error-light)', display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--error)', flex: 1 }}>{listError}</span>
          <button onClick={() => fetchList(search)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      )}

      {/* Loading */}
      {listLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ height: '68px', borderRadius: '12px', background: 'var(--bg-input)', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!listLoading && !listError && customers.length === 0 && (
        <div className="card animate-scale" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <div style={{ display: 'inline-flex', width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Users size={24} color="var(--primary)" />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
            {search ? 'No results found' : 'No customers yet'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            {search ? 'No matches found in customer records.' : 'Start by adding a new customer.'}
          </p>
          {search ? (
            <button onClick={() => setSearch('')} className="btn btn-secondary btn-sm">Reset Search</button>
          ) : (
            <button onClick={openAdd} className="btn btn-primary btn-sm">+ Add New Customer</button>
          )}
        </div>
      )}

      {/* Customer cards */}
      {!listLoading && customers.map(c => (
        <div key={c.id} className="card" style={{ padding: '12px 14px', cursor: 'pointer', marginBottom: '8px' }} onClick={() => openDetail(c.id)}>
          <div className="flex-between">
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.full_name}
              </h4>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                <span><Phone size={11} style={{ verticalAlign: '-1px' }} /> {c.phone}</span>
                {c.email && <span><Mail size={11} style={{ verticalAlign: '-1px' }} /> {c.email}</span>}
              </div>
              {(c.property_type || c.system_type) && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {c.property_type && (
                    <span className="badge badge-info" style={{ fontSize: '10px' }}>{c.property_type}</span>
                  )}
                  {c.system_type && (
                    <span className="badge badge-success" style={{ fontSize: '10px' }}>{c.system_type.replace('_', '-')}</span>
                  )}
                </div>
              )}
            </div>
            <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: '8px' }} />
          </div>
        </div>
      ))}

      {/* Delete confirmation modal */}
      {confirmDeleteId !== null && (
        <Modal
          isOpen={confirmDeleteId !== null}
          onClose={() => setConfirmDeleteId(null)}
          title="Delete Customer?"
          footer={
            <div className="grid-2" style={{ gap: '10px' }}>
              <button onClick={() => setConfirmDeleteId(null)} className="btn btn-secondary" disabled={deleting}>
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="btn btn-danger" disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          }
        >
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            This action cannot be undone. The customer record will be permanently removed.
          </p>
        </Modal>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '20px', right: '20px', 
          background: toast.type === 'success' ? 'var(--success)' : 'var(--error)',
          color: '#fff', padding: '12px 16px', borderRadius: '12px', zIndex: 10000,
          boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
          animation: 'slide-up 0.3s ease-out'
        }}>
          <span style={{ flex: 1 }}>{toast.message}</span>
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════
  // SCREEN: CUSTOMER DETAIL
  // ══════════════════════════════════════════════════════════════════════
  if (screen === 'detail') return (
    <div className="view-content animate-fade">
      <button onClick={() => { setScreen('list'); setSelected(null); onClearInitialCustomerId?.(); }}
        className="btn btn-ghost btn-sm" style={{ paddingLeft: 0, color: 'var(--text-muted)', marginBottom: '12px' }}>
        <ArrowLeft size={16} /> Back to Customers
      </button>

      {detailLoading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      )}

      {!detailLoading && selected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card">
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{selected.full_name}</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Customer #{selected.id}</p>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => openEdit(selected)} className="btn btn-secondary btn-sm">Edit</button>
                <button onClick={() => setConfirmDeleteId(selected.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <a href={`tel:${selected.phone}`} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                <Phone size={13} /> Call
              </a>
              <a href={`https://wa.me/${selected.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                <MessageSquare size={13} color="var(--success)" /> WhatsApp
              </a>
              {selected.email && (
                <a href={`mailto:${selected.email}`} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                  <Mail size={13} /> Email
                </a>
              )}
            </div>

            <div className="info-row">
              <span className="label">Phone</span>
              <span className="value">{selected.phone}</span>
            </div>
            {selected.email && (
              <div className="info-row">
                <span className="label">Email</span>
                <span className="value">{selected.email}</span>
              </div>
            )}
            {selected.address && (
              <div className="info-row">
                <span className="label">Address</span>
                <span className="value">{selected.address}</span>
              </div>
            )}
          </div>

          <div className="card">
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={15} color="var(--primary)" /> Solar Configuration
            </h4>
            <div className="info-row">
              <span className="label">System Type</span>
              <span className="value">{selected.system_type ? selected.system_type.replace('_', '-').toUpperCase() : 'ON-GRID'}</span>
            </div>
            <div className="info-row">
              <span className="label">Monthly Units</span>
              <span className="value">{selected.monthly_units ? `${selected.monthly_units} kWh` : '—'}</span>
            </div>
            <div className="info-row">
              <span className="label">Property Type</span>
              <span className="value">{selected.property_type ?? 'Residential'}</span>
            </div>
            <div className="info-row">
              <span className="label">Roof Specs</span>
              <span className="value">{`${selected.roof_type ?? 'Flat RCC'} (${selected.roof_area ? selected.roof_area + ' sq.ft' : '—'})`}</span>
            </div>
            <div className="info-row">
              <span className="label">Location</span>
              <span className="value">{[selected.city, selected.state, selected.pincode].filter(Boolean).join(', ') || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="label">Added On</span>
              <span className="value">{selected.created_at}</span>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId !== null && (
        <Modal
          isOpen={confirmDeleteId !== null}
          onClose={() => setConfirmDeleteId(null)}
          title="Delete Customer?"
          footer={
            <div className="grid-2" style={{ gap: '10px' }}>
              <button onClick={() => setConfirmDeleteId(null)} className="btn btn-secondary" disabled={deleting}>Cancel</button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="btn btn-danger" disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          }
        >
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            This action cannot be undone. The customer record will be permanently removed.
          </p>
        </Modal>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════
  // SCREEN: ADD / EDIT FORM
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="view-content animate-fade">
      <button onClick={() => setScreen(isEdit ? 'detail' : 'list')}
        className="btn btn-ghost btn-sm" style={{ paddingLeft: 0, color: 'var(--text-muted)', marginBottom: '12px' }}>
        <ArrowLeft size={16} /> {isEdit ? 'Back to Details' : 'Back to Customers'}
      </button>

      <PageHeader
        title={isEdit ? 'Edit Customer' : 'New Customer'}
        subtitle={isEdit ? 'Update customer details' : 'Add a new customer'}
      />

      {formError && <div className="form-error" style={{ marginBottom: '12px' }}>{formError}</div>}
      {formSuccess && <div style={{ color: 'var(--success)', fontSize: '13px', marginBottom: '12px' }}>{formSuccess}</div>}

      <form onSubmit={handleSave} className="card">
        <p className="section-subtitle">Contact Information</p>

        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input className="form-input" placeholder="e.g., Ramesh Patel"
            value={form.full_name} onChange={e => f('full_name', e.target.value)} required />
        </div>

        <div className="form-group">
          <label className="form-label">Phone Number *</label>
          <input className="form-input" type="tel" inputMode="tel" placeholder="10-digit mobile"
            value={form.phone} onChange={e => f('phone', e.target.value)} required />
        </div>

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input className="form-input" type="email" placeholder="customer@email.com"
            value={form.email ?? ''} onChange={e => f('email', e.target.value || null)} />
        </div>

        <div className="form-group">
          <label className="form-label">Address</label>
          <textarea className="form-textarea" placeholder="House, Street, Area"
            value={form.address ?? ''} onChange={e => f('address', e.target.value || null)} />
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">City</label>
            <input className="form-input" placeholder="e.g., Ahmedabad"
              value={form.city ?? ''} onChange={e => f('city', e.target.value || null)} />
          </div>
          <div className="form-group">
            <label className="form-label">State</label>
            <input className="form-input" placeholder="e.g., Gujarat"
              value={form.state ?? ''} onChange={e => f('state', e.target.value || null)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Pincode</label>
          <input className="form-input" type="text" inputMode="numeric" placeholder="6-digit pincode"
            value={form.pincode ?? ''} onChange={e => f('pincode', e.target.value || null)} />
        </div>

        <p className="section-subtitle" style={{ marginTop: '16px' }}>Solar Requirements</p>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Monthly Units (kWh)</label>
            <input className="form-input" type="number" inputMode="numeric" min={0} step={10}
              placeholder="e.g., 300"
              value={form.monthly_units ?? ''}
              onChange={e => f('monthly_units', e.target.value ? parseFloat(e.target.value) : null)} />
          </div>
          <div className="form-group">
            <label className="form-label">Roof Area (sq.ft)</label>
            <input className="form-input" type="number" inputMode="numeric" min={0} step={10}
              placeholder="e.g., 500"
              value={form.roof_area ?? ''}
              onChange={e => f('roof_area', e.target.value ? parseFloat(e.target.value) : null)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Property Type</label>
          <select className="form-select" value={form.property_type ?? ''} onChange={e => f('property_type', e.target.value || null)}>
            <option value="Residential">Residential</option>
            <option value="Commercial">Commercial</option>
            <option value="Industrial">Industrial</option>
          </select>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Roof Type</label>
            <select className="form-select" value={form.roof_type ?? ''} onChange={e => f('roof_type', e.target.value || null)}>
              <option value="Flat RCC">Flat RCC</option>
              <option value="Metal Sheet">Metal Sheet</option>
              <option value="Sloped Tile">Sloped Tile</option>
              <option value="Terrace">Terrace</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">System Type</label>
            <select className="form-select" value={form.system_type ?? ''} onChange={e => f('system_type', e.target.value || null)}>
              <option value="on_grid">On-Grid</option>
              <option value="off_grid">Off-Grid</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: '12px', gap: '10px' }}>
          <button type="button" onClick={() => setScreen(isEdit ? 'detail' : 'list')}
            className="btn btn-secondary" disabled={formSaving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={formSaving}>
            {formSaving ? 'Saving…' : (isEdit ? 'Update' : 'Save')}
          </button>
        </div>
      </form>
    </div>
  );
};
