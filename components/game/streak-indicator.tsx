'use client';

import { Flame } from 'lucide-react';

interface StreakIndicatorProps {
  streak: number;
}

export function StreakIndicator({ streak }: StreakIndicatorProps) {
  if (streak < 2) return null;

  return (
    <div className="flex items-center justify-center gap-2 p-3 bg-orange-50 dark:bg-orange-950 border-2 border-orange-300 dark:border-orange-800 rounded-lg animate-pulse">
      <Flame className="h-5 w-5 text-orange-500 animate-bounce" />
      <span className="font-bold text-orange-700 dark:text-orange-300">
        ¡Racha de {streak}! 🔥
      </span>
      <Flame className="h-5 w-5 text-orange-500 animate-bounce" />
    </div>
  );
}
