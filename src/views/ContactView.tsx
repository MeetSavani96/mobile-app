import React, { useState } from 'react';
import {
  Phone, Mail, MapPin, MessageSquare,
  Send, CheckCircle2, AlertCircle, CalendarRange,
  Globe, ExternalLink,
} from 'lucide-react';
import { APP_CONFIG } from '../config';
import { apiFetch } from '../utils/api';

export const ContactView: React.FC<{
  activeForm?: 'contact' | 'quote' | 'visit';
  onFormClosed?: () => void;
}> = ({ activeForm = 'contact', onFormClosed }) => {
  const [currentView, setCurrentView] = useState<'info' | 'quote' | 'visit'>(
    activeForm === 'quote' ? 'quote' : activeForm === 'visit' ? 'visit' : 'info'
  );

  // Quote Form states
  const [quoteName, setQuoteName] = useState('');
  const [quotePhone, setQuotePhone] = useState('');
  const [quoteEmail, setQuoteEmail] = useState('');
  const [quoteState, setQuoteState] = useState(APP_CONFIG.defaultState);
  const [quoteCity, setQuoteCity] = useState('');
  const [quoteSize, setQuoteSize] = useState<number>(3);
  const [quoteRoofSpace, setQuoteRoofSpace] = useState<number>(300);

  // Site Visit Form states
  const [visitName, setVisitName] = useState('');
  const [visitPhone, setVisitPhone] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('10:00');
  const [visitAddress, setVisitAddress] = useState('');
  const [visitNotes, setVisitNotes] = useState('');

  // Submit states
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const resetFormState = () => {
    setLoading(false);
    setSuccess(false);
    setErrorMsg('');
  };

  // ── External link helpers ────────────────────────────────────────────────

  const handleCallNow = () => {
    // tel: opens the native phone dialler on Android and iOS
    window.open(`tel:${APP_CONFIG.supportPhone.replace(/\s+/g, '')}`, '_self');
  };

  const handleLaunchWhatsApp = () => {
    const text = encodeURIComponent(
      'Hello AKV Energy, I would like to get a premium solar quote for my rooftop!'
    );
    window.open(`https://wa.me/${APP_CONFIG.whatsappNumber}?text=${text}`, '_blank');
  };

  const handleVisitWebsite = () => {
    window.open(APP_CONFIG.websiteUrl, '_blank');
  };

  const handleOpenInstagram = () => {
    window.open(APP_CONFIG.instagramUrl, '_blank');
  };

  const handleLaunchMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${APP_CONFIG.googleMapsQuery}`;
    window.open(url, '_blank');
  };

  // ── Form handlers ────────────────────────────────────────────────────────

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    const result = await apiFetch('submit_lead', {
      method: 'POST',
      body: JSON.stringify({
        name: quoteName,
        phone: quotePhone,
        email: quoteEmail,
        state: quoteState,
        city: quoteCity,
        system_size_kw: quoteSize,
        notes: `Rooftop Space Available: ${quoteRoofSpace} Sq.ft`,
        source: 'quote_enquiry',
      }),
    });
    if (result.ok) {
      setSuccess(true);
    } else {
      setErrorMsg(result.error || 'Failed to submit quote request. Please check your connection and try again.');
    }
    setLoading(false);
  };

  const handleVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    const result = await apiFetch('submit_contact', {
      method: 'POST',
      body: JSON.stringify({
        name: visitName,
        phone: visitPhone,
        message: `Site Visit Booked for Date: ${visitDate} at Time: ${visitTime}. Site Address: ${visitAddress}. Notes: ${visitNotes}`,
      }),
    });
    if (result.ok) {
      setSuccess(true);
    } else {
      setErrorMsg(result.error || 'Failed to book site visit. Please check your connection and try again.');
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade">

      {/* ── Tab Header ── */}
      <div className="tab-header">
        <button
          className={`tab-btn ${currentView === 'info' ? 'active' : ''}`}
          onClick={() => { setCurrentView('info'); resetFormState(); }}
        >
          Contact Info
        </button>
        <button
          className={`tab-btn ${currentView === 'quote' ? 'active' : ''}`}
          onClick={() => { setCurrentView('quote'); resetFormState(); }}
        >
          Get Quote
        </button>
        <button
          className={`tab-btn ${currentView === 'visit' ? 'active' : ''}`}
          onClick={() => { setCurrentView('visit'); resetFormState(); }}
        >
          Site Visit
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          VIEW 1: CONTACT INFORMATION
      ════════════════════════════════════════════════════════════════════ */}
      {currentView === 'info' && (
        <div className="animate-scale">

          {/* Company header */}
          <div className="glass-card glow-green" style={{ textAlign: 'center', padding: '20px 16px' }}>
            <img
              src={APP_CONFIG.logoUrl}
              alt="AKV Energy logo"
              style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '14px', marginBottom: '10px' }}
            />
            <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '4px' }}>AKV Energy</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Premium Rooftop Solar Solutions · Surat, Gujarat
            </p>

            {/* WhatsApp primary CTA */}
            <button
              onClick={handleLaunchWhatsApp}
              className="btn btn-primary btn-block"
              style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)', boxShadow: '0 4px 15px rgba(34,197,94,0.3)' }}
            >
              <MessageSquare size={16} />
              WhatsApp Chat
            </button>
          </div>

          {/* ── Quick-action buttons ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>

            {/* Call Now */}
            <button
              onClick={handleCallNow}
              className="btn btn-secondary"
              style={{ flexDirection: 'column', gap: '4px', padding: '12px 8px', height: '64px', fontSize: '12px', borderColor: 'rgba(16,185,129,0.3)' }}
            >
              <Phone size={18} color="var(--color-green)" />
              Call Now
            </button>

            {/* Visit Website */}
            <button
              onClick={handleVisitWebsite}
              className="btn btn-secondary"
              style={{ flexDirection: 'column', gap: '4px', padding: '12px 8px', height: '64px', fontSize: '12px', borderColor: 'rgba(6,182,212,0.3)' }}
            >
              <Globe size={18} color="var(--color-cyan)" />
              Visit Website
            </button>

            {/* Open Instagram */}
            <button
              onClick={handleOpenInstagram}
              className="btn btn-secondary"
              style={{ flexDirection: 'column', gap: '4px', padding: '12px 8px', height: '64px', fontSize: '12px', borderColor: 'rgba(234,179,8,0.3)' }}
            >
              <ExternalLink size={18} color="var(--color-amber)" />
              Instagram
            </button>

            {/* Open in Google Maps */}
            <button
              onClick={handleLaunchMaps}
              className="btn btn-secondary"
              style={{ flexDirection: 'column', gap: '4px', padding: '12px 8px', height: '64px', fontSize: '12px', borderColor: 'rgba(239,68,68,0.3)' }}
            >
              <MapPin size={18} color="#f87171" />
              Maps
            </button>
          </div>

          {/* ── Contact Details ── */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Phone */}
              <a
                href={`tel:${APP_CONFIG.supportPhone.replace(/\s+/g, '')}`}
                style={{ display: 'flex', gap: '14px', alignItems: 'center', textDecoration: 'none', color: '#fff' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={18} color="var(--color-green)" />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Phone Hotline</div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{APP_CONFIG.supportPhone}</div>
                </div>
              </a>

              {/* Email */}
              <a
                href={`mailto:${APP_CONFIG.supportEmail}`}
                style={{ display: 'flex', gap: '14px', alignItems: 'center', textDecoration: 'none', color: '#fff' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={18} color="var(--color-cyan)" />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Email Address</div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{APP_CONFIG.supportEmail}</div>
                </div>
              </a>

              {/* Address */}
              <div
                onClick={handleLaunchMaps}
                style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', cursor: 'pointer', color: '#fff' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(234,179,8,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <MapPin size={18} color="var(--color-amber)" />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Corporate Office</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: '1.4' }}>
                    1st Floor, Nagnath Society, Plot No: 1/A,{'\n'}
                    Near The Avalon Business Hub,{'\n'}
                    Aamba Talavadi, Katargam,{'\n'}
                    Surat, Gujarat – 395004
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-cyan)', marginTop: '4px' }}>Tap to open in Google Maps →</div>
                </div>
              </div>

              {/* Website */}
              <div
                onClick={handleVisitWebsite}
                style={{ display: 'flex', gap: '14px', alignItems: 'center', cursor: 'pointer', color: '#fff' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Globe size={18} color="var(--color-cyan)" />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Official Website</div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>akvenergy.com</div>
                </div>
              </div>

              {/* Instagram */}
              <div
                onClick={handleOpenInstagram}
                style={{ display: 'flex', gap: '14px', alignItems: 'center', cursor: 'pointer', color: '#fff' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(234,179,8,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ExternalLink size={18} color="var(--color-amber)" />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Instagram</div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>@akvenergysolutions</div>
                </div>
              </div>

            </div>
          </div>

          {/* Quote / Visit shortcut buttons */}
          <div className="grid-2">
            <button onClick={() => setCurrentView('quote')} className="btn btn-secondary" style={{ fontSize: '12px' }}>
              Request Quote
            </button>
            <button onClick={() => setCurrentView('visit')} className="btn btn-secondary" style={{ fontSize: '12px' }}>
              Book Site Visit
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          VIEW 2: REQUEST A QUOTE
      ════════════════════════════════════════════════════════════════════ */}
      {currentView === 'quote' && (
        <div className="animate-scale">
          {success ? (
            <div className="glass-card glow-green" style={{ textAlign: 'center', padding: '30px 20px' }}>
              <CheckCircle2 size={48} color="var(--color-green)" style={{ margin: '0 auto 16px auto', display: 'block' }} />
              <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '8px' }}>Quote Enquiry Sent</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Thank you! We will compile your structural specifications and call you back with estimates.
              </p>
              <button
                onClick={() => { setSuccess(false); setCurrentView('info'); onFormClosed?.(); }}
                className="btn btn-primary btn-block"
              >
                Back to Support
              </button>
            </div>
          ) : (
            <form onSubmit={handleQuoteSubmit} className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '12px' }}>Request Free Solar Quote</h3>

              {errorMsg && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', marginBottom: '16px' }} className="flex-gap-2">
                  <AlertCircle size={15} /><span>{errorMsg}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input type="text" className="form-input" placeholder="Your Name" value={quoteName} onChange={e => setQuoteName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input type="tel" className="form-input" placeholder="10-digit number" value={quotePhone} onChange={e => setQuotePhone(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" placeholder="you@email.com" value={quoteEmail} onChange={e => setQuoteEmail(e.target.value)} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">State *</label>
                  <select className="form-select" value={quoteState} onChange={e => setQuoteState(e.target.value)}>
                    {APP_CONFIG.states.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input type="text" className="form-input" placeholder="e.g., Surat" value={quoteCity} onChange={e => setQuoteCity(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <div className="form-label">
                  <span>Planned Capacity</span>
                  <span style={{ color: 'var(--color-green)', fontWeight: 600 }}>{quoteSize} kW</span>
                </div>
                <input type="range" className="slider" min={1} max={30} step={1} value={quoteSize} onChange={e => setQuoteSize(parseInt(e.target.value))} />
              </div>
              <div className="form-group">
                <div className="form-label">
                  <span>Available Roof Area</span>
                  <span style={{ color: 'var(--color-cyan)', fontWeight: 600 }}>{quoteRoofSpace} Sq.ft</span>
                </div>
                <input type="range" className="slider" min={100} max={2500} step={50} value={quoteRoofSpace} onChange={e => setQuoteRoofSpace(parseInt(e.target.value))} />
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ marginTop: '16px' }}>
                <Send size={15} />
                {loading ? 'Submitting Quote...' : 'Submit Quote Request'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          VIEW 3: SITE VISIT SCHEDULER
      ════════════════════════════════════════════════════════════════════ */}
      {currentView === 'visit' && (
        <div className="animate-scale">
          {success ? (
            <div className="glass-card glow-green" style={{ textAlign: 'center', padding: '30px 20px' }}>
              <CheckCircle2 size={48} color="var(--color-green)" style={{ margin: '0 auto 16px auto', display: 'block' }} />
              <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '8px' }}>Site Visit Booked</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Thank you! Our engineer is scheduled to survey your rooftop on <b>{visitDate}</b> at <b>{visitTime}</b>.
              </p>
              <button
                onClick={() => { setSuccess(false); setCurrentView('info'); onFormClosed?.(); }}
                className="btn btn-primary btn-block"
              >
                Back to Support
              </button>
            </div>
          ) : (
            <form onSubmit={handleVisitSubmit} className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '12px' }}>Book Engineering Site Visit</h3>

              {errorMsg && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', marginBottom: '16px' }} className="flex-gap-2">
                  <AlertCircle size={15} /><span>{errorMsg}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Your Name *</label>
                <input type="text" className="form-input" placeholder="e.g., Amit Patel" value={visitName} onChange={e => setVisitName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input type="tel" className="form-input" placeholder="10-digit mobile" value={visitPhone} onChange={e => setVisitPhone(e.target.value)} required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Preferred Date *</label>
                  <input type="date" className="form-input" value={visitDate} onChange={e => setVisitDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Time Slot *</label>
                  <select className="form-select" value={visitTime} onChange={e => setVisitTime(e.target.value)}>
                    <option value="10:00">10:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="16:00">04:00 PM</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Site Address *</label>
                <textarea className="form-textarea" placeholder="Flat, Building, Area, Landmark" value={visitAddress} onChange={e => setVisitAddress(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Additional Instructions / Notes</label>
                <input type="text" className="form-input" placeholder="e.g., Roof key is with society security" value={visitNotes} onChange={e => setVisitNotes(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ marginTop: '16px' }}>
                <CalendarRange size={16} />
                {loading ? 'Booking Visit...' : 'Confirm Site Survey'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
