'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-background rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-3 rounded-full ${
                    variant === 'danger'
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : variant === 'warning'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30'
                      : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}
                >
                  <AlertTriangle
                    className={`w-6 h-6 ${
                      variant === 'danger'
                        ? 'text-red-600 dark:text-red-400'
                        : variant === 'warning'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  />
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground">{message}</p>

                  <div className="flex gap-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="flex-1"
                    >
                      {cancelText}
                    </Button>
                    <Button
                      variant={variant === 'danger' ? 'destructive' : 'default'}
                      onClick={handleConfirm}
                      className="flex-1"
                    >
                      {confirmText}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
