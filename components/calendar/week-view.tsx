'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User } from '@/lib/auth-supabase';
import { TimeSlot, getTimeSlots } from '@/lib/storage-supabase';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Calendar, Users } from 'lucide-react';
import { SyncIndicator } from '@/components/sync-indicator';

const TIMEZONE = 'America/Argentina/Cordoba';
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface WeekViewProps {
  onDayClick?: (date: Date) => void;
}

export function WeekView({ onDayClick }: WeekViewProps) {
  const [user, setUser] = useState<User | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    return new Date(today.setDate(diff));
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(userData));
    loadSlots();

    const channel = supabase
      .channel('week_view_slots')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_slots_meeting_app' },
        () => loadSlots()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const loadSlots = useCallback(async () => {
    const cached = localStorage.getItem('cachedSlots');
    if (cached) {
      try {
        setSlots(JSON.parse(cached));
      } catch (e) {}
    }
    
    try {
      setIsSyncing(true);
      const data = await getTimeSlots();
      setSlots(data);
      localStorage.setItem('cachedSlots', JSON.stringify(data));
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }, [weekStart]);

  const getDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const changeWeek = (direction: number) => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + (direction * 7));
    setWeekStart(newStart);
  };

  const goToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    setWeekStart(new Date(today.setDate(diff)));
  };

  const otherUserId = user?.id === '1' ? '2' : '1';

  // Get slots for a specific day and user
  const getDaySlots = useCallback((date: Date, userId: string) => {
    const dateStr = getDateString(date);
    return slots.filter(s => s.userId === userId && s.date === dateStr);
  }, [slots]);

  // Check if an hour is covered by any slot
  const isHourCovered = useCallback((date: Date, hour: number, userId: string) => {
    const daySlots = getDaySlots(date, userId);
    return daySlots.some(slot => {
      const start = parseInt(slot.startTime);
      const end = parseInt(slot.endTime);
      return hour >= start && hour < end;
    });
  }, [getDaySlots]);

  // Get slot at specific hour
  const getSlotAtHour = useCallback((date: Date, hour: number, userId: string) => {
    const daySlots = getDaySlots(date, userId);
    return daySlots.find(slot => {
      const start = parseInt(slot.startTime);
      const end = parseInt(slot.endTime);
      return hour >= start && hour < end;
    });
  }, [getDaySlots]);

  // Check if both users are available at a specific hour
  const isBothAvailable = useCallback((date: Date, hour: number) => {
    const mySlot = getSlotAtHour(date, hour, user?.id || '');
    const otherSlot = getSlotAtHour(date, hour, otherUserId);
    
    // Both available = neither has an "unavailable" slot
    const myUnavailable = mySlot?.eventType === 'unavailable' || mySlot?.isUnavailable;
    const otherUnavailable = otherSlot?.eventType === 'unavailable' || otherSlot?.isUnavailable;
    
    return !myUnavailable && !otherUnavailable;
  }, [getSlotAtHour, user?.id, otherUserId]);

  const getSlotColor = (slot: TimeSlot | undefined, isOther: boolean) => {
    if (!slot) return '';
    
    const type = slot.eventType || 'unavailable';
    const opacity = isOther ? '60' : '';
    
    switch (type) {
      case 'plan':
        return `bg-green-500${opacity}`;
      case 'meeting':
        return `bg-blue-500${opacity}`;
      case 'tentative':
        return `bg-yellow-500${opacity}`;
      case 'unavailable':
      default:
        return `bg-red-500${opacity}`;
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  if (!user) return null;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <SyncIndicator isSyncing={isSyncing} />
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Vista Semanal
          </h1>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoy
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => changeWeek(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <span className="font-medium dark:text-white">
            {weekDays[0].toLocaleDateString('es-AR', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('es-AR', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          
          <Button variant="ghost" size="icon" onClick={() => changeWeek(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="dark:text-gray-300">Ocupado (Tú)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500/60" />
            <span className="dark:text-gray-300">Ocupado (Otro)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-400 border-2 border-green-600" />
            <span className="dark:text-gray-300">Ambos libres</span>
          </div>
        </div>
      </div>

      {/* Week Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[700px]">
          {/* Day Headers */}
          <div className="grid grid-cols-8 sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 z-10">
            <div className="p-2 text-center text-xs text-gray-500 dark:text-gray-400 border-r dark:border-gray-700">
              Hora
            </div>
            {weekDays.map((day, i) => (
              <div
                key={i}
                className={`p-2 text-center border-r dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  isToday(day) ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                } ${isPast(day) ? 'opacity-50' : ''}`}
                onClick={() => onDayClick?.(day)}
              >
                <div className="text-xs text-gray-500 dark:text-gray-400">{DAYS[day.getDay()]}</div>
                <div className={`text-lg font-bold ${isToday(day) ? 'text-blue-600 dark:text-blue-400' : 'dark:text-white'}`}>
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Hour Rows */}
          <div className="relative">
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b dark:border-gray-700 h-12">
                {/* Hour Label */}
                <div className="p-1 text-xs text-gray-500 dark:text-gray-400 border-r dark:border-gray-700 flex items-center justify-center">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                
                {/* Day Cells */}
                {weekDays.map((day, dayIndex) => {
                  const mySlot = getSlotAtHour(day, hour, user.id);
                  const otherSlot = getSlotAtHour(day, hour, otherUserId);
                  const bothAvailable = isBothAvailable(day, hour);
                  const past = isPast(day);

                  return (
                    <div
                      key={dayIndex}
                      className={`relative border-r dark:border-gray-700 ${past ? 'bg-gray-100 dark:bg-gray-800/50' : ''}`}
                      onClick={() => !past && onDayClick?.(day)}
                    >
                      {/* Both Available Highlight */}
                      {bothAvailable && !past && (
                        <div className="absolute inset-0 bg-green-100 dark:bg-green-900/30 border-l-2 border-green-500" />
                      )}
                      
                      {/* My Slot */}
                      {mySlot && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`absolute top-0 left-0 right-1/2 bottom-0 ${getSlotColor(mySlot, false)} rounded-sm m-0.5 flex items-center justify-center`}
                          title={mySlot.note || mySlot.eventType}
                        >
                          <span className="text-white text-[10px] font-bold truncate px-1">
                            {mySlot.eventType === 'unavailable' ? '🔴' : mySlot.eventType === 'plan' ? '🟢' : mySlot.eventType === 'meeting' ? '🔵' : '🟡'}
                          </span>
                        </motion.div>
                      )}
                      
                      {/* Other User Slot */}
                      {otherSlot && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`absolute top-0 left-1/2 right-0 bottom-0 ${getSlotColor(otherSlot, true)} rounded-sm m-0.5 flex items-center justify-center`}
                          title={otherSlot.note || otherSlot.eventType}
                        >
                          <span className="text-white text-[10px] font-bold truncate px-1">
                            <Users className="h-3 w-3" />
                          </span>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
