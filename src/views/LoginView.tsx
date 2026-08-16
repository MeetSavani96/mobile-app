import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Sun } from 'lucide-react';

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string; message?: string; isNetworkError?: boolean }>;
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onSwitchToRegister, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('akv_remember_email');
    if (saved) setEmail(saved);
  }, []);

  const validate = (): boolean => {
    let valid = true;
    setEmailError('');
    setPasswordError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Please enter your email address.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address.');
      valid = false;
    }

    if (!password) {
      setPasswordError('Please enter your password.');
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setLoading(true);
    const result = await onLogin(email.trim(), password);

    if (!result.success) {
      setError(result.message || result.error || 'Invalid email or password. Please try again.');
    } else {
      localStorage.setItem('akv_remember_email', email.trim());
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      {/* Top Blue Header */}
      <div className="auth-header-top">
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '10px',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}>
          <Sun size={32} color="#ffffff" />
        </div>
        <h1>AKV Energy</h1>
        <p>Smart Solar Management Platform</p>
      </div>

      {/* Bottom Panel */}
      <div className="auth-panel-bottom animate-slide">
        <h2 className="auth-panel-title">Login</h2>
        <p className="auth-panel-subtitle">Welcome to AKV Energy</p>

        {error && (
          <div style={{
            background: 'var(--error-light)',
            color: 'var(--error)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="form-input-with-icon">
              <span className="input-icon"><Mail size={18} /></span>
              <input
                type="email"
                className={`form-input ${emailError ? 'error' : ''}`}
                placeholder="Enter email address"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                autoComplete="email"
                autoCapitalize="none"
              />
            </div>
            {emailError && <span className="form-error">{emailError}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="form-input-with-icon">
              <span className="input-icon"><Lock size={18} /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${passwordError ? 'error' : ''}`}
                placeholder="Enter password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                autoComplete="current-password"
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordError && <span className="form-error">{passwordError}</span>}
          </div>

          <div style={{ textAlign: 'right', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={onForgotPassword}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                padding: 0,
                fontFamily: 'inherit',
              }}
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                <span>Logging in...</span>
              </div>
            ) : 'Login'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'auto', paddingTop: '24px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '13px',
                padding: 0,
                fontFamily: 'inherit',
              }}
            >
              Create Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
