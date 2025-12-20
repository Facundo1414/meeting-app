'use client';

import { motion } from 'framer-motion';
import { CalendarX2, MessageSquare } from 'lucide-react';

interface EmptyStateProps {
  type: 'calendar' | 'messages';
  message?: string;
}

export function EmptyState({ type, message }: EmptyStateProps) {
  const Icon = type === 'calendar' ? CalendarX2 : MessageSquare;
  const defaultMessage = type === 'calendar' 
    ? 'No hay eventos programados para este día'
    : 'No hay mensajes todavía';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="mb-6 p-6 rounded-full bg-muted/50"
      >
        <Icon className="w-16 h-16 text-muted-foreground" />
      </motion.div>
      
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl font-semibold mb-2 text-foreground"
      >
        {message || defaultMessage}
      </motion.h3>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-sm text-muted-foreground max-w-sm"
      >
        {type === 'calendar' 
          ? 'Agrega tu disponibilidad haciendo clic en el botón "+"'
          : 'Envía el primer mensaje para comenzar la conversación'}
      </motion.p>
    </motion.div>
  );
}
