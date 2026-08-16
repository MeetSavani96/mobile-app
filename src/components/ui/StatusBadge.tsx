import React from 'react';

const statusStyles: Record<string, { bg: string; color: string }> = {
  pending:     { bg: 'var(--warning-light)', color: 'var(--warning)' },
  submitted:   { bg: 'var(--info-light)',    color: 'var(--info)' },
  confirmed:   { bg: 'var(--info-light)',    color: 'var(--info)' },
  assigned:    { bg: 'var(--primary-light)',  color: 'var(--primary)' },
  in_progress: { bg: 'var(--primary-light)',  color: 'var(--primary)' },
  site_survey: { bg: 'var(--primary-light)',  color: 'var(--primary)' },
  approved:    { bg: 'var(--success-light)',  color: 'var(--success)' },
  completed:   { bg: 'var(--success-light)',  color: 'var(--success)' },
  cancelled:   { bg: 'var(--error-light)',    color: 'var(--error)' },
  rejected:    { bg: 'var(--error-light)',    color: 'var(--error)' },
  new:         { bg: 'var(--info-light)',     color: 'var(--info)' },
  online:      { bg: 'var(--success-light)',  color: 'var(--success)' },
  offline:     { bg: '#f1f3f4',              color: 'var(--text-muted)' },
  warning:     { bg: 'var(--warning-light)',  color: 'var(--warning)' },
  fault:       { bg: 'var(--error-light)',    color: 'var(--error)' },
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  icon?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, icon }) => {
  const style = statusStyles[status] || { bg: '#f1f3f4', color: 'var(--text-secondary)' };
  const displayText = label || status.replace(/_/g, ' ');

  return (
    <span
      className="badge"
      style={{ background: style.bg, color: style.color }}
    >
      {icon}
      {displayText}
    </span>
  );
};
