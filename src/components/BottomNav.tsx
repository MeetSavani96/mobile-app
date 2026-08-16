import React from 'react';
import { 
  Home, CalendarCheck, Activity, Calculator, User, 
  LayoutDashboard, Users, FolderKanban, MoreHorizontal 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export type NavTab = 
  // Customer tabs
  | 'home' | 'bookings' | 'inverter' | 'calculator' | 'profile'
  // Admin tabs
  | 'admin_dashboard' | 'customers' | 'admin_bookings' | 'admin_projects' | 'admin_more'
  // Sub-screens (no bottom nav highlight)
  | 'enquiries' | 'admin_inverters' | 'admin_maintenance' | 'admin_enquiries'
  | 'admin_loans' | 'admin_queries' | 'admin_transactions' | 'admin_documents'
  | 'admin_activity' | 'admin_notifications' | 'admin_settings'
  | 'admin_customer_detail'
  // Customer sub-screens
  | 'notifications' | 'documents' | 'transactions' | 'queries' | 'edit_profile'
  | 'new_solar' | 'cleaning' | 'maintenance' | 'loan'
  // Auth (hidden nav)
  | 'login' | 'register' | 'forgot_password';

interface BottomNavProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const { user } = useAuth();

  const hiddenTabs: NavTab[] = [
    'login', 'register', 'forgot_password',
    'new_solar', 'cleaning', 'maintenance', 'loan',
    'admin_customer_detail',
  ];
  if (hiddenTabs.includes(activeTab)) return null;

  const customerTabs = [
    { id: 'home'       as NavTab, label: 'Home',       icon: <Home size={20} /> },
    { id: 'bookings'   as NavTab, label: 'Bookings',   icon: <CalendarCheck size={20} /> },
    { id: 'inverter'   as NavTab, label: 'Inverter',   icon: <Activity size={20} /> },
    { id: 'calculator' as NavTab, label: 'Calculator', icon: <Calculator size={20} /> },
    { id: 'profile'    as NavTab, label: 'Profile',    icon: <User size={20} /> },
  ];

  const adminTabs = [
    { id: 'admin_dashboard' as NavTab, label: 'Dashboard',  icon: <LayoutDashboard size={20} /> },
    { id: 'customers'       as NavTab, label: 'Customers',  icon: <Users size={20} /> },
    { id: 'admin_bookings'  as NavTab, label: 'Bookings',   icon: <CalendarCheck size={20} /> },
    { id: 'admin_projects'  as NavTab, label: 'Projects',   icon: <FolderKanban size={20} /> },
    { id: 'admin_more'      as NavTab, label: 'More',       icon: <MoreHorizontal size={20} /> },
  ];

  const tabs = (user && user.role === 'admin') ? adminTabs : customerTabs;

  const tabMap: Record<string, NavTab> = {
    notifications: 'profile',
    documents: 'profile',
    transactions: 'profile',
    queries: 'profile',
    edit_profile: 'profile',
    admin_inverters: 'admin_more',
    admin_maintenance: 'admin_more',
    admin_enquiries: 'admin_more',
    admin_loans: 'admin_more',
    admin_queries: 'admin_more',
    admin_transactions: 'admin_more',
    admin_documents: 'admin_more',
    admin_activity: 'admin_more',
    admin_notifications: 'admin_more',
    admin_settings: 'admin_more',
    enquiries: 'admin_more',
  };

  const resolvedTab = tabMap[activeTab] || activeTab;

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`bottom-nav-item ${resolvedTab === tab.id ? 'active' : ''}`}
          onClick={() => onChangeTab(tab.id)}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};
