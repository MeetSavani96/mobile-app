import React, { useState, useEffect } from 'react';
import { CalendarCheck, Clock, MapPin } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';
import { PageHeader, StatusBadge, EmptyState } from '../components/ui';

export const BookingsView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'in_progress' | 'completed'>('in_progress');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, [activeTab]);

  const fetchBookings = async () => {
    if (!user) return;
    setLoading(true);
    const result = await apiFetch(`customer_bookings&status=${activeTab}`);
    if (result.ok && result.data) {
      setBookings(result.data.bookings || []);
    } else {
      setBookings([]);
    }
    setLoading(false);
  };

  const serviceLabel: Record<string, string> = {
    new_solar: 'New Solar',
    cleaning: 'Cleaning',
    maintenance: 'Maintenance',
    loan: 'Loan',
    other: 'Other',
  };

  return (
    <div className="view-content animate-fade">
      <PageHeader title="Bookings" subtitle="Your service bookings" />

      {/* Tabs */}
      <div className="tab-header">
        <button className={`tab-btn ${activeTab === 'in_progress' ? 'active' : ''}`} onClick={() => setActiveTab('in_progress')}>
          In Progress
        </button>
        <button className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
          Completed
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="loading-center">
          <div className="spinner" />
          <p>Loading bookings...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && bookings.length === 0 && (
        <EmptyState
          icon={<CalendarCheck size={28} color="var(--primary)" />}
          title="No bookings yet"
          description="Your service bookings will appear here once you book a service."
        />
      )}

      {/* Bookings List */}
      {!loading && bookings.map((booking: any) => (
        <div key={booking.id} className="list-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{booking.booking_id}</span>
              <h4 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
                {serviceLabel[booking.service_type] || booking.service_type}
              </h4>
            </div>
            <StatusBadge status={booking.status || 'pending'} />
          </div>

          {booking.customer_name && (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              {booking.customer_name}
              {booking.customer_phone && <span style={{ color: 'var(--text-muted)' }}> · {booking.customer_phone}</span>}
            </div>
          )}

          {booking.notes && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', lineHeight: 1.4 }}>
              {booking.notes}
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            {booking.preferred_date && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} />
                {new Date(booking.preferred_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
            {booking.location && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} />
                {booking.location}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
