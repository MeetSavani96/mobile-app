import React, { useState } from 'react';
import { Camera, X, Wrench, AlertCircle, ArrowLeft } from 'lucide-react';
import { Camera as CapCamera, CameraResultType } from '@capacitor/camera';
import { apiFetch } from '../utils/api';

interface ComplaintFormProps {
  onClose: () => void;
  onSubmitSuccess: () => void;
}

export const ComplaintForm: React.FC<ComplaintFormProps> = ({ onClose, onSubmitSuccess }) => {
  const [issueType, setIssueType] = useState<string>('Panel Issue');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [photo, setPhoto] = useState<string | null>(null); // base64 or file path
  
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const issueTypes = [
    'Panel Issue',
    'Inverter Problem',
    'Low Generation',
    'Wiring Issue',
    'Billing Query',
    'Other Support'
  ];

  // Capture image using Capacitor Camera natively
  const handleCapturePhoto = async () => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64
      });
      if (image.base64String) {
        setPhoto(`data:image/jpeg;base64,${image.base64String}`);
      }
    } catch (e) {
      // User cancelled or camera unavailable (e.g. running in standard browser)
      console.log('Capacitor camera failed or cancelled. Triggering file input click.');
      const fileInput = document.getElementById('complaint-file-input');
      if (fileInput) {
        fileInput.click();
      }
    }
  };

  // Web fallback file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || description.length < 10) {
      setErrorMsg('Please write a detailed description (min 10 characters).');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    const result = await apiFetch('submit_complaint', {
      method: 'POST',
      body: JSON.stringify({
        title: issueType,
        issue_type: issueType,
        description,
        priority,
        photo
      })
    });
    
    if (result.ok) {
      onSubmitSuccess();
    } else {
      setErrorMsg(result.error || 'Failed to submit ticket. You must be logged in and connected to the server.');
    }
    setSubmitting(false);
  };

  return (
    <div className="animate-fade">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={onClose} className="modal-close" style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.06)' }}>
          <ArrowLeft size={16} color="#fff" />
        </button>
        <div>
          <h2 style={{ fontSize: '18px', color: '#fff' }}>Raise Service Ticket</h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Describe your solar grid issue for prompt resolution</p>
        </div>
      </div>

      <div className="glass-card">
        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', marginBottom: '16px' }} className="flex-gap-2">
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Issue category */}
          <div className="form-group">
            <label className="form-label">Issue Category *</label>
            <select className="form-select" value={issueType} onChange={e => setIssueType(e.target.value)}>
              {issueTypes.map(it => (
                <option key={it} value={it}>{it}</option>
              ))}
            </select>
          </div>

          {/* Priority selector */}
          <div className="form-group">
            <label className="form-label">Urgency Priority *</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['low', 'medium', 'high', 'critical'] as const).map(prio => (
                <button
                  key={prio}
                  type="button"
                  onClick={() => setPriority(prio)}
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    fontSize: '11px',
                    borderRadius: '8px',
                    textTransform: 'capitalize',
                    border: priority === prio ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    background: priority === prio 
                      ? prio === 'critical' ? 'linear-gradient(135deg, #ef4444, #f43f5e)'
                        : prio === 'high' ? 'linear-gradient(135deg, #f97316, #fb923c)'
                        : 'var(--grad-solar)'
                      : 'rgba(255,255,255,0.03)',
                    color: priority === prio ? '#fff' : 'var(--text-muted)',
                    fontWeight: 600
                  }}
                >
                  {prio}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Issue Details & Observations *</label>
            <textarea
              className="form-textarea"
              placeholder="e.g., Inverter exhibits red light code E-3. Cleaned panels yesterday but output remains under 2 kW."
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Hidden File Picker Fallback */}
          <input 
            type="file" 
            id="complaint-file-input" 
            style={{ display: 'none' }} 
            accept="image/*" 
            onChange={handleFileChange} 
          />

          {/* Attachment upload */}
          <div className="form-group">
            <label className="form-label">Attach Photo Evidence</label>
            {photo ? (
              <div style={{ position: 'relative', width: '100%', height: '150px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <img src={photo} alt="Issue preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={14} color="#fff" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCapturePhoto}
                className="btn btn-secondary"
                style={{
                  height: '80px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  borderStyle: 'dashed',
                  borderWidth: '1.5px',
                  borderColor: 'rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.02)'
                }}
              >
                <Camera size={22} color="var(--color-green)" />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Capture Photo / Document</span>
              </button>
            )}
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            className="btn btn-primary btn-block btn-lg" 
            disabled={submitting}
            style={{ marginTop: '20px' }}
          >
            <Wrench size={16} />
            {submitting ? 'Registering Ticket...' : 'File Service Ticket'}
          </button>
        </form>
      </div>
    </div>
  );
};
