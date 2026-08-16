import React, { useState } from 'react';
import { Shield, Zap, TrendingUp, ArrowRight } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: 'Harness the Sun',
      description: 'Clean, infinite, renewable energy for your home, commercial, or industrial enterprise. Join the clean energy future today.',
      icon: <Zap size={48} color="#ffffff" />,
      color: '#10b981',
      bgGrad: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(7, 13, 25, 0.8) 100%)'
    },
    {
      title: 'Save Up to 80%',
      description: 'Lower your monthly electricity bills immediately. Use our built-in Solar Calculator to estimate savings and your payback period.',
      icon: <TrendingUp size={48} color="#ffffff" />,
      color: '#06b6d4',
      bgGrad: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(7, 13, 25, 0.8) 100%)'
    },
    {
      title: 'Subsidies Handled',
      description: 'We guide you through government schemes and subsidies, and handle the paperwork so you get maximum returns on your investment.',
      icon: <Shield size={48} color="#ffffff" />,
      color: '#eab308',
      bgGrad: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(7, 13, 25, 0.8) 100%)'
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      localStorage.setItem('akv_onboarded', 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('akv_onboarded', 'true');
    onComplete();
  };

  const slide = slides[currentSlide];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#070d19',
        display: 'flex',
        flexDirection: 'column',
        /* Top padding = status bar; bottom padding = gesture navigation bar */
        padding: 'env(safe-area-inset-top, 24px) 20px env(safe-area-inset-bottom, 48px) 20px',
        zIndex: 9990,
        justifyContent: 'space-between',
        animation: 'fade-in 0.3s ease-out'
      }}
    >
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
        {currentSlide < slides.length - 1 && (
          <button
            onClick={handleSkip}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Skip
          </button>
        )}
      </div>

      {/* Main Slide Card */}
      <div
        className="glass-card"
        style={{
          flex: 1,
          margin: '24px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '30px 20px',
          background: slide.bgGrad,
          borderColor: `rgba(255, 255, 255, 0.05)`
        }}
      >
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: slide.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 10px 30px rgba(${slide.color === '#10b981' ? '16,185,129' : slide.color === '#06b6d4' ? '6,182,212' : '234,179,8'}, 0.4)`,
            marginBottom: '32px',
            animation: 'float 3.5s ease-in-out infinite'
          }}
        >
          {slide.icon}
        </div>

        <h2 style={{ fontSize: '28px', color: '#ffffff', marginBottom: '16px' }}>
          {slide.title}
        </h2>
        
        <p style={{ fontSize: '15px', color: '#cbd5e1', lineHeight: '1.6', maxWidth: '320px' }}>
          {slide.description}
        </p>
      </div>

      {/* Bottom controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        {/* Indicators */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {slides.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === currentSlide ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: idx === currentSlide ? slide.color : 'rgba(255, 255, 255, 0.15)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        {/* Action Button */}
        <button
          className="btn btn-block btn-lg"
          onClick={handleNext}
          style={{
            background: `linear-gradient(135deg, ${slide.color}, #06b6d4)`,
            boxShadow: `0 4px 15px rgba(${slide.color === '#10b981' ? '16,185,129' : slide.color === '#06b6d4' ? '6,182,212' : '234,179,8'}, 0.2)`
          }}
        >
          {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
