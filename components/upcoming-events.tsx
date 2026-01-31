'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimeSlot, getTimeSlots } from '@/lib/storage-supabase';
import { User } from '@/lib/auth-supabase';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, ChevronRight, Users, MapPin } from 'lucide-react';

interface UpcomingEvent {
  slot: TimeSlot;
  date: Date;
  isOwn: boolean;
  daysUntil: number;
}

export function UpcomingEvents() {
  const [user, setUser] = useState<User | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    loadSlots();

    const channel = supabase
      .channel('upcoming_events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_slots_meeting_app' },
        () => loadSlots()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSlots = async () => {
    try {
      const cached = localStorage.getItem('cachedSlots');
      if (cached) {
        setSlots(JSON.parse(cached));
      }
      
      const data = await getTimeSlots();
      setSlots(data);
      localStorage.setItem('cachedSlots', JSON.stringify(data));
    } finally {
      setLoading(false);
    }
  };

  const upcomingEvents = useMemo(() => {
    if (!user) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const otherUserId = user.id === '1' ? '2' : '1';

    const events: UpcomingEvent[] = [];

    slots.forEach(slot => {
      const [year, month, day] = slot.date.split('-').map(Number);
      const slotDate = new Date(year, month - 1, day);
      slotDate.setHours(0, 0, 0, 0);

      if (slotDate >= today) {
        const daysUntil = Math.floor((slotDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Include plans, meetings, and tentative events (exclude just "unavailable")
        if (slot.eventType !== 'unavailable' || slot.note) {
          events.push({
            slot,
            date: slotDate,
            isOwn: slot.userId === user.id,
            daysUntil,
          });
        }
      }
    });

    // Sort by date and time
    return events
      .sort((a, b) => {
        const dateDiff = a.date.getTime() - b.date.getTime();
        if (dateDiff !== 0) return dateDiff;
        return parseInt(a.slot.startTime) - parseInt(b.slot.startTime);
      })
      .slice(0, 5); // Limit to 5 upcoming events
  }, [slots, user]);

  const getEventIcon = (type: string | undefined) => {
    switch (type) {
      case 'plan':
        return '🟢';
      case 'meeting':
        return '🔵';
      case 'tentative':
        return '🟡';
      default:
        return '📅';
    }
  };

  const getEventLabel = (type: string | undefined) => {
    switch (type) {
      case 'plan':
        return 'Plan';
      case 'meeting':
        return 'Reunión';
      case 'tentative':
        return 'Por confirmar';
      default:
        return 'Evento';
    }
  };

  const getDaysUntilLabel = (days: number) => {
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Mañana';
    if (days < 7) return `En ${days} días`;
    if (days < 14) return 'Próxima semana';
    return `En ${Math.floor(days / 7)} semanas`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  if (loading) {
    return (
      <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 dark:text-gray-100">
            <Calendar className="h-5 w-5" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 dark:text-gray-100">
            <Calendar className="h-5 w-5 text-blue-600" />
            Próximos Eventos
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/calendar')}
            className="text-blue-600 hover:text-blue-800"
          >
            Ver todos
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">📅</div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              No hay eventos próximos
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Agrega un plan o reunión para verlo aquí
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => router.push('/calendar')}
            >
              + Agregar evento
            </Button>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {upcomingEvents.map((event, index) => (
                <motion.div
                  key={event.slot.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    event.daysUntil === 0
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                  onClick={() => router.push('/calendar')}
                >
                  {/* Event Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                    event.slot.eventType === 'plan' ? 'bg-green-100 dark:bg-green-900/30' :
                    event.slot.eventType === 'meeting' ? 'bg-blue-100 dark:bg-blue-900/30' :
                    event.slot.eventType === 'tentative' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                    'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    {getEventIcon(event.slot.eventType)}
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white truncate">
                        {event.slot.note || getEventLabel(event.slot.eventType)}
                      </span>
                      {!event.isOwn && (
                        <span className="flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                          <Users className="h-3 w-3" />
                          Otro
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {parseInt(event.slot.startTime).toString().padStart(2, '0')}:00 - {parseInt(event.slot.endTime).toString().padStart(2, '0')}:00
                      </span>
                      <span>•</span>
                      <span>{formatDate(event.date)}</span>
                    </div>
                  </div>

                  {/* Days Until Badge */}
                  <div className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                    event.daysUntil === 0
                      ? 'bg-blue-500 text-white'
                      : event.daysUntil === 1
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {getDaysUntilLabel(event.daysUntil)}
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}
