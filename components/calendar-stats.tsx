'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimeSlot } from '@/lib/storage-supabase';
import { 
  BarChart3, 
  Clock, 
  Calendar as CalendarIcon,
  TrendingUp,
  Users,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface CalendarStatsProps {
  slots: TimeSlot[];
  userId: string;
  isOpen?: boolean;
  onClose?: () => void;
}

interface StatsSummary {
  totalHours: number;
  busyHours: number;
  freeHours: number;
  busyPercentage: number;
  eventsByType: Record<string, number>;
  peakHours: { hour: number; count: number }[];
  weeklyDistribution: { day: string; hours: number }[];
  mutualFreeHours: number;
}

function calculateStats(slots: TimeSlot[], userId: string): StatsSummary {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Lunes
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Filtrar slots de esta semana
  const weekSlots = slots.filter(slot => {
    const slotDate = new Date(slot.date);
    return slotDate >= startOfWeek && slotDate <= endOfWeek;
  });

  // Horas totales de la semana (7 días * 24 horas)
  const totalHours = 7 * 24;

  // Calcular horas ocupadas del usuario
  const userSlots = weekSlots.filter(s => s.userId === userId);
  const busyHours = userSlots.reduce((acc, slot) => {
    return acc + (parseInt(slot.endTime) - parseInt(slot.startTime));
  }, 0);

  // Eventos por tipo
  const eventsByType: Record<string, number> = {};
  userSlots.forEach(slot => {
    const type = slot.eventType || 'unavailable';
    eventsByType[type] = (eventsByType[type] || 0) + 1;
  });

  // Horas pico (conteo de slots por hora)
  const hourCounts: Record<number, number> = {};
  userSlots.forEach(slot => {
    const start = parseInt(slot.startTime);
    const end = parseInt(slot.endTime);
    for (let h = start; h < end; h++) {
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    }
  });

  const peakHours = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Distribución semanal
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const weeklyDistribution = dayNames.map((day, index) => {
    const targetDate = new Date(startOfWeek);
    targetDate.setDate(startOfWeek.getDate() + index);
    const dateStr = targetDate.toISOString().split('T')[0];
    
    const daySlots = userSlots.filter(s => s.date === dateStr);
    const hours = daySlots.reduce((acc, slot) => {
      return acc + (parseInt(slot.endTime) - parseInt(slot.startTime));
    }, 0);
    
    return { day, hours };
  });

  // Horas libres mutuas (horas donde ninguno está ocupado)
  const allSlots = weekSlots;
  const occupiedHours: Set<string> = new Set();
  
  allSlots.forEach(slot => {
    const start = parseInt(slot.startTime);
    const end = parseInt(slot.endTime);
    for (let h = start; h < end; h++) {
      occupiedHours.add(`${slot.date}-${h}`);
    }
  });

  // Calcular horas libres mutuas (simplificado)
  let mutualFreeHours = 0;
  for (let d = 0; d < 7; d++) {
    const targetDate = new Date(startOfWeek);
    targetDate.setDate(startOfWeek.getDate() + d);
    const dateStr = targetDate.toISOString().split('T')[0];
    
    for (let h = 8; h < 22; h++) { // Solo horario diurno
      if (!occupiedHours.has(`${dateStr}-${h}`)) {
        mutualFreeHours++;
      }
    }
  }

  return {
    totalHours,
    busyHours,
    freeHours: totalHours - busyHours,
    busyPercentage: Math.round((busyHours / totalHours) * 100),
    eventsByType,
    peakHours,
    weeklyDistribution,
    mutualFreeHours,
  };
}

export function CalendarStats({ slots, userId, isOpen = false, onClose }: CalendarStatsProps) {
  const stats = useMemo(() => calculateStats(slots, userId), [slots, userId]);
  const [expanded, setExpanded] = useState(false);

  const eventTypeLabels: Record<string, { label: string; color: string; emoji: string }> = {
    unavailable: { label: 'Ocupado', color: 'bg-red-500', emoji: '🔴' },
    plan: { label: 'Planes', color: 'bg-green-500', emoji: '🟢' },
    meeting: { label: 'Reuniones', color: 'bg-blue-500', emoji: '🔵' },
    tentative: { label: 'Charlemos', color: 'bg-yellow-500', emoji: '🟡' },
    other: { label: 'Otros', color: 'bg-purple-500', emoji: '🟣' },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-background rounded-t-3xl max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <h2 className="font-semibold text-lg">Estadísticas de la Semana</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Cards principales */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 bg-gradient-to-br from-red-500/10 to-red-500/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-muted-foreground">Ocupado</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.busyHours}h
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stats.busyPercentage}% de la semana
                  </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Libre juntos</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.mutualFreeHours}h
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Horas disponibles
                  </div>
                </Card>
              </div>

              {/* Distribución por tipo */}
              <Card className="p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-purple-500" />
                  Eventos por Tipo
                </h3>
                <div className="space-y-2">
                  {Object.entries(stats.eventsByType).map(([type, count]) => {
                    const typeInfo = eventTypeLabels[type] || eventTypeLabels.unavailable;
                    const percentage = Math.round((count / Object.values(stats.eventsByType).reduce((a, b) => a + b, 0)) * 100) || 0;
                    
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <span className="text-lg">{typeInfo.emoji}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{typeInfo.label}</span>
                            <span className="text-muted-foreground">{count}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.5, delay: 0.1 }}
                              className={`h-full ${typeInfo.color} rounded-full`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(stats.eventsByType).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No hay eventos esta semana
                    </p>
                  )}
                </div>
              </Card>

              {/* Distribución semanal */}
              <Card className="p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  Horas por Día
                </h3>
                <div className="flex items-end justify-between gap-1 h-24">
                  {stats.weeklyDistribution.map((day, i) => {
                    const maxHours = Math.max(...stats.weeklyDistribution.map(d => d.hours), 1);
                    const height = (day.hours / maxHours) * 100;
                    
                    return (
                      <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(height, 4)}%` }}
                          transition={{ duration: 0.5, delay: i * 0.05 }}
                          className={`w-full rounded-t-md ${
                            day.hours > 0 ? 'bg-purple-500' : 'bg-muted'
                          }`}
                        />
                        <span className="text-[10px] text-muted-foreground">{day.day}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Expandir para ver más */}
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Ver más detalles
                  </>
                )}
              </Button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <Card className="p-4">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-500" />
                        Horas más ocupadas
                      </h3>
                      {stats.peakHours.length > 0 ? (
                        <div className="space-y-2">
                          {stats.peakHours.map(({ hour, count }, i) => (
                            <div key={hour} className="flex items-center gap-3">
                              <span className="w-16 text-sm text-muted-foreground">
                                {hour.toString().padStart(2, '0')}:00
                              </span>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(count / stats.peakHours[0].count) * 100}%` }}
                                  transition={{ duration: 0.3, delay: i * 0.05 }}
                                  className="h-full bg-amber-500 rounded-full"
                                />
                              </div>
                              <span className="text-sm font-medium w-8 text-right">{count}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Sin datos suficientes
                        </p>
                      )}
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Botón compacto para abrir estadísticas
export function CalendarStatsButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="flex items-center gap-2"
    >
      <BarChart3 className="h-4 w-4" />
      <span className="hidden sm:inline">Estadísticas</span>
    </Button>
  );
}
