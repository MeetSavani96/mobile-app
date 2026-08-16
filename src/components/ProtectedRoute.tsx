import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'customer')[];
  fallbackTabSetter?: (tab: any) => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles,
  fallbackTabSetter
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-center" style={{ padding: '40px' }}>
        <div className="spinner" />
        <p>Checking authentication...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="view-content animate-fade" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--error-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <ShieldAlert size={28} color="var(--error)" />
        </div>
        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Access Denied</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          You must be logged in to view this section.
        </p>
        {fallbackTabSetter && (
          <button onClick={() => fallbackTabSetter('login')} className="btn btn-primary">
            Go to Login
          </button>
        )}
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="view-content animate-fade" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--error-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <ShieldAlert size={28} color="var(--error)" />
        </div>
        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Insufficient Permissions</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          This section is restricted to administrators.
        </p>
        {fallbackTabSetter && (
          <button onClick={() => fallbackTabSetter('home')} className="btn btn-primary">
            Back to Home
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
