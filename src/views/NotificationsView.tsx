import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock } from 'lucide-react';
import { apiFetch } from '../utils/api';

export const NotificationsView: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const result = await apiFetch('get_notifications');
    if (result.ok && result.data) {
      setNotifications(result.data.notifications || []);
    }
    setLoading(false);
  };

  const markRead = async (id: number) => {
    await apiFetch('mark_notification_read', { method: 'POST', body: JSON.stringify({ id }) });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  };

  if (loading) return <div className="view-content"><div className="loading-center"><div className="spinner" /><p>Loading notifications...</p></div></div>;

  return (
    <div className="view-content animate-fade">
      <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '16px' }}>Notifications</h2>

      {notifications.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><Bell size={36} color="var(--primary)" /></div>
          <h3>No Notifications</h3>
          <p>You're all caught up! New notifications will appear here.</p>
        </div>
      )}

      {notifications.map((notif: any) => (
        <div
          key={notif.id}
          className="list-card"
          style={{
            background: notif.is_read ? 'var(--bg-card)' : 'var(--primary-light)',
            borderColor: notif.is_read ? 'var(--border-light)' : 'var(--primary)',
            cursor: 'pointer',
          }}
          onClick={() => !notif.is_read && markRead(notif.id)}
        >
          <div className="flex-between" style={{ marginBottom: '6px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{notif.title}</h4>
            {notif.is_read ? <CheckCheck size={14} color="var(--text-muted)" /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '6px' }}>{notif.body}</p>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={11} />
            {notif.created_at ? new Date(notif.created_at).toLocaleString('en-IN') : ''}
          </span>
        </div>
      ))}
    </div>
  );
};
