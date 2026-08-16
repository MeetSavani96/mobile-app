import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  iconColor?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, iconColor, onClick }) => (
  <div
    className="stat-card"
    style={{ cursor: onClick ? 'pointer' : 'default', textAlign: 'left' }}
    onClick={onClick}
  >
    {icon && (
      <div style={{ color: iconColor || 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {icon}
        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>{label}</span>
      </div>
    )}
    <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
    {!icon && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>}
  </div>
);
