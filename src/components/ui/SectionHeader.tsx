import React from 'react';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, actionLabel, onAction }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', marginTop: '4px' }}>
    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontSize: '13px', fontWeight: 500, color: 'var(--primary)',
          display: 'flex', alignItems: 'center', gap: '2px', fontFamily: 'inherit'
        }}
      >
        {actionLabel}
        <ChevronRight size={14} />
      </button>
    )}
  </div>
);
