import React, { useState } from 'react';
import { Shield, Sparkles, Filter, Info, ArrowRight } from 'lucide-react';

interface ProductsViewProps {
  onOpenRequestQuote: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ onOpenRequestQuote }) => {
  const [filter, setFilter] = useState<'all' | 'panels' | 'inverters' | 'accessories'>('all');

  const products = [
    {
      id: 'p1',
      category: 'panels',
      name: 'Mono-PERC PV Panel 550W',
      brand: 'Waaree / Vikram Solar',
      specs: [
        { label: 'Efficiency', value: '21.5%' },
        { label: 'Type', value: 'Monocrystalline Half-Cell' },
        { label: 'Dimensions', value: '2278 x 1134 x 35 mm' },
      ],
      price: '₹14,500 / Panel',
      warranty: '25 Year Performance',
      features: 'High efficiency in low-light environments, anti-reflective coating.',
      img: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=300',
      popular: true
    },
    {
      id: 'p2',
      category: 'panels',
      name: 'Bifacial Solar Panel 580W',
      brand: 'Adani Solar / Loom',
      specs: [
        { label: 'Efficiency', value: '22.8%' },
        { label: 'Type', value: 'Bifacial Dual Glass' },
        { label: 'Albedo gain', value: 'Up to +25% generation' },
      ],
      price: '₹17,200 / Panel',
      warranty: '30 Year Performance',
      features: 'Generates electricity from both sides, ideal for high albedo white roofs.',
      img: 'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=300',
      popular: false
    },
    {
      id: 'i1',
      category: 'inverters',
      name: 'Smart Grid-Tied Inverter 5kW',
      brand: 'Growatt / Solis',
      specs: [
        { label: 'Efficiency', value: '98.4%' },
        { label: 'Phase', value: 'Single Phase' },
        { label: 'IP Rating', value: 'IP65 Water/Dust proof' },
      ],
      price: '₹34,000',
      warranty: '10 Year Standard',
      features: 'Built-in WiFi monitoring, dual MPPT trackers, digital OLED display.',
      img: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=300',
      popular: true
    },
    {
      id: 'i2',
      category: 'inverters',
      name: 'Three-Phase Inverter 20kW',
      brand: 'Solis / Sungrow',
      specs: [
        { label: 'Efficiency', value: '98.7%' },
        { label: 'Phase', value: 'Three Phase' },
        { label: 'Cooling', value: 'Smart Fan cooling' },
      ],
      price: '₹95,000',
      warranty: '10 Year Warranty',
      features: 'Integrated DC switch, AFCI protection against arc faults.',
      img: 'https://images.unsplash.com/photo-1692611825915-0f3c9bdb257d?w=300',
      popular: false
    },
    {
      id: 'a1',
      category: 'accessories',
      name: 'Hot-Dip Galvanized Structure',
      brand: 'AKV Custom Structural',
      specs: [
        { label: 'Material', value: 'GI 80 Microns' },
        { label: 'Wind speed', value: 'Up to 150 km/h' },
        { label: 'Tilt angle', value: '15° - 25° adjustable' },
      ],
      price: '₹6,500 / kW',
      warranty: '15 Year Structural',
      features: 'Rust-proof, engineered to withstand extreme cyclones and monsoons.',
      img: 'https://images.unsplash.com/photo-1624397640148-949b1732bb0a?w=300',
      popular: false
    }
  ];

  const filteredProducts = products.filter(p => filter === 'all' || p.category === filter);

  return (
    <div className="animate-fade">
      {/* Search and Filters */}
      <div className="glass-card" style={{ padding: '12px', marginBottom: '16px', borderRadius: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Filter size={16} color="var(--color-green)" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Filter Categories</span>
        </div>
        
        <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', paddingBottom: '4px' }} className="no-scrollbar">
          {(['all', 'panels', 'inverters', 'accessories'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className="btn"
              style={{
                padding: '6px 14px',
                fontSize: '11px',
                borderRadius: '10px',
                whiteSpace: 'nowrap',
                background: filter === cat ? 'var(--grad-solar)' : 'rgba(255, 255, 255, 0.05)',
                color: filter === cat ? '#fff' : 'var(--text-muted)',
                border: filter === cat ? 'none' : '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div>
        {filteredProducts.map(product => (
          <div 
            key={product.id} 
            className="glass-card" 
            style={{ 
              padding: '16px', 
              borderColor: product.popular ? 'var(--border-glow)' : 'rgba(255, 255, 255, 0.06)',
              boxShadow: product.popular ? '0 4px 20px rgba(16, 185, 129, 0.1)' : '0 4px 15px rgba(0,0,0,0.2)'
            }}
          >
            {/* Popular Badge */}
            {product.popular && (
              <div 
                style={{ 
                  position: 'absolute', 
                  top: '12px', 
                  right: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  fontSize: '9px',
                  color: 'var(--color-green)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  zIndex: 2
                }}
              >
                <Sparkles size={10} /> Popular Choice
              </div>
            )}

            <div style={{ display: 'flex', gap: '14px', marginBottom: '12px' }}>
              <img 
                src={product.img} 
                alt={product.name} 
                style={{ 
                  width: '90px', 
                  height: '90px', 
                  objectFit: 'cover', 
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)'
                }} 
              />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '10px', color: 'var(--color-green)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {product.brand}
                </span>
                <h3 style={{ fontSize: '15px', color: '#fff', margin: '2px 0 6px 0' }}>{product.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Shield size={12} color="var(--color-cyan)" />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{product.warranty} Warranty</span>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px', lineHeight: '1.4' }}>
              {product.features}
            </p>

            {/* Specifications Matrix */}
            <div 
              style={{ 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: '10px', 
                padding: '10px 12px', 
                marginBottom: '14px',
                border: '1px solid rgba(255,255,255,0.04)'
              }}
            >
              {product.specs.map((spec, sIdx) => (
                <div key={sIdx} className="flex-between" style={{ fontSize: '11px', padding: '4px 0', borderBottom: sIdx < product.specs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <span style={{ color: 'var(--text-muted)' }} className="flex-gap-2">
                    <Info size={11} /> {spec.label}
                  </span>
                  <span style={{ color: '#fff', fontWeight: 500 }}>{spec.value}</span>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="flex-between">
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Estimated Cost</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-green)' }}>{product.price}</div>
              </div>
              <button 
                onClick={onOpenRequestQuote} 
                className="btn btn-primary" 
                style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px' }}
              >
                Get Quote
                <ArrowRight size={13} />
              </button>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};
