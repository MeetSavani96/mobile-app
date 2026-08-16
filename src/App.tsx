import { useState, useEffect, lazy, Suspense } from 'react';
import { Bell, User } from 'lucide-react';

// Hooks
import { useNetwork } from './hooks/useNetwork';
import { useCapacitor } from './hooks/useCapacitor';
import { useAuth } from './hooks/useAuth';

// Components
import { SplashLoader } from './components/SplashLoader';
import { Onboarding } from './components/Onboarding';
import { PullToRefresh } from './components/PullToRefresh';
import { BottomNav } from './components/BottomNav';
import type { NavTab } from './components/BottomNav';
import { ProtectedRoute } from './components/ProtectedRoute';

import { APP_CONFIG } from './config';

// ── Lazy-loaded Views ──────────────────────────────────────
// Auth
const LoginView = lazy(() => import('./views/LoginView').then(m => ({ default: m.LoginView })));
const RegisterView = lazy(() => import('./views/RegisterView').then(m => ({ default: m.RegisterView })));
const ForgotPasswordView = lazy(() => import('./views/ForgotPasswordView').then(m => ({ default: m.ForgotPasswordView })));

// Customer
const HomeView = lazy(() => import('./views/HomeView').then(m => ({ default: m.HomeView })));
const BookingsView = lazy(() => import('./views/BookingsView').then(m => ({ default: m.BookingsView })));
const InverterView = lazy(() => import('./views/InverterView').then(m => ({ default: m.InverterView })));
const CalculatorView = lazy(() => import('./views/CalculatorView').then(m => ({ default: m.CalculatorView })));
const ProfileView = lazy(() => import('./views/ProfileView').then(m => ({ default: m.ProfileView })));
const LoanView = lazy(() => import('./views/LoanView').then(m => ({ default: m.LoanView })));
const NotificationsView = lazy(() => import('./views/NotificationsView').then(m => ({ default: m.NotificationsView })));
const DocumentsView = lazy(() => import('./views/DocumentsView').then(m => ({ default: m.DocumentsView })));
const TransactionsView = lazy(() => import('./views/TransactionsView').then(m => ({ default: m.TransactionsView })));
const QueriesView = lazy(() => import('./views/QueriesView').then(m => ({ default: m.QueriesView })));

// Service Sheets
const NewSolarSheet = lazy(() => import('./views/NewSolarSheet').then(m => ({ default: m.NewSolarSheet })));
const CleaningSheet = lazy(() => import('./views/CleaningSheet').then(m => ({ default: m.CleaningSheet })));
const MaintenanceSheet = lazy(() => import('./views/MaintenanceSheet').then(m => ({ default: m.MaintenanceSheet })));

// Admin
const AdminDashboardView = lazy(() => import('./views/AdminDashboardView').then(m => ({ default: m.AdminDashboardView })));
const CustomersView = lazy(() => import('./views/CustomersView').then(m => ({ default: m.CustomersView })));
const AdminMoreView = lazy(() => import('./views/AdminMoreView').then(m => ({ default: m.AdminMoreView })));
const EnquiriesView = lazy(() => import('./views/EnquiriesView').then(m => ({ default: m.EnquiriesView })));
const AdminInstallationsView = lazy(() => import('./views/AdminInstallationsView').then(m => ({ default: m.AdminInstallationsView })));
const AdminMaintenanceView = lazy(() => import('./views/AdminMaintenanceView').then(m => ({ default: m.AdminMaintenanceView })));

export default function App() {
  const { user, login, register } = useAuth();

  // Startup: Default to login screen for unauthenticated users
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('login');

  // Service sheet modals
  const [showNewSolar, setShowNewSolar] = useState(false);
  const [showCleaning, setShowCleaning] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);

  // Connectivity
  const isOnline = useNetwork();

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  // Role-based redirect on login/logout
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        setActiveTab('admin_dashboard');
      } else {
        setActiveTab('home');
      }
    } else {
      setActiveTab('login');
    }
  }, [user]);

  // Handle tab changes that trigger modals
  const handleNavigate = (tab: NavTab) => {
    if (tab === 'new_solar') { setShowNewSolar(true); return; }
    if (tab === 'cleaning') { setShowCleaning(true); return; }
    if (tab === 'maintenance') { setShowMaintenance(true); return; }
    if (tab === 'loan') { setActiveTab('loan'); return; }
    if (tab === 'login' || tab === 'register' || tab === 'forgot_password') { setActiveTab(tab); return; }
    setActiveTab(tab);
  };

  // Hardware back button
  useCapacitor({
    onBackPress: () => {
      if (showNewSolar) { setShowNewSolar(false); return true; }
      if (showCleaning) { setShowCleaning(false); return true; }
      if (showMaintenance) { setShowMaintenance(false); return true; }

      // Navigate back from sub-screens
      const subScreenParent: Record<string, NavTab> = {
        notifications: 'profile', documents: 'profile', transactions: 'profile',
        queries: 'profile', edit_profile: 'profile', loan: 'home',
        admin_inverters: 'admin_more', admin_maintenance: 'admin_more',
        admin_enquiries: 'admin_more', admin_loans: 'admin_more',
        admin_queries: 'admin_more', admin_transactions: 'admin_more',
        admin_documents: 'admin_more', admin_activity: 'admin_more',
        admin_notifications: 'admin_more', admin_settings: 'admin_more',
        admin_customer_detail: 'customers',
        login: 'login', register: 'login', forgot_password: 'login',
      };

      if (subScreenParent[activeTab] && activeTab !== 'login') {
        setActiveTab(subScreenParent[activeTab]);
        return true;
      }

      const defaultTab = (user?.role === 'admin') ? 'admin_dashboard' : (user ? 'home' : 'login');
      if (activeTab !== defaultTab) {
        setActiveTab(defaultTab);
        return true;
      }
      return false;
    }
  });

  // Splash + Onboarding
  const handleSplashComplete = () => {
    setShowSplash(false);
    if (!localStorage.getItem('akv_onboarded')) setShowOnboarding(true);
  };

  const handleOnboardingComplete = () => setShowOnboarding(false);

  const handlePullRefresh = async () => {
    return new Promise<void>((resolve) => {
      setTimeout(() => { resolve(); }, 800);
    });
  };

  // ── Startup screens ──────────────────────────────────────
  if (showSplash) return <SplashLoader onComplete={handleSplashComplete} />;
  if (showOnboarding) return <Onboarding onComplete={handleOnboardingComplete} />;

  // Auth pages rendered as full-screen overlays
  const isAuthPage = activeTab === 'login' || activeTab === 'register' || activeTab === 'forgot_password';
  const hideHeader = isAuthPage || activeTab === 'loan';

  // Loading fallback
  const LoadingFallback = (
    <div className="loading-center" style={{ minHeight: '200px' }}>
      <div className="spinner" />
      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading...</p>
    </div>
  );

  return (
    <div className="app-container">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner">
          ⚠️ You're offline — Some information may not be up to date.
        </div>
      )}

      {/* Header */}
      {!hideHeader && (
        <header className="app-header">
          <div className="app-header-inner">
            <div className="app-header-brand">
              <img src={APP_CONFIG.logoUrl} alt="AKV Energy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span>AKV Energy</span>
            </div>
            <div className="app-header-actions">
              {user && (
                <button className="header-icon-btn" onClick={() => handleNavigate('notifications')}>
                  <Bell size={18} />
                </button>
              )}
              <button className="header-icon-btn" onClick={() => handleNavigate(user ? 'profile' : 'login')}>
                <User size={18} />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Viewport */}
      <main className="view-port">
        <PullToRefresh onRefresh={handlePullRefresh}>
          <Suspense fallback={LoadingFallback}>
            {/* ── Auth Views ──────────────────────────────── */}
            {activeTab === 'login' && (
              <LoginView
                onLogin={login}
                onSwitchToRegister={() => setActiveTab('register')}
                onForgotPassword={() => setActiveTab('forgot_password')}
              />
            )}
            {activeTab === 'register' && (
              <RegisterView
                onRegister={register}
                onSwitchToLogin={() => setActiveTab('login')}
              />
            )}
            {activeTab === 'forgot_password' && (
              <ForgotPasswordView
                onBackToLogin={() => setActiveTab('login')}
              />
            )}

            {/* ── Customer Views ──────────────────────────── */}
            {activeTab === 'home' && <HomeView onNavigate={handleNavigate} />}
            {activeTab === 'bookings' && <BookingsView />}
            {activeTab === 'inverter' && <InverterView />}
            {activeTab === 'calculator' && <CalculatorView />}
            {activeTab === 'profile' && <ProfileView onNavigate={handleNavigate} />}
            {activeTab === 'loan' && <LoanView onClose={() => setActiveTab('home')} />}
            {activeTab === 'notifications' && <NotificationsView />}
            {activeTab === 'documents' && <DocumentsView />}
            {activeTab === 'transactions' && <TransactionsView />}
            {activeTab === 'queries' && <QueriesView />}

            {/* ── Admin Views ─────────────────────────────── */}
            {activeTab === 'admin_dashboard' && (
              <ProtectedRoute allowedRoles={['admin']} fallbackTabSetter={setActiveTab}>
                <AdminDashboardView 
                  onNavigateTab={handleNavigate}
                  onSelectCustomer={(customerId) => {
                    setSelectedCustomerId(customerId);
                    setActiveTab('customers');
                  }}
                />
              </ProtectedRoute>
            )}
            {activeTab === 'customers' && (
              <ProtectedRoute allowedRoles={['admin']} fallbackTabSetter={setActiveTab}>
                <CustomersView 
                  initialCustomerId={selectedCustomerId}
                  onClearInitialCustomerId={() => setSelectedCustomerId(null)}
                />
              </ProtectedRoute>
            )}
            {activeTab === 'admin_bookings' && (
              <ProtectedRoute allowedRoles={['admin']} fallbackTabSetter={setActiveTab}>
                <BookingsView />
              </ProtectedRoute>
            )}
            {activeTab === 'admin_projects' && (
              <ProtectedRoute allowedRoles={['admin']} fallbackTabSetter={setActiveTab}>
                <AdminInstallationsView />
              </ProtectedRoute>
            )}
            {activeTab === 'admin_more' && (
              <ProtectedRoute allowedRoles={['admin']} fallbackTabSetter={setActiveTab}>
                <AdminMoreView onNavigate={handleNavigate} />
              </ProtectedRoute>
            )}
            {activeTab === 'admin_enquiries' && (
              <ProtectedRoute allowedRoles={['admin']} fallbackTabSetter={setActiveTab}>
                <EnquiriesView />
              </ProtectedRoute>
            )}
            {activeTab === 'admin_maintenance' && (
              <ProtectedRoute allowedRoles={['admin']} fallbackTabSetter={setActiveTab}>
                <AdminMaintenanceView />
              </ProtectedRoute>
            )}
            {activeTab === 'admin_activity' && (
              <ProtectedRoute allowedRoles={['admin']} fallbackTabSetter={setActiveTab}>
                <div className="view-content animate-fade">
                  <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '16px' }}>Activity Logs</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>Track all customer and system activity.</p>
                </div>
              </ProtectedRoute>
            )}
            {/* Other admin sub-screens render similarly */}
          </Suspense>
        </PullToRefresh>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onChangeTab={handleNavigate} />

      {/* ── Service Sheet Modals ────────────────────────────── */}
      {showNewSolar && (
        <Suspense fallback={null}>
          <NewSolarSheet onClose={() => setShowNewSolar(false)} />
        </Suspense>
      )}
      {showCleaning && (
        <Suspense fallback={null}>
          <CleaningSheet onClose={() => setShowCleaning(false)} />
        </Suspense>
      )}
      {showMaintenance && (
        <Suspense fallback={null}>
          <MaintenanceSheet onClose={() => setShowMaintenance(false)} />
        </Suspense>
      )}
    </div>
  );
}
