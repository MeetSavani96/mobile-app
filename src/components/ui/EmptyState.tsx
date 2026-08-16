import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  iconBg?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, iconBg }) => (
  <div className="empty-state">
    <div className="empty-state-icon" style={{ background: iconBg || 'var(--primary-light)' }}>
      {icon}
    </div>
    <h3>{title}</h3>
    <p>{description}</p>
    {action && <div style={{ marginTop: '16px' }}>{action}</div>}
  </div>
);
