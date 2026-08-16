import React, { useEffect, useState } from 'react';
import { 
  Package, Plus, Edit, Trash2, 
  RefreshCw, Eye, EyeOff, Star, ArrowLeft, X, AlertCircle
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { Modal } from '../components/ui';

interface Product {
  id: number;
  category: string;
  name: string;
  brand: string | null;
  description: string | null;
  price_label: string | null;
  warranty: string | null;
  image_url: string | null;
  specs: Record<string, string> | null;
  is_popular: number;
  is_active: number;
  sort_order: number;
  created_at: string;
}

const categoriesList = [
  { value: 'panels', label: 'Solar Panels' },
  { value: 'inverters', label: 'Inverters' },
  { value: 'batteries', label: 'Batteries' },
  { value: 'accessories', label: 'Accessories' },
];

export const ProductsAdminView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('panels');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formId, setFormId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('panels');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [priceLabel, setPriceLabel] = useState('');
  const [warranty, setWarranty] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPopular, setIsPopular] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  // Specs dynamic keys/values builder
  const [specKeys, setSpecKeys] = useState<string[]>([]);
  const [specVals, setSpecVals] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Toast Notifications ──────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = async () => {
    setLoading(true);
    setErrorMsg('');
    const result = await apiFetch('admin_list_products');
    if (result.ok && result.data && Array.isArray(result.data.data)) {
      setProducts(result.data.data);
    } else {
      setErrorMsg(result.error || 'Failed to load products.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAdd = () => {
    setIsEdit(false);
    setFormId(null);
    setName('');
    setCategory(selectedCategory);
    setBrand('');
    setDescription('');
    setPriceLabel('');
    setWarranty('');
    setImageUrl('');
    setIsPopular(false);
    setIsActive(true);
    setSortOrder(0);
    
    // Set default keys based on category
    if (selectedCategory === 'panels') {
      setSpecKeys(['Capacity (Wp)', 'Cell Type', 'Efficiency']);
      setSpecVals(['550Wp', 'Mono PERC', '21.5%']);
    } else if (selectedCategory === 'inverters') {
      setSpecKeys(['Capacity', 'Max Efficiency', 'Phase']);
      setSpecVals(['3.3 kW', '98.2%', 'Single Phase']);
    } else {
      setSpecKeys(['Capacity', 'Voltage']);
      setSpecVals(['5 kWh', '48V']);
    }
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setIsEdit(true);
    setFormId(p.id);
    setName(p.name);
    setCategory(p.category);
    setBrand(p.brand ?? '');
    setDescription(p.description ?? '');
    setPriceLabel(p.price_label ?? '');
    setWarranty(p.warranty ?? '');
    setImageUrl(p.image_url ?? '');
    setIsPopular(p.is_popular === 1);
    setIsActive(p.is_active === 1);
    setSortOrder(p.sort_order);

    // Load specs keys/values
    if (p.specs && typeof p.specs === 'object') {
      setSpecKeys(Object.keys(p.specs));
      setSpecVals(Object.values(p.specs));
    } else {
      setSpecKeys([]);
      setSpecVals([]);
    }
    setShowForm(true);
  };

  const handleAddSpec = () => {
    setSpecKeys([...specKeys, '']);
    setSpecVals([...specVals, '']);
  };

  const handleRemoveSpec = (idx: number) => {
    setSpecKeys(specKeys.filter((_, i) => i !== idx));
    setSpecVals(specVals.filter((_, i) => i !== idx));
  };

  const handleSpecKeyChange = (idx: number, val: string) => {
    const next = [...specKeys];
    next[idx] = val;
    setSpecKeys(next);
  };

  const handleSpecValChange = (idx: number, val: string) => {
    const next = [...specVals];
    next[idx] = val;
    setSpecVals(next);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() === '') return;
    setSaving(true);

    // Format specs
    const specsMap: Record<string, string> = {};
    specKeys.forEach((k, i) => {
      if (k.trim() !== '') {
        specsMap[k.trim()] = specVals[i].trim();
      }
    });

    const payload = {
      id: formId,
      category,
      name,
      brand: brand.trim() || null,
      description: description.trim() || null,
      price_label: priceLabel.trim() || null,
      warranty: warranty.trim() || null,
      image_url: imageUrl.trim() || null,
      specs: specsMap,
      is_popular: isPopular ? 1 : 0,
      is_active: isActive ? 1 : 0,
      sort_order: sortOrder
    };

    const action = isEdit ? 'admin_update_product' : 'admin_create_product';
    const result = await apiFetch(action, {
      method: isEdit ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });

    if (result.ok) {
      showToast('Product parameters saved.', 'success');
      setShowForm(false);
      fetchProducts();
    } else {
      showToast(result.error || 'Failed to save product details.', 'error');
    }
    setSaving(false);
  };

  const toggleActiveStatus = async (p: Product) => {
    const updated = {
      ...p,
      is_active: p.is_active === 1 ? 0 : 1
    };
    const result = await apiFetch('admin_update_product', {
      method: 'PUT',
      body: JSON.stringify(updated)
    });
    if (result.ok) {
      showToast(`Product is now ${updated.is_active === 1 ? 'active' : 'disabled'}.`, 'success');
      fetchProducts();
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    const result = await apiFetch(`admin_delete_product&id=${id}`, {
      method: 'DELETE'
    });
    if (result.ok) {
      showToast('Product successfully removed from catalog.', 'success');
      setConfirmDeleteId(null);
      fetchProducts();
    } else {
      showToast(result.error || 'Failed to delete product.', 'error');
    }
    setDeleting(false);
  };

  const filteredProducts = products.filter(p => p.category === selectedCategory);

  return (
    <div className="animate-fade">
      {/* ── SCREEN: ADD / EDIT FORM ────────────────────────────────────────── */}
      {showForm && (
        <div>
          <button onClick={() => setShowForm(false)}
            className="btn" style={{ padding: 0, background: 'transparent', color: 'var(--text-muted)', marginBottom: '16px' }}>
            <ArrowLeft size={16} /> Back to Catalog
          </button>

          <div className="glass-card" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Package size={16} color="var(--color-cyan)" /> {isEdit ? 'Modify Product Details' : 'Add New Product'}
            </h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Product Name *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Mono PERC 550W Panel"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Category</label>
                  <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
                    {categoriesList.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Brand</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={brand} 
                    onChange={e => setBrand(e.target.value)}
                    placeholder="e.g. Waaree"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Price Label</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={priceLabel} 
                    onChange={e => setPriceLabel(e.target.value)}
                    placeholder="e.g. Contact for pricing"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Warranty</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={warranty} 
                    onChange={e => setWarranty(e.target.value)}
                    placeholder="e.g. 25 Years"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Image URL</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={imageUrl} 
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Description</label>
                <textarea 
                  className="form-input" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Product features and certifications..."
                  style={{ minHeight: '50px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', margin: '6px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#fff', cursor: 'pointer' }}>
                  <input type="checkbox" checked={isPopular} onChange={e => setIsPopular(e.target.checked)} />
                  Popular
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#fff', cursor: 'pointer' }}>
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                  Active
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Sort:</span>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={sortOrder} 
                    onChange={e => setSortOrder(Number(e.target.value))}
                    style={{ width: '50px', padding: '4px', height: '24px', fontSize: '11px' }}
                  />
                </div>
              </div>

              {/* Specifications Sub-Form */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '6px' }}>
                <div className="flex-between" style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Technical Specifications</span>
                  <button type="button" onClick={handleAddSpec} className="btn" style={{ padding: '2px 8px', fontSize: '10px', color: 'var(--color-cyan)', background: 'transparent' }}>
                    + Add Field
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {specKeys.map((key, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Label" 
                        value={key} 
                        onChange={e => handleSpecKeyChange(idx, e.target.value)} 
                        style={{ flex: 1, padding: '6px', fontSize: '11px', height: '28px' }}
                      />
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Value" 
                        value={specVals[idx]} 
                        onChange={e => handleSpecValChange(idx, e.target.value)} 
                        style={{ flex: 1.5, padding: '6px', fontSize: '11px', height: '28px' }}
                      />
                      <button type="button" onClick={() => handleRemoveSpec(idx)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }} disabled={saving}>
                {saving ? 'Saving...' : 'Save Product'}
              </button>
            </form>
          </div>
        </div>
      )}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '20px', right: '20px', 
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: '#fff', padding: '12px 16px', borderRadius: '12px', zIndex: 10000,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
          animation: 'slide-up 0.3s ease-out'
        }}>
          {toast.type === 'success' ? <Package size={16} /> : <AlertCircle size={16} />}
          <span style={{ flex: 1 }}>{toast.message}</span>
        </div>
      )}

      {/* ── SCREEN: LISTING VIEW ─────────────────────────────────────────── */}
      {!showForm && (
        <>
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '20px', color: '#fff' }}>Product Catalog</h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Configure panels, inverters, and battery specs.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={openAdd} className="btn btn-primary" style={{ padding: '8px 12px', fontSize: '12px' }}>
                <Plus size={14} /> Add Product
              </button>
              <button onClick={fetchProducts} className="modal-close" style={{ width: '32px', height: '32px' }}>
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          {/* Categories Selector Tabs */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px' }}>
            {categoriesList.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`btn ${selectedCategory === cat.value ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: '11px', flexShrink: 0, borderRadius: '20px' }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: '90px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : errorMsg ? (
            <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>{errorMsg}</div>
          ) : filteredProducts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredProducts.map(prod => (
                <div key={prod.id} className="glass-card" style={{ padding: '12px', marginBottom: 0 }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <Package size={22} color="var(--text-muted)" />
                      )}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div className="flex-between">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{prod.name}</span>
                          {prod.is_popular === 1 && <Star size={11} color="var(--color-green)" fill="var(--color-green)" />}
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => openEdit(prod)} className="modal-close" style={{ width: '26px', height: '26px' }}>
                            <Edit size={11} />
                          </button>
                          <button onClick={() => setConfirmDeleteId(prod.id)} className="modal-close" style={{ width: '26px', height: '26px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                      
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Brand: {prod.brand ?? '—'} • Sort Rank: {prod.sort_order}
                      </div>
                      <div className="flex-between" style={{ marginTop: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-green)', fontWeight: 600 }}>{prod.price_label ?? 'Contact for pricing'}</span>
                        <button 
                          onClick={() => toggleActiveStatus(prod)}
                          style={{ background: 'none', border: 'none', outline: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: prod.is_active === 1 ? 'var(--color-green)' : 'var(--text-muted)' }}
                        >
                          {prod.is_active === 1 ? <Eye size={12} /> : <EyeOff size={12} />}
                          {prod.is_active === 1 ? 'Active' : 'Disabled'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Specs dropdown section preview */}
                  {prod.specs && Object.keys(prod.specs).length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', marginTop: '8px', paddingTop: '6px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                      {Object.entries(prod.specs).map(([k, v]) => (
                        <div key={k}>{k}: <span style={{ color: '#fff' }}>{v}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card glow-cyan animate-scale" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <div style={{ display: 'inline-flex', width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <Package size={22} color="var(--text-muted)" />
              </div>
              <p style={{ fontSize: '14px', color: '#fff', marginBottom: '6px', fontWeight: 600 }}>Catalog Category Empty</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No products registered under this category tag.</p>
            </div>
          )}
        </>
      )}

      {/* Delete confirm modal */}
      {confirmDeleteId !== null && (
        <Modal
          isOpen={confirmDeleteId !== null}
          onClose={() => setConfirmDeleteId(null)}
          title="Remove Product?"
          footer={
            <div className="grid-2" style={{ gap: '8px' }}>
              <button onClick={() => setConfirmDeleteId(null)} className="btn btn-secondary" disabled={deleting}>Cancel</button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="btn btn-danger" disabled={deleting}>
                {deleting ? 'Removing...' : 'Delete Product'}
              </button>
            </div>
          }
        >
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>This will remove the product from listings and customer visibility.</p>
        </Modal>
      )}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '20px', right: '20px', 
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: '#fff', padding: '12px 16px', borderRadius: '12px', zIndex: 10000,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
          animation: 'slide-up 0.3s ease-out'
        }}>
          {toast.type === 'success' ? <Package size={16} /> : <AlertCircle size={16} />}
          <span style={{ flex: 1 }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
