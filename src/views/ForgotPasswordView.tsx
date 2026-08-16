import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface ForgotPasswordViewProps {
  onBackToLogin: () => void;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const result = await apiFetch('forgot_password', {
      method: 'POST',
      body: JSON.stringify({ email: trimmedEmail }),
    });

    if (result.ok) {
      setSuccess(true);
      setMessage(result.data?.message || 'Instructions have been sent to your email.');
    } else {
      setError(result.message || 'Failed to submit password reset request.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div style={{ padding: '16px', paddingTop: 'calc(var(--safe-top) + 16px)' }}>
        <button onClick={onBackToLogin} className="btn btn-ghost" style={{ color: 'white', gap: '6px' }}>
          <ArrowLeft size={18} /> Back to Login
        </button>
      </div>

      <div className="auth-panel-bottom animate-slide" style={{ marginTop: 'auto', flex: 'none', borderRadius: '28px' }}>
        <h2 className="auth-panel-title">Forgot Password</h2>
        <p className="auth-panel-subtitle">
          Enter your registered email address to receive password reset instructions.
        </p>

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--success-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <CheckCircle size={32} color="var(--success)" />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
              {message}
            </p>
            <button className="btn btn-primary btn-block" onClick={onBackToLogin}>
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div style={{
                background: 'var(--error-light)',
                color: 'var(--error)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="form-input-with-icon">
                <span className="input-icon"><Mail size={18} /></span>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Enter email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  autoCapitalize="none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                  <span>Submitting...</span>
                </div>
              ) : 'Submit Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
