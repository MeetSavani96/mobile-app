import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineOverlayProps {
  onRetry: () => void;
}

export const OfflineOverlay: React.FC<OfflineOverlayProps> = ({ onRetry }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '50%',
        background: 'var(--warning-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '20px',
      }}>
        <WifiOff size={32} color="var(--warning)" />
      </div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
        You're Offline
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '280px' }}>
        Some information may not be up to date. Check your internet connection and try again.
      </p>
      <button onClick={onRetry} className="btn btn-primary" style={{ gap: '8px' }}>
        <RefreshCw size={16} /> Retry
      </button>
    </div>
  );
};
