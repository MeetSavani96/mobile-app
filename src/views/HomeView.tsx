import React, { useState, useEffect } from 'react';
import { 
  Sun, Droplets, Wrench, ChevronRight, 
  Zap, Calculator, Activity
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { SectionHeader } from '../components/ui';
import type { NavTab } from '../components/BottomNav';

interface HomeViewProps {
  onNavigate: (tab: NavTab) => void;
}

const banners = [
  { title: 'Power Your Future\nWith Solar', subtitle: 'Clean energy for a brighter tomorrow', bg: 'linear-gradient(135deg, #e8f0fe 0%, #d1e7dd 100%)' },
  { title: 'Save More With\nAKV Energy', subtitle: 'Reduce your electricity bills by up to 90%', bg: 'linear-gradient(135deg, #e0f7f0 0%, #e8f0fe 100%)' },
  { title: 'Smart Solar.\nBetter Savings.', subtitle: 'Monitor your solar performance in real-time', bg: 'linear-gradient(135deg, #fef8e8 0%, #e8f0fe 100%)' },
];

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const services = [
    { id: 'new_solar' as NavTab, icon: <Sun size={20} />, color: '#fef8e8', iconColor: '#e8a317', title: 'New Solar', subtitle: 'Get a new solar connection' },
    { id: 'cleaning' as NavTab, icon: <Droplets size={20} />, color: '#e0f7fa', iconColor: '#0891b2', title: 'Cleaning', subtitle: 'Keep your panels performing at their best' },
    { id: 'maintenance' as NavTab, icon: <Wrench size={20} />, color: '#e6f7f0', iconColor: '#0d9f6e', title: 'Maintenance', subtitle: 'Professional solar maintenance' },
  ];

  return (
    <div className="view-content animate-fade">
      {/* ── Greeting ──────────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
          {getGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {user?.city ? `${user.city} · ` : ''}Here's your solar overview
        </p>
      </div>

      {/* ── Hero Carousel ─────────────────────────────────── */}
      <div className="hero-carousel" style={{ background: banners[currentBanner].bg }}>
        <div className="hero-slide" key={currentBanner}>
          <h2 style={{ whiteSpace: 'pre-line' }}>{banners[currentBanner].title}</h2>
          <p>{banners[currentBanner].subtitle}</p>
        </div>
      </div>
      <div className="carousel-dots" style={{ marginBottom: '20px' }}>
        {banners.map((_, i) => (
          <button key={i} className={`carousel-dot ${i === currentBanner ? 'active' : ''}`} onClick={() => setCurrentBanner(i)} />
        ))}
      </div>

      {/* ── Solar Status (No inverter = clean prompt) ──────── */}
      <div className="card" style={{ 
        padding: '16px', marginBottom: '16px',
        background: 'linear-gradient(135deg, #f0f7ff 0%, #f5faf7 100%)',
        border: '1px solid #e0eaf5'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div style={{ 
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'var(--primary-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <Activity size={18} color="var(--primary)" />
          </div>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 500 }}>Your Solar System</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No inverter connected</p>
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
          Connect your inverter to view live solar performance data.
        </p>
        <button 
          className="btn btn-sm btn-secondary" 
          onClick={() => onNavigate('inverter')}
          style={{ fontSize: '12px' }}
        >
          <Zap size={14} /> View Inverter
        </button>
      </div>

      {/* ── Services ──────────────────────────────────────── */}
      <SectionHeader title="What do you need today?" />
      {services.map(svc => (
        <div key={svc.id} className="service-card" onClick={() => onNavigate(svc.id)}>
          <div className="service-card-icon" style={{ background: svc.color }}>
            {React.cloneElement(svc.icon, { color: svc.iconColor })}
          </div>
          <div className="service-card-content">
            <h3>{svc.title}</h3>
            <p>{svc.subtitle}</p>
          </div>
          <ChevronRight size={16} color="var(--text-muted)" />
        </div>
      ))}

      {/* ── Quick Actions ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button className="btn btn-primary" style={{ flex: 1, fontSize: '13px', padding: '10px' }} onClick={() => onNavigate('calculator')}>
          <Calculator size={15} /> Calculate Savings
        </button>
        <button className="btn btn-outline" style={{ flex: 1, fontSize: '13px', padding: '10px' }} onClick={() => onNavigate('bookings')}>
          Book Service
        </button>
      </div>

      {/* ── AKV Customer Badge ────────────────────────────── */}
      {user?.is_akv_customer && (
        <div style={{ 
          marginTop: '16px', padding: '12px 16px', borderRadius: 'var(--radius-md)',
          background: 'var(--success-light)', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <Zap size={16} color="var(--success)" />
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--success)' }}>AKV Energy Customer</span>
        </div>
      )}
    </div>
  );
};
