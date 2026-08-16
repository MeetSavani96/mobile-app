import React, { useState, useEffect } from 'react';
import { 
  User, FileText, CreditCard, MessageCircle, Bell, 
  Settings, LogOut, LogIn, Edit3, Wrench, HelpCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';
import { MenuItem } from '../components/ui';
import type { NavTab } from '../components/BottomNav';

interface ProfileViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ bookings: 0, capacity: 0 });

  useEffect(() => {
    if (user) {
      apiFetch('customer_profile_stats').then(r => {
        if (r.ok && r.data) {
          setStats({
            bookings: r.data.total_bookings || 0,
            capacity: r.data.solar_capacity || 0,
          });
        }
      });
    }
  }, [user]);

  if (!user) {
    return (
      <div className="view-content animate-fade">
        <div className="empty-state" style={{ paddingTop: '60px' }}>
          <div className="empty-state-icon">
            <User size={28} color="var(--primary)" />
          </div>
          <h3>Welcome to AKV Energy</h3>
          <p>Login or create an account to manage your solar installation</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('login')}>
              <LogIn size={16} /> Login
            </button>
            <button className="btn btn-outline" onClick={() => onNavigate('register')}>
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const initials = user.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U';

  return (
    <div className="view-content animate-fade">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          {user.profile_photo ? (
            <img src={user.profile_photo} alt={user.name} />
          ) : initials}
        </div>
        {user.is_akv_customer && (
          <span className="badge badge-success" style={{ marginBottom: '6px' }}>
            ⚡ AKV Energy Customer
          </span>
        )}
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{user.name}</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{user.email}</p>
      </div>

      {/* Stats */}
      <div className="grid-2" style={{ marginBottom: '16px' }}>
        <div className="stat-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--primary)' }}>{stats.bookings}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bookings</div>
        </div>
        <div className="stat-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--success)' }}>{stats.capacity} kW</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Solar Capacity</div>
        </div>
      </div>

      {/* Account Section */}
      <p className="section-subtitle">Account</p>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '12px' }}>
        <MenuItem icon={<Edit3 />} iconBg="#e8f0fe" iconColor="var(--primary)" title="Personal Information" subtitle="Update your details" onClick={() => onNavigate('edit_profile')} />
        <MenuItem icon={<FileText />} iconBg="#e6f7f0" iconColor="var(--success)" title="Documents" subtitle="Uploaded documents" onClick={() => onNavigate('documents')} />
        <MenuItem icon={<CreditCard />} iconBg="var(--warning-light)" iconColor="var(--warning)" title="Transactions" subtitle="Payment history" onClick={() => onNavigate('transactions')} />
      </div>

      {/* Support Section */}
      <p className="section-subtitle">Support</p>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '12px' }}>
        <MenuItem icon={<MessageCircle />} iconBg="var(--info-light)" iconColor="var(--info)" title="My Queries" subtitle="Support tickets" onClick={() => onNavigate('queries')} />
        <MenuItem icon={<Wrench />} iconBg="#e6f7f0" iconColor="var(--success)" title="Maintenance" subtitle="Service requests" onClick={() => onNavigate('maintenance')} />
        <MenuItem icon={<HelpCircle />} iconBg="#f1f3f4" iconColor="var(--text-secondary)" title="Help & FAQ" subtitle="Get help" onClick={() => {}} />
      </div>

      {/* Settings Section */}
      <p className="section-subtitle">Settings</p>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '12px' }}>
        <MenuItem icon={<Bell />} iconBg="#e8f0fe" iconColor="var(--primary)" title="Notifications" subtitle="Alerts & updates" onClick={() => onNavigate('notifications')} />
        <MenuItem icon={<Settings />} iconBg="#f1f3f4" iconColor="var(--text-secondary)" title="App Settings" subtitle="Preferences" onClick={() => onNavigate('edit_profile')} />
      </div>

      {/* Logout */}
      <button
        className="btn btn-block"
        onClick={logout}
        style={{ 
          background: 'var(--error-light)', color: 'var(--error)',
          fontWeight: 500, marginBottom: '20px'
        }}
      >
        <LogOut size={16} />
        Logout
      </button>
    </div>
  );
};
