import React, { useEffect, useState } from 'react';
import { APP_CONFIG } from '../config';

interface SplashLoaderProps {
  onComplete: () => void;
}

export const SplashLoader: React.FC<SplashLoaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 300);
          return 100;
        }
        return prev + 4;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <img
        src={APP_CONFIG.logoUrl}
        alt="AKV Energy"
        style={{ width: '64px', height: '64px', borderRadius: '16px', marginBottom: '16px' }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1a73e8', marginBottom: '4px' }}>
        AKV ENERGY
      </h1>
      <p style={{ fontSize: '13px', color: '#9aa0a6', marginBottom: '24px' }}>Solar Management Platform</p>
      
      <div style={{ width: '140px', height: '4px', background: '#e8eaed', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: '#1a73e8',
          borderRadius: '2px',
          transition: 'width 0.1s linear',
        }} />
      </div>
    </div>
  );
};
