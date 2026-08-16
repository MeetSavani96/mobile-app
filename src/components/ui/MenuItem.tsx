import React from 'react';
import { ChevronRight } from 'lucide-react';

interface MenuItemProps {
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  rightContent?: React.ReactNode;
}

export const MenuItem: React.FC<MenuItemProps> = ({ icon, iconBg, iconColor, title, subtitle, onClick, rightContent }) => (
  <div className="profile-menu-item" onClick={onClick}>
    <div className="menu-icon" style={{ background: iconBg || 'var(--primary-light)' }}>
      {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { color: iconColor || 'var(--primary)', size: 18 }) : icon}
    </div>
    <div className="menu-text">
      <h4>{title}</h4>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {rightContent || <ChevronRight size={16} color="var(--text-muted)" />}
  </div>
);
