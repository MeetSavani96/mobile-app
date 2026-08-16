import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, Phone, MapPin, Home, ArrowLeft, CheckCircle } from 'lucide-react';
import type { RegisterData } from '../context/AuthContext';

interface RegisterViewProps {
  onRegister: (data: RegisterData) => Promise<{ success: boolean; error?: string; message?: string; isNetworkError?: boolean }>;
  onSwitchToLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onRegister, onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!name.trim()) errors.name = 'Full name is required.';
    if (!email.trim()) errors.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email address.';
    if (!password) errors.password = 'Password is required.';
    else if (password.length < 6) errors.password = 'Password must be at least 6 characters.';
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    if (!phone.trim()) errors.phone = 'Mobile number is required.';
    else if (!/^[6-9]\d{9}$/.test(phone.replace(/\s/g, ''))) errors.phone = 'Please enter a valid 10-digit Indian mobile number.';
    if (!city.trim()) errors.city = 'City is required.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validate()) return;

    setLoading(true);
    const result = await onRegister({
      name: name.trim(),
      email: email.trim(),
      password,
      phone: phone.trim(),
      city: city.trim(),
      address: address.trim() || undefined,
    });

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.message || result.error || 'Registration failed.');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-panel-bottom animate-slide" style={{ margin: 'auto', textAlign: 'center', justifyContent: 'center' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'var(--success-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <CheckCircle size={36} color="var(--success)" />
          </div>
          <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Account Created Successfully</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>
            Welcome to AKV Energy
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div style={{ padding: '16px', paddingTop: 'calc(var(--safe-top) + 16px)', flexShrink: 0 }}>
        <button onClick={onSwitchToLogin} className="btn btn-ghost" style={{ color: 'white', gap: '6px' }}>
          <ArrowLeft size={18} /> Back to Login
        </button>
      </div>

      <div className="auth-panel-bottom animate-slide">
        <div style={{ marginBottom: '20px' }}>
          <h1 className="auth-panel-title">Create Account</h1>
          <p className="auth-panel-subtitle">Join AKV Energy and manage your solar installation</p>
        </div>

        {error && (
          <div style={{
            background: 'var(--error-light)', color: 'var(--error)',
            padding: '12px 16px', borderRadius: 'var(--radius-md)',
            fontSize: '13px', fontWeight: 500, marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <div className="form-input-with-icon">
              <span className="input-icon"><User size={18} /></span>
              <input
                type="text"
                className={`form-input ${fieldErrors.name ? 'error' : ''}`}
                placeholder="Enter your full name"
                value={name}
                onChange={e => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: '' })); }}
                autoComplete="name"
              />
            </div>
            {fieldErrors.name && <span className="form-error">{fieldErrors.name}</span>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <div className="form-input-with-icon">
              <span className="input-icon"><Mail size={18} /></span>
              <input
                type="email"
                className={`form-input ${fieldErrors.email ? 'error' : ''}`}
                placeholder="Enter your email address"
                value={email}
                onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: '' })); }}
                autoComplete="email"
                autoCapitalize="none"
              />
            </div>
            {fieldErrors.email && <span className="form-error">{fieldErrors.email}</span>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password *</label>
            <div className="form-input-with-icon">
              <span className="input-icon"><Lock size={18} /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${fieldErrors.password ? 'error' : ''}`}
                placeholder="Create a password (min 6 chars)"
                value={password}
                onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })); }}
                autoComplete="new-password"
                style={{ paddingRight: '44px' }}
              />
              <button type="button" className="input-action" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && <span className="form-error">{fieldErrors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label">Confirm Password *</label>
            <div className="form-input-with-icon">
              <span className="input-icon"><Lock size={18} /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${fieldErrors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirmPassword: '' })); }}
                autoComplete="new-password"
              />
            </div>
            {fieldErrors.confirmPassword && <span className="form-error">{fieldErrors.confirmPassword}</span>}
          </div>

          {/* Mobile */}
          <div className="form-group">
            <label className="form-label">Mobile Number *</label>
            <div className="form-input-with-icon">
              <span className="input-icon"><Phone size={18} /></span>
              <input
                type="tel"
                className={`form-input ${fieldErrors.phone ? 'error' : ''}`}
                placeholder="10-digit mobile number"
                value={phone}
                onChange={e => { setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10)); setFieldErrors(p => ({ ...p, phone: '' })); }}
                autoComplete="tel"
              />
            </div>
            {fieldErrors.phone && <span className="form-error">{fieldErrors.phone}</span>}
          </div>

          {/* City */}
          <div className="form-group">
            <label className="form-label">City *</label>
            <div className="form-input-with-icon">
              <span className="input-icon"><MapPin size={18} /></span>
              <input
                type="text"
                className={`form-input ${fieldErrors.city ? 'error' : ''}`}
                placeholder="Enter your city"
                value={city}
                onChange={e => { setCity(e.target.value); setFieldErrors(p => ({ ...p, city: '' })); }}
              />
            </div>
            {fieldErrors.city && <span className="form-error">{fieldErrors.city}</span>}
          </div>

          {/* Address (optional) */}
          <div className="form-group">
            <label className="form-label">Address <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></label>
            <div className="form-input-with-icon">
              <span className="input-icon" style={{ top: '20px', transform: 'none' }}><Home size={18} /></span>
              <textarea
                className="form-textarea"
                placeholder="Enter your full address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                style={{ paddingLeft: '44px', minHeight: '70px' }}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                <span>Creating Account...</span>
              </div>
            ) : 'Create Account'}
          </button>
        </form>

        {/* Login Link */}
        <div style={{ textAlign: 'center', marginTop: '20px', paddingBottom: '20px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '14px', padding: 0 }}
            >
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
