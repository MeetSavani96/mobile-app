import React, { useState, useEffect } from 'react';
import { CreditCard, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { apiFetch } from '../utils/api';

export const TransactionsView: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTxns(); }, []);

  const fetchTxns = async () => {
    setLoading(true);
    const result = await apiFetch('customer_transactions');
    if (result.ok && result.data) setTransactions(result.data.transactions || []);
    setLoading(false);
  };

  const statusBadge: Record<string, { cls: string; icon: React.ReactNode }> = {
    pending: { cls: 'badge-warning', icon: <Clock size={10} /> },
    paid: { cls: 'badge-success', icon: <CheckCircle size={10} /> },
    failed: { cls: 'badge-error', icon: <XCircle size={10} /> },
    refunded: { cls: 'badge-info', icon: <RefreshCw size={10} /> },
  };

  if (loading) return <div className="view-content"><div className="loading-center"><div className="spinner" /><p>Loading transactions...</p></div></div>;

  return (
    <div className="view-content animate-fade">
      <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '16px' }}>Transactions</h2>
      {transactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ background: 'var(--warning-light)' }}><CreditCard size={36} color="var(--warning)" /></div>
          <h3>No Transactions</h3>
          <p>Your payment history and transaction records will appear here.</p>
        </div>
      ) : transactions.map((txn: any) => (
        <div key={txn.id} className="list-card">
          <div className="list-card-header">
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700 }}>{txn.transaction_id}</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{txn.description || 'Payment'}</p>
            </div>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              ₹{parseFloat(txn.amount).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex-between">
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {txn.created_at ? new Date(txn.created_at).toLocaleDateString('en-IN') : '-'}
            </span>
            <span className={`badge ${statusBadge[txn.payment_status]?.cls || 'badge-gray'}`}>
              {statusBadge[txn.payment_status]?.icon} {txn.payment_status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
