'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { addTimeSlot } from '@/lib/storage-supabase';
import { User } from '@/lib/auth-supabase';
import { 
  Zap, 
  Coffee, 
  Moon, 
  Sun, 
  Calendar, 
  Clock,
  X,
  Check
} from 'lucide-react';
import { toast } from '@/components/ui/toast';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  emoji: string;
  startHour: number;
  endHour: number;
  eventType: 'unavailable' | 'plan' | 'meeting' | 'tentative';
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'all-day',
    label: 'Todo el día',
    icon: <Calendar className="h-4 w-4" />,
    emoji: '📅',
    startHour: 0,
    endHour: 24,
    eventType: 'unavailable',
    color: 'bg-red-500 hover:bg-red-600',
  },
  {
    id: 'morning',
    label: 'Mañana',
    icon: <Coffee className="h-4 w-4" />,
    emoji: '☕',
    startHour: 9,
    endHour: 13,
    eventType: 'unavailable',
    color: 'bg-orange-500 hover:bg-orange-600',
  },
  {
    id: 'afternoon',
    label: 'Tarde',
    icon: <Sun className="h-4 w-4" />,
    emoji: '☀️',
    startHour: 13,
    endHour: 18,
    eventType: 'unavailable',
    color: 'bg-yellow-500 hover:bg-yellow-600',
  },
  {
    id: 'evening',
    label: 'Noche',
    icon: <Moon className="h-4 w-4" />,
    emoji: '🌙',
    startHour: 18,
    endHour: 23,
    eventType: 'unavailable',
    color: 'bg-indigo-500 hover:bg-indigo-600',
  },
  {
    id: 'work-hours',
    label: 'Horario laboral',
    icon: <Clock className="h-4 w-4" />,
    emoji: '💼',
    startHour: 9,
    endHour: 18,
    eventType: 'unavailable',
    color: 'bg-blue-500 hover:bg-blue-600',
  },
];

interface QuickActionsProps {
  user: User;
  selectedDate: Date;
  onActionComplete: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function QuickActions({ 
  user, 
  selectedDate, 
  onActionComplete,
  isExpanded = false,
  onToggleExpand
}: QuickActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<QuickAction | null>(null);

  const getDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleQuickAction = async (action: QuickAction) => {
    setLoading(action.id);
    
    try {
      await addTimeSlot({
        userId: user.id,
        date: getDateString(selectedDate),
        startTime: action.startHour.toString(),
        endTime: action.endHour.toString(),
        isUnavailable: true,
        eventType: action.eventType,
        note: action.label,
      });
      
      toast.calendar(`${action.emoji} Marcado: ${action.label}`, 
        `${action.startHour.toString().padStart(2, '0')}:00 - ${action.endHour.toString().padStart(2, '0')}:00`
      );
      
      onActionComplete();
    } catch (error) {
      toast.error('Error al marcar ocupado');
    } finally {
      setLoading(null);
      setConfirmAction(null);
    }
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <>
      <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
        <div 
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          onClick={onToggleExpand}
        >
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold dark:text-white">Acciones Rápidas</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({formatDateShort(selectedDate)})
            </span>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg 
              className="h-5 w-5 text-gray-500" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-3 pt-0 border-t dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Marca rápidamente como ocupado:
                </p>
                
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {QUICK_ACTIONS.map((action) => (
                    <Button
                      key={action.id}
                      variant="outline"
                      size="sm"
                      className={`flex items-center gap-2 h-auto py-2 px-3 justify-start transition-all ${
                        loading === action.id ? 'opacity-50' : ''
                      }`}
                      onClick={() => setConfirmAction(action)}
                      disabled={loading !== null}
                    >
                      <span className="text-lg">{action.emoji}</span>
                      <div className="text-left">
                        <div className="font-medium text-xs">{action.label}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">
                          {action.startHour.toString().padStart(2, '0')}:00 - {action.endHour.toString().padStart(2, '0')}:00
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>

                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Tip: Usa estas acciones para marcar rápidamente tu disponibilidad
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmAction(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="text-5xl mb-4">{confirmAction.emoji}</div>
                <h3 className="text-lg font-bold dark:text-white mb-2">
                  Marcar como ocupado
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-1">
                  {confirmAction.label}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                  {formatDateShort(selectedDate)} • {confirmAction.startHour.toString().padStart(2, '0')}:00 - {confirmAction.endHour.toString().padStart(2, '0')}:00
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmAction(null)}
                  disabled={loading !== null}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button
                  className={`flex-1 ${confirmAction.color} text-white`}
                  onClick={() => handleQuickAction(confirmAction)}
                  disabled={loading !== null}
                >
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Confirmar
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
