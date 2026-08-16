import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft, Save, Download, Upload,
  Database, Settings, Globe, Mail, MapPin, RefreshCw
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { APP_CONFIG } from '../config';

interface AdminSettingsViewProps {
  onBack: () => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  
  // Settings Form States
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyGstin, setCompanyGstin] = useState('');
  
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpEncryption, setSmtpEncryption] = useState('tls');
  
  const [googleMapsKey, setGoogleMapsKey] = useState('');
  const [firebaseSettings, setFirebaseSettings] = useState('');
  
  const [defaultTheme, setDefaultTheme] = useState('dark');
  const [defaultLanguage, setDefaultLanguage] = useState('en');

  // Backup file upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadSettings = async () => {
    setLoading(true);
    const res = await apiFetch('get_settings');
    if (res.ok && res.data) {
      const d = res.data;
      setCompanyName(d.company_name ?? '');
      setCompanyAddress(d.company_address ?? '');
      setCompanyPhone(d.company_phone ?? '');
      setCompanyEmail(d.company_email ?? '');
      setCompanyGstin(d.company_gstin ?? '');
      
      setSmtpHost(d.smtp_host ?? '');
      setSmtpPort(d.smtp_port ?? '');
      setSmtpUser(d.smtp_user ?? '');
      setSmtpPass(d.smtp_pass ?? '');
      setSmtpEncryption(d.smtp_encryption ?? 'tls');
      
      setGoogleMapsKey(d.google_maps_key ?? '');
      setFirebaseSettings(d.firebase_settings ?? '{}');
      
      setDefaultTheme(d.default_theme ?? 'dark');
      setDefaultLanguage(d.default_language ?? 'en');
    } else {
      showToast(res.error || 'Failed to fetch settings.', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = {
      company_name: companyName,
      company_address: companyAddress,
      company_phone: companyPhone,
      company_email: companyEmail,
      company_gstin: companyGstin,
      
      smtp_host: smtpHost,
      smtp_port: smtpPort,
      smtp_user: smtpUser,
      smtp_pass: smtpPass,
      smtp_encryption: smtpEncryption,
      
      google_maps_key: googleMapsKey,
      firebase_settings: firebaseSettings,
      
      default_theme: defaultTheme,
      default_language: defaultLanguage
    };

    const res = await apiFetch('save_settings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.ok && res.success !== false) {
      showToast('System settings updated successfully!');
    } else {
      showToast(res.error || 'Failed to save settings.', 'error');
    }
    setSaving(false);
  };

  // --- DATABASE EXPORT ---
  const handleExportBackup = () => {
    // Navigate directly to backup endpoint to trigger file download attachment
    const cachedToken = localStorage.getItem('akv_session_id');
    const authParam = cachedToken ? `&Authorization=Bearer ${cachedToken}` : '';
    
    // Resolve absolute URL
    const actionUrl = `${APP_CONFIG.apiEndpoint}?action=backup_database${authParam}`;
    const link = document.createElement('a');
    link.setAttribute('href', actionUrl);
    link.setAttribute('download', `akv_backup_${new Date().toISOString().slice(0, 10)}.sql`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Database SQL backup downloaded!');
  };

  // --- DATABASE IMPORT / RESTORE ---
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (!window.confirm(`Are you absolutely sure you want to restore "${file.name}"? This will overwrite the current database tables!`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setBackupLoading(true);
    const formData = new FormData();
    formData.append('backup', file);

    // Call restore_database action with multipart/form-data
    const cachedToken = localStorage.getItem('akv_session_id');
    const headers: Record<string, string> = {};
    if (cachedToken) {
      headers['Authorization'] = `Bearer ${cachedToken}`;
    }

    try {
      const res = await fetch(`${APP_CONFIG.apiEndpoint}?action=restore_database&action=restore`, {
        method: 'POST',
        headers,
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showToast('Database restored successfully from backup!');
      } else {
        showToast(data.message || 'Database restore failed.', 'error');
      }
    } catch (err) {
      showToast('Restore request failed.', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setBackupLoading(false);
    }
  };

  return (
    <div className="animate-fade">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          background: toast.type === 'success' ? 'var(--color-green)' : '#ef4444',
          color: '#fff', padding: '10px 18px', borderRadius: '8px', fontSize: '13px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontWeight: 600
        }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={onBack} className="modal-close" style={{ background: 'rgba(255,255,255,0.04)', color: '#fff' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '18px', color: '#fff', margin: 0, fontWeight: 700 }}>System Settings</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Configure company, SMTP details, maps APIs, and data backup controls.</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px 0' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: '70px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Section 1: Company Profile */}
          <div className="glass-card" style={{ padding: '14px', margin: 0 }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--color-cyan)', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
              <MapPin size={15} />
              <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Company Profile</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Company Legal Name</label>
                <input type="text" className="form-input" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Office Address</label>
                <textarea className="form-input" style={{ minHeight: '60px', padding: '8px' }} value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="form-group">
                  <label className="form-label">Support Phone</label>
                  <input type="text" className="form-input" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Support Email</label>
                  <input type="email" className="form-input" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">GSTIN Identification Number</label>
                <input type="text" className="form-input" value={companyGstin} onChange={e => setCompanyGstin(e.target.value)} placeholder="e.g. 24AAAAC1234A1Z1" required />
              </div>
            </div>
          </div>

          {/* Section 2: SMTP Mail Server */}
          <div className="glass-card" style={{ padding: '14px', margin: 0 }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--color-green)', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
              <Mail size={15} />
              <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>SMTP Gateway Credentials</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '8px' }}>
                <div className="form-group">
                  <label className="form-label">SMTP Host</label>
                  <input type="text" className="form-input" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.domain.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Port</label>
                  <input type="text" className="form-input" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="form-group">
                  <label className="form-label">SMTP Username</label>
                  <input type="text" className="form-input" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">SMTP Password</label>
                  <input type="password" className="form-input" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">SMTP Encryption</label>
                <select className="form-input" value={smtpEncryption} onChange={e => setSmtpEncryption(e.target.value)}>
                  <option value="tls">TLS (Standard Port 587)</option>
                  <option value="ssl">SSL (Implicit Port 465)</option>
                  <option value="none">None (Plaintext Port 25)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Third Party Keys */}
          <div className="glass-card" style={{ padding: '14px', margin: 0 }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--color-amber)', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
              <Globe size={15} />
              <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>API Integration Tokens</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Google Maps SDK API Key</label>
                <input type="text" className="form-input" value={googleMapsKey} onChange={e => setGoogleMapsKey(e.target.value)} placeholder="AIzaSy..." />
              </div>
              <div className="form-group">
                <label className="form-label">Firebase FCM Settings (JSON config)</label>
                <textarea className="form-input" style={{ minHeight: '60px', padding: '8px', fontFamily: 'monospace', fontSize: '11px' }} value={firebaseSettings} onChange={e => setFirebaseSettings(e.target.value)} placeholder='{"apiKey": "...", "authDomain": "..."}' />
              </div>
            </div>
          </div>

          {/* Section 4: Localization & Theme */}
          <div className="glass-card" style={{ padding: '14px', margin: 0 }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#a78bfa', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
              <Settings size={15} />
              <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Localization & Interface</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div className="form-group">
                <label className="form-label">Active Theme</label>
                <select className="form-input" value={defaultTheme} onChange={e => setDefaultTheme(e.target.value)}>
                  <option value="dark">AKV Dark (Aesthetics Premium)</option>
                  <option value="light">AKV Light (Enterprise Standard)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Default Language</label>
                <select className="form-input" value={defaultLanguage} onChange={e => setDefaultLanguage(e.target.value)}>
                  <option value="en">English (US)</option>
                  <option value="es">Español</option>
                  <option value="hi">हिन्दी (India)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 5: Database Maintenance Backup/Restore */}
          <div className="glass-card" style={{ padding: '14px', margin: 0 }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#f87171', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
              <Database size={15} />
              <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Database System Backup</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                Backup database tables schemas, quotations master data records, and roster configurations.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0, padding: '10px 0' }}
                >
                  <Download size={14} color="var(--color-green)" /> Export SQL
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={backupLoading}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0, padding: '10px 0' }}
                >
                  {backupLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} color="var(--color-cyan)" />
                  )}
                  Import SQL
                </button>
              </div>

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportBackup}
                accept=".sql"
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Form Actions */}
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary btn-block"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 0' }}
          >
            {saving ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save Configuration Settings
          </button>

        </form>
      )}
    </div>
  );
};
