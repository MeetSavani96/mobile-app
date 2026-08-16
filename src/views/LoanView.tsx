import React, { useState } from 'react';
import { ArrowLeft, Building2, AlertCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface LoanViewProps {
  onClose: () => void;
}

export const LoanView: React.FC<LoanViewProps> = ({ onClose }) => {
  const [loanAmount, setLoanAmount] = useState(200000);
  const [tenure, setTenure] = useState(3);
  const [interestRate, setInterestRate] = useState(9.0);
  const [banks, setBanks] = useState<any[]>([]);
  const [showBanks, setShowBanks] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calculate EMI: M = P × r × (1+r)^n / ((1+r)^n - 1)
  const monthlyRate = interestRate / 12 / 100;
  const months = tenure * 12;
  const emi = monthlyRate > 0 
    ? Math.round(loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1))
    : Math.round(loanAmount / months);
  const totalPayable = emi * months;
  const totalInterest = totalPayable - loanAmount;
  const processingFee = Math.round(loanAmount * 0.01);

  const fetchBanks = async () => {
    setLoading(true);
    const result = await apiFetch('get_loan_banks');
    if (result.ok && result.data) {
      setBanks(result.data.banks || []);
    }
    setShowBanks(true);
    setLoading(false);
  };

  const formatCurrency = (n: number) => '₹' + n.toLocaleString('en-IN');

  return (
    <div className="view-content animate-fade">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <button onClick={onClose} className="btn btn-ghost" style={{ padding: '4px' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>AKV Energy Solar Loan</h2>
      </div>

      {/* Loan Amount Slider */}
      <div className="card" style={{ marginBottom: '12px' }}>
        <div className="flex-between" style={{ marginBottom: '8px' }}>
          <label className="form-label" style={{ margin: 0 }}>Loan Amount</label>
          <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(loanAmount)}</span>
        </div>
        <input
          type="range"
          className="slider"
          min={50000}
          max={500000}
          step={10000}
          value={loanAmount}
          onChange={e => setLoanAmount(parseInt(e.target.value))}
        />
        <div className="flex-between" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>₹50,000</span>
          <span>₹5,00,000</span>
        </div>
      </div>

      {/* Tenure */}
      <div className="card" style={{ marginBottom: '12px' }}>
        <label className="form-label">Tenure</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5, 6].map(yr => (
            <button
              key={yr}
              className={`chip ${tenure === yr ? 'selected' : ''}`}
              onClick={() => setTenure(yr)}
            >
              {yr} Year{yr > 1 ? 's' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Interest Rate */}
      <div className="card" style={{ marginBottom: '12px' }}>
        <div className="flex-between" style={{ marginBottom: '8px' }}>
          <label className="form-label" style={{ margin: 0 }}>Interest Rate</label>
          <span style={{ fontSize: '16px', fontWeight: 700 }}>{interestRate}% p.a.</span>
        </div>
        <input
          type="range"
          className="slider"
          min={7}
          max={15}
          step={0.25}
          value={interestRate}
          onChange={e => setInterestRate(parseFloat(e.target.value))}
        />
      </div>

      {/* EMI Result */}
      <div className="card card-elevated" style={{ background: 'var(--primary-light)', border: 'none', marginBottom: '12px' }}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Estimated Monthly EMI</p>
          <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(emi)}</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="card" style={{ marginBottom: '12px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Loan Summary</h4>
        <div className="info-row">
          <span className="label">Loan Amount</span>
          <span className="value">{formatCurrency(loanAmount)}</span>
        </div>
        <div className="info-row">
          <span className="label">Interest Rate</span>
          <span className="value">{interestRate}% p.a.</span>
        </div>
        <div className="info-row">
          <span className="label">Tenure</span>
          <span className="value">{tenure} year{tenure > 1 ? 's' : ''} ({months} months)</span>
        </div>
        <div className="info-row">
          <span className="label">Estimated EMI</span>
          <span className="value">{formatCurrency(emi)}/mo</span>
        </div>
        <div className="info-row">
          <span className="label">Processing Fee (est.)</span>
          <span className="value">{formatCurrency(processingFee)}</span>
        </div>
        <div className="info-row">
          <span className="label">Total Interest</span>
          <span className="value" style={{ color: 'var(--warning)' }}>{formatCurrency(totalInterest)}</span>
        </div>
        <div className="info-row" style={{ fontWeight: 700 }}>
          <span className="label" style={{ fontWeight: 700 }}>Total Payable</span>
          <span className="value">{formatCurrency(totalPayable)}</span>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'var(--warning-light)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
        <AlertCircle size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ fontSize: '11px', color: '#92400e', lineHeight: 1.5 }}>
          Loan approval is subject to bank eligibility and verification. The above calculations are estimates only.
        </p>
      </div>

      {/* Check Banks */}
      <button className="btn btn-primary btn-block btn-lg" onClick={fetchBanks} disabled={loading}>
        <Building2 size={18} />
        {loading ? 'Loading...' : 'Check Available Banks'}
      </button>

      {/* Banks List */}
      {showBanks && (
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Available Partner Banks</h4>
          {banks.length > 0 ? banks.map((bank: any) => (
            <div key={bank.id} className="list-card">
              <div className="flex-between">
                <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{bank.bank_name}</h4>
                <span className="badge badge-success">{bank.interest_rate}%</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {formatCurrency(bank.min_amount)} – {formatCurrency(bank.max_amount)} • Up to {bank.max_tenure_years} years
              </div>
            </div>
          )) : (
            <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No partner banks configured yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
