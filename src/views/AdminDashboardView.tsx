import React, { useEffect, useState, useRef } from 'react';
import { 
  Users, FileText, CheckCircle, AlertCircle, RefreshCw,
  Clock, TrendingUp, UserPlus, CalendarCheck, FolderKanban, Wrench,
  Search, ChevronRight, X
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { SectionHeader, StatCard } from '../components/ui';
import type { NavTab } from '../components/BottomNav';
import { useCustomerSearch } from '../hooks/useCustomerSearch';

interface AdminDashboardProps {
  onNavigateTab?: (tab: NavTab) => void;
  onSelectCustomer?: (customerId: number) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardProps> = ({ onNavigateTab, onSelectCustomer }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    searchError,
    clearSearch
  } = useCustomerSearch();

  const fetchStats = async () => {
    setLoading(true);
    setErrorMsg('');
    const result = await apiFetch('admin_dashboard');
    if (result.ok && result.data) {
      setStats(result.data.data || result.data);
    } else {
      setErrorMsg(result.error || 'Failed to load dashboard.');
    }
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const handleClear = () => {
    clearSearch();
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleCustomerClick = (customerId: number) => {
    if (onSelectCustomer) {
      onSelectCustomer(customerId);
    } else if (onNavigateTab) {
      onNavigateTab('customers');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const formatAction = (action: string) =>
    action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (loading) {
    return (
      <div className="view-content animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ height: '60px', borderRadius: '12px', background: 'var(--bg-input)', animation: 'pulse 1.5s infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: '70px', borderRadius: '12px', background: 'var(--bg-input)', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
        <div style={{ height: '100px', borderRadius: '12px', background: 'var(--bg-input)', animation: 'pulse 1.5s infinite' }} />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="view-content animate-fade">
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <AlertCircle size={32} color="var(--error)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <h3 style={{ fontSize: '16px', marginBottom: '6px' }}>Unable to load dashboard</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>{errorMsg}</p>
          <button onClick={fetchStats} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const monthlyEnquiries = stats?.monthly_enquiries ?? [];
  const maxEnq = monthlyEnquiries.length > 0 ? Math.max(...monthlyEnquiries.map((m: any) => Number(m.total))) : 10;
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="view-content animate-fade">
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '2px' }}>
          {getGreeting()}, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Here&apos;s today&apos;s overview</p>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div className="search-bar" style={{ position: 'relative' }}>
          <Search size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Search customer by name, phone or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchLoading && (
            <div style={{ 
              width: '14px', 
              height: '14px', 
              border: '2px solid var(--border-light)', 
              borderTopColor: 'var(--primary)', 
              borderRadius: '50%', 
              animation: 'spin 0.6s linear infinite',
              flexShrink: 0 
            }} />
          )}
          {searchQuery && (
            <button 
              type="button"
              onClick={handleClear} 
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
                flexShrink: 0
              }}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* When active search query is entered, display compact search-results section */}
      {isSearching ? (
        <div className="animate-fade" style={{ marginTop: '8px' }}>
          {searchLoading && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <div className="spinner" style={{ width: '18px', height: '18px' }} />
              Searching customers…
            </div>
          )}

          {!searchLoading && searchError && (
            <div className="card" style={{ padding: '16px', background: 'var(--error-light)', color: 'var(--error)', fontSize: '13px' }}>
              {searchError}
            </div>
          )}

          {!searchLoading && !searchError && searchResults.length === 0 && (
            <div className="card animate-scale" style={{ textAlign: 'center', padding: '32px 20px', borderRadius: 'var(--radius-lg)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                No customers found
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Try searching by name, phone or email.
              </p>
            </div>
          )}

          {!searchLoading && searchResults.length > 0 && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Search results{searchResults.length > 1 ? ` · ${searchResults.length}` : ''}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {searchResults.map((cust) => (
                  <div 
                    key={cust.id}
                    className="card"
                    onClick={() => handleCustomerClick(cust.id)}
                    style={{ 
                      padding: '14px 16px', 
                      cursor: 'pointer', 
                      marginBottom: 0,
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-light)',
                      boxShadow: 'var(--shadow-xs)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cust.full_name}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <span>{cust.phone}</span>
                          {cust.email && <span>{cust.email}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
                        <span className="badge badge-primary" style={{ fontSize: '11px', padding: '3px 8px' }}>
                          Customer
                        </span>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Normal Dashboard Content (shown when search is cleared/empty) */
        <>
          <div className="grid-2" style={{ marginBottom: '16px' }}>
            <StatCard label="Customers" value={stats?.total_customers ?? 0} icon={<Users size={16} />} iconColor="var(--primary)" />
            <StatCard label="Enquiries" value={stats?.total_enquiries ?? 0} icon={<FileText size={16} />} iconColor="var(--info)" />
            <StatCard label="Pending" value={stats?.pending_enquiries ?? 0} icon={<Clock size={16} />} iconColor="var(--warning)" />
            <StatCard label="Approved" value={stats?.approved_enquiries ?? 0} icon={<CheckCircle size={16} />} iconColor="var(--success)" />
          </div>

          <SectionHeader title="Quick Actions" />
          <div className="grid-2" style={{ marginBottom: '16px' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => onNavigateTab?.('customers')}
              style={{ flexDirection: 'column', padding: '14px 8px', gap: '6px', fontSize: '12px', fontWeight: 500 }}
            >
              <UserPlus size={18} color="var(--primary)" />
              New Customer
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => onNavigateTab?.('admin_bookings')}
              style={{ flexDirection: 'column', padding: '14px 8px', gap: '6px', fontSize: '12px', fontWeight: 500 }}
            >
              <CalendarCheck size={18} color="var(--primary)" />
              New Booking
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => onNavigateTab?.('admin_projects')}
              style={{ flexDirection: 'column', padding: '14px 8px', gap: '6px', fontSize: '12px', fontWeight: 500 }}
            >
              <FolderKanban size={18} color="var(--primary)" />
              New Project
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => onNavigateTab?.('admin_maintenance')}
              style={{ flexDirection: 'column', padding: '14px 8px', gap: '6px', fontSize: '12px', fontWeight: 500 }}
            >
              <Wrench size={18} color="var(--primary)" />
              Maintenance
            </button>
          </div>

          <SectionHeader 
            title="Recent Activity" 
            actionLabel="View all"
            onAction={() => onNavigateTab?.('admin_activity')}
          />

          <div className="card" style={{ padding: '4px 0' }}>
            {stats?.recent_activity && stats.recent_activity.length > 0 ? (
              stats.recent_activity.slice(0, 5).map((act: any, idx: number) => (
                <div 
                  key={idx} 
                  style={{ 
                    padding: '12px 16px',
                    borderBottom: idx < Math.min(stats.recent_activity.length, 5) - 1 ? '1px solid var(--border-light)' : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {formatAction(act.action)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {act.actor || 'System'}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                    {formatTimeAgo(act.created_at)}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No recent activity
              </div>
            )}
          </div>

          <SectionHeader title="Monthly Enquiries" />
          <div className="card">
            {monthlyEnquiries.length > 0 ? (
              <div style={{ height: '80px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '8px', paddingTop: '8px' }}>
                {monthlyEnquiries.map((m: any, idx: number) => (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-secondary)' }}>{m.total}</span>
                    <div style={{ 
                      width: '100%', maxWidth: '32px',
                      height: `${Math.max((m.total / maxEnq) * 50, 4)}px`, 
                      background: 'var(--primary)', borderRadius: '3px 3px 0 0',
                      transition: 'height 0.3s ease'
                    }} />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{m.month.split('-')[1]}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <TrendingUp size={20} color="var(--text-muted)" style={{ marginBottom: '6px' }} />
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No enquiry data yet</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
