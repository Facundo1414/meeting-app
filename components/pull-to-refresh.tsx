'use client';

import { motion } from 'framer-motion';
import { Loader2, RefreshCw } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min((pullDistance / threshold) * 100, 100);
  const shouldTrigger = pullDistance >= threshold;

  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ height: pullDistance > 0 ? pullDistance : 40 }}
      className="flex items-center justify-center"
    >
      {isRefreshing ? (
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      ) : (
        <motion.div
          animate={{ rotate: progress * 3.6 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <RefreshCw
            className={`w-6 h-6 transition-colors ${
              shouldTrigger ? 'text-primary' : 'text-muted-foreground'
            }`}
          />
        </motion.div>
      )}
    </motion.div>
  );
}
