import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const PULL_THRESHOLD = 70; // px
  const MAX_PULL = 120; // px

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Check the scrollable parent (.view-port), not the PTR wrapper itself.
      // The PTR div has overflow:hidden so its scrollTop is always 0.
      const scrollParent = container.closest('.view-port') ?? container.parentElement;
      const scrollTop = scrollParent ? (scrollParent as HTMLElement).scrollTop : 0;
      if (scrollTop === 0) {
        setStartY(e.touches[0].clientY);
      } else {
        setStartY(0);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startY === 0 || refreshing) return;
      
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      if (diff > 0) {
        // Prevent default scrolling when pulling down
        if (e.cancelable) e.preventDefault();
        
        // Apply resistance
        const dist = Math.min(MAX_PULL, diff * 0.4);
        setPullDistance(dist);
      }
    };

    const handleTouchEnd = async () => {
      if (startY === 0 || refreshing) return;

      if (pullDistance >= PULL_THRESHOLD) {
        setRefreshing(true);
        setPullDistance(PULL_THRESHOLD);
        
        try {
          await onRefresh();
        } catch (e) {
          console.error(e);
        } finally {
          setRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
      setStartY(0);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [startY, pullDistance, refreshing, onRefresh]);

  return (
    // Outer wrapper: full width, no fixed height, no overflow clipping.
    // The PARENT .view-port element is the scroll container (overflow-y: auto).
    // This div must NOT have overflow:hidden or a fixed height — either would
    // prevent .view-port from measuring the true content height and scrolling.
    <div
      ref={containerRef}
      style={{
        width: '100%',
        position: 'relative',
        // No height, no overflow — let content grow naturally so .view-port scrolls
      }}
    >
      {/* PTR Indicator — absolutely positioned above the content */}
      {pullDistance > 0 && (
        <div
          style={{
            position: 'absolute',
            top: `${pullDistance - 40}px`,
            left: '0',
            right: '0',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            opacity: Math.min(1, pullDistance / PULL_THRESHOLD),
            transition: refreshing ? 'top 0.2s ease' : 'none',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#0b1329',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              transform: `rotate(${pullDistance * 3}deg)`
            }}
          >
            <Loader2
              size={18}
              color="#10b981"
              style={{
                animation: refreshing ? 'spin 1s linear infinite' : 'none'
              }}
            />
          </div>
        </div>
      )}

      {/* Content pane — translateY nudge during pull gesture only */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: startY === 0 ? 'transform 0.2s ease' : 'none',
          // Bottom padding so last card/button clears the fixed bottom nav bar
          paddingBottom: 'var(--bottom-nav-clearance)',
        }}
      >
        {children}
      </div>

      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
