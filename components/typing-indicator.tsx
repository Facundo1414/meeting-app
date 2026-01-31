'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  isTyping: boolean;
  userName?: string;
  className?: string;
  compact?: boolean;
}

export function TypingIndicator({ 
  isTyping, 
  userName = 'Alguien', 
  className,
  compact = false
}: TypingIndicatorProps) {
  return (
    <AnimatePresence mode="wait">
      {isTyping && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 500, 
            damping: 30,
            mass: 0.8
          }}
          className={cn(
            "flex items-center gap-2",
            className
          )}
        >
          {!compact && (
            <div className="h-6 w-6 rounded-full bg-purple-500 flex items-center justify-center">
              <span className="text-xs text-white font-medium">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          <motion.div
            className={cn(
              "flex items-center gap-2 rounded-2xl",
              compact 
                ? "px-2 py-1 bg-muted/50" 
                : "px-3 py-2 bg-muted"
            )}
          >
            <span className={cn(
              "text-muted-foreground",
              compact ? "text-xs" : "text-sm"
            )}>
              {compact ? 'escribiendo' : `${userName} está escribiendo`}
            </span>
            
            <div className="flex items-center gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className={cn(
                    "rounded-full bg-purple-500",
                    compact ? "w-1 h-1" : "w-1.5 h-1.5"
                  )}
                  animate={{
                    y: [-2, 2, -2],
                    opacity: [0.5, 1, 0.5],
                    scale: [0.8, 1.2, 0.8]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Versión burbuja estilo WhatsApp
export function TypingBubble({ 
  isTyping, 
  userName,
  className 
}: { 
  isTyping: boolean; 
  userName?: string;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      {isTyping && (
        <motion.div
          initial={{ opacity: 0, x: -20, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -20, scale: 0.8 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25 
          }}
          className={cn(
            "flex justify-start px-4 py-2",
            className
          )}
        >
          <div className="relative">
            {/* Bubble */}
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-muted-foreground/60"
                    animate={{
                      y: [0, -8, 0],
                      backgroundColor: [
                        'rgba(128, 128, 128, 0.4)',
                        'rgba(168, 85, 247, 0.8)',
                        'rgba(128, 128, 128, 0.4)'
                      ]
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </div>
            </div>
            
            {/* Small indicator text below */}
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute -bottom-4 left-2 text-[10px] text-muted-foreground/70"
            >
              {userName ? `${userName} escribe...` : 'escribiendo...'}
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Indicador para el header del chat
export function HeaderTypingIndicator({ 
  isTyping 
}: { 
  isTyping: boolean;
}) {
  return (
    <AnimatePresence mode="wait">
      {isTyping ? (
        <motion.div
          key="typing"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="flex items-center gap-1"
        >
          <span className="text-xs text-purple-500 font-medium">escribiendo</span>
          <div className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1 h-1 rounded-full bg-purple-500"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.1
                }}
              />
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.span
          key="online"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="text-xs text-green-500"
        >
          en línea
        </motion.span>
      )}
    </AnimatePresence>
  );
}
