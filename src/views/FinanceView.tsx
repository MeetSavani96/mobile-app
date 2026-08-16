import React, { useState } from 'react';
import { Landmark, ArrowRight, Percent, CalendarDays, Coins } from 'lucide-react';

export const FinanceView: React.FC<{ onClose?: () => void; onOpenBooking?: () => void }> = ({ onClose, onOpenBooking }) => {
  const [totalCost, setTotalCost] = useState<number>(150000); // Default 3 kW system cost
  const [downPayment, setDownPayment] = useState<number>(30000); // 20% default
  const [interestRate, setInterestRate] = useState<number>(8.5); // Bank solar loan interest
  const [tenureYears, setTenureYears] = useState<number>(5); // 5 years tenure

  const loanAmount = Math.max(0, totalCost - downPayment);
  
  // EMI calculation logic
  // EMI = [P x R x (1+R)^N]/[((1+R)^N)-1]
  // where P = loanAmount, R = monthlyInterestRate, N = tenureMonths
  const monthlyInterestRate = (interestRate / 12) / 100;
  const tenureMonths = tenureYears * 12;
  
  let monthlyEmi = 0;
  if (loanAmount > 0 && monthlyInterestRate > 0) {
    monthlyEmi = (loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, tenureMonths)) / 
                 (Math.pow(1 + monthlyInterestRate, tenureMonths) - 1);
  } else if (loanAmount > 0 && monthlyInterestRate === 0) {
    monthlyEmi = loanAmount / tenureMonths;
  }

  const totalPayment = monthlyEmi * tenureMonths;
  const totalInterest = Math.max(0, totalPayment - loanAmount);

  const formatINR = (val: number) => {
    return `₹${new Intl.NumberFormat('en-IN').format(Math.round(val))}`;
  };

  return (
    <div className="animate-fade">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'inline-flex', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(6, 182, 212, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
          <Landmark size={28} color="var(--color-cyan)" />
        </div>
        <h2 style={{ fontSize: '22px', color: '#fff' }}>Solar Finance & EMI Calculator</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Calculate monthly installments with low-interest bank solar loans</p>
      </div>

      <div className="glass-card" style={{ padding: '20px' }}>
        {/* System Cost Slider */}
        <div className="form-group">
          <div className="form-label">
            <span>Project System Cost</span>
            <span style={{ color: 'var(--color-green)', fontWeight: 600 }}>{formatINR(totalCost)}</span>
          </div>
          <input 
            type="range" 
            className="slider" 
            min={50000} 
            max={1000000} 
            step={25000} 
            value={totalCost} 
            onChange={e => {
              const cost = parseInt(e.target.value);
              setTotalCost(cost);
              if (downPayment > cost) setDownPayment(cost);
            }} 
          />
          <div className="flex-between" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '-4px' }}>
            <span>₹50K</span>
            <span>₹10 Lakh</span>
          </div>
        </div>

        {/* Down Payment Slider */}
        <div className="form-group">
          <div className="form-label">
            <span>Down Payment (Margin)</span>
            <span style={{ color: 'var(--color-cyan)', fontWeight: 600 }}>{formatINR(downPayment)}</span>
          </div>
          <input 
            type="range" 
            className="slider" 
            min={10000} 
            max={totalCost} 
            step={10000} 
            value={downPayment} 
            onChange={e => setDownPayment(parseInt(e.target.value))} 
          />
          <div className="flex-between" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '-4px' }}>
            <span>₹10K</span>
            <span>{formatINR(totalCost)}</span>
          </div>
        </div>

        {/* Interest rate & tenure fields */}
        <div className="grid-2">
          <div className="form-group">
            <div className="form-label">
              <span>Interest Rate</span>
              <span style={{ color: 'var(--color-amber)', fontWeight: 600 }}>{interestRate}% p.a.</span>
            </div>
            <input 
              type="range" 
              className="slider" 
              min={6.0} 
              max={15.0} 
              step={0.5} 
              value={interestRate} 
              onChange={e => setInterestRate(parseFloat(e.target.value))} 
            />
          </div>

          <div className="form-group">
            <div className="form-label">
              <span>Tenure (Years)</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{tenureYears} Years</span>
            </div>
            <input 
              type="range" 
              className="slider" 
              min={1} 
              max={10} 
              step={1} 
              value={tenureYears} 
              onChange={e => setTenureYears(parseInt(e.target.value))} 
            />
          </div>
        </div>
      </div>

      {/* Calculator Result Box */}
      <div className="glass-card glow-cyan" style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Monthly EMI Estimate</div>
        <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-cyan)', margin: '4px 0 8px 0' }}>
          {formatINR(monthlyEmi)} / mo
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '12px', fontSize: '12px', marginTop: '12px' }}>
          <div className="flex-between">
            <span style={{ color: 'var(--text-muted)' }} className="flex-gap-2"><Coins size={13} /> Loan Principal</span>
            <span style={{ color: '#fff', fontWeight: 500 }}>{formatINR(loanAmount)}</span>
          </div>
          <div className="flex-between">
            <span style={{ color: 'var(--text-muted)' }} className="flex-gap-2"><Percent size={13} /> Total Interest</span>
            <span style={{ color: '#fff', fontWeight: 500 }}>{formatINR(totalInterest)}</span>
          </div>
          <div className="flex-between">
            <span style={{ color: 'var(--text-muted)' }} className="flex-gap-2"><CalendarDays size={13} /> Total Payable</span>
            <span style={{ color: 'var(--color-green)', fontWeight: 600 }}>{formatINR(totalPayment + downPayment)}</span>
          </div>
        </div>
      </div>

      {/* CTA buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button 
          onClick={onOpenBooking} 
          className="btn btn-primary btn-block btn-lg"
        >
          Apply for Financing
          <ArrowRight size={16} />
        </button>
        {onClose && (
          <button onClick={onClose} className="btn btn-secondary btn-block">
            Back to Dashboard
          </button>
        )}
      </div>
    </div>
  );
};
