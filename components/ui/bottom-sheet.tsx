'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Desktop: Centered Modal / Mobile: Bottom Sheet */}
          <motion.div
            initial={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed z-50 bg-background shadow-2xl overflow-hidden swipe-ignore ${
              isDesktop 
                ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl w-full max-w-md max-h-[80vh]' 
                : 'inset-x-0 bottom-0 rounded-t-3xl max-h-[90vh]'
            }`}
            role="dialog"
          >
            {/* Handle bar - solo mobile */}
            {!isDesktop && (
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
              </div>
            )}

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-4 md:px-5 py-3 md:py-4 border-b">
                <h2 className="text-lg md:text-xl font-semibold">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 md:p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className={`overflow-y-auto p-4 md:p-5 ${
              isDesktop ? 'max-h-[calc(80vh-80px)]' : 'max-h-[calc(90vh-100px)] pb-20'
            }`}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
