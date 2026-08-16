import React from 'react';
import { 
  ClipboardList, Wrench, Banknote, MessageCircle, CreditCard,
  FileText, Bell, Settings, LogOut, Activity
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PageHeader, MenuItem } from '../components/ui';
import type { NavTab } from '../components/BottomNav';

interface AdminMoreViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const AdminMoreView: React.FC<AdminMoreViewProps> = ({ onNavigate }) => {
  const { logout } = useAuth();

  const sections = [
    {
      title: 'Operations',
      items: [
        { icon: <ClipboardList />, bg: '#e8f0fe', color: 'var(--primary)', title: 'Enquiries', subtitle: 'Solar & service enquiries', tab: 'admin_enquiries' as NavTab },
        { icon: <Wrench />, bg: '#e6f7f0', color: 'var(--success)', title: 'Maintenance', subtitle: 'Maintenance requests', tab: 'admin_maintenance' as NavTab },
      ],
    },
    {
      title: 'Finance',
      items: [
        { icon: <Banknote />, bg: '#e6f7f0', color: 'var(--success)', title: 'Loans', subtitle: 'Loan enquiries', tab: 'admin_loans' as NavTab },
        { icon: <CreditCard />, bg: 'var(--warning-light)', color: 'var(--warning)', title: 'Transactions', subtitle: 'Payment records', tab: 'admin_transactions' as NavTab },
      ],
    },
    {
      title: 'Communication',
      items: [
        { icon: <MessageCircle />, bg: '#e8f0fe', color: 'var(--primary)', title: 'Queries', subtitle: 'Customer support tickets', tab: 'admin_queries' as NavTab },
        { icon: <FileText />, bg: '#f1f3f4', color: 'var(--text-secondary)', title: 'Documents', subtitle: 'Document management', tab: 'admin_documents' as NavTab },
        { icon: <Bell />, bg: 'var(--info-light)', color: 'var(--info)', title: 'Notifications', subtitle: 'Send & manage', tab: 'admin_notifications' as NavTab },
      ],
    },
    {
      title: 'System',
      items: [
        { icon: <Activity />, bg: '#e8f0fe', color: 'var(--primary)', title: 'Activity Logs', subtitle: 'Track all activity', tab: 'admin_activity' as NavTab },
        { icon: <Settings />, bg: '#f1f3f4', color: 'var(--text-secondary)', title: 'Settings', subtitle: 'App configuration', tab: 'admin_settings' as NavTab },
      ],
    },
  ];

  return (
    <div className="view-content animate-fade">
      <PageHeader title="More" subtitle="Admin management" />

      {sections.map((section, sIdx) => (
        <div key={sIdx} style={{ marginBottom: '16px' }}>
          <p className="section-subtitle">{section.title}</p>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {section.items.map((item, idx) => (
              <MenuItem
                key={idx}
                icon={item.icon}
                iconBg={item.bg}
                iconColor={item.color}
                title={item.title}
                subtitle={item.subtitle}
                onClick={() => onNavigate(item.tab)}
              />
            ))}
          </div>
        </div>
      ))}

      <button
        className="btn btn-block"
        onClick={logout}
        style={{ background: 'var(--error-light)', color: 'var(--error)', fontWeight: 500, marginBottom: '20px' }}
      >
        <LogOut size={16} />
        Logout
      </button>
    </div>
  );
};
