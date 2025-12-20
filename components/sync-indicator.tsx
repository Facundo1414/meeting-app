'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, RefreshCw } from 'lucide-react';

interface SyncIndicatorProps {
  isSyncing: boolean;
}

export function SyncIndicator({ isSyncing }: SyncIndicatorProps) {
  return (
    <AnimatePresence>
      {isSyncing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw className="w-4 h-4" />
          </motion.div>
          <span className="text-sm font-medium">Sincronizando...</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SyncSuccess() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      className="fixed top-4 right-4 z-50 bg-green-500 text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2"
    >
      <Check className="w-4 h-4" />
      <span className="text-sm font-medium">Sincronizado</span>
    </motion.div>
  );
}
