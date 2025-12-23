'use client';

import { useEffect, useState } from 'react';

interface ConfettiEffectProps {
  isActive: boolean;
  onComplete?: () => void;
}

export function ConfettiEffect({ isActive, onComplete }: ConfettiEffectProps) {
  const [confetti, setConfetti] = useState<Array<{
    id: number;
    left: number;
    delay: number;
    duration: number;
    color: string;
  }>>([]);

  useEffect(() => {
    if (isActive) {
      const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8B94', '#C7CEEA'];
      const newConfetti = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
      
      setConfetti(newConfetti);

      const timer = setTimeout(() => {
        setConfetti([]);
        if (onComplete) onComplete();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  if (!isActive || confetti.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {confetti.map((item) => (
        <div
          key={item.id}
          className="absolute top-0 w-2 h-2 rounded-sm animate-fall"
          style={{
            left: `${item.left}%`,
            backgroundColor: item.color,
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes fall {
          from {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>
    </div>
  );
}
