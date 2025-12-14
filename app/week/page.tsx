'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { User } from '@/lib/auth-supabase';
import { TimeSlot, getTimeSlots } from '@/lib/storage-supabase';
import { supabase } from '@/lib/supabase';

const TIMEZONE = 'America/Argentina/Cordoba';

export default function WeekViewPage() {
  const [user, setUser] = useState<User | null>(null);
  const [startOfWeek, setStartOfWeek] = useState<Date>(getMonday(new Date()));
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const router = useRouter();

  function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(userData));
    loadSlots();

    // Supabase Realtime subscription - se actualiza solo cuando hay cambios en la DB
    const channel = supabase
      .channel('time_slots_changes_week')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_slots_meeting_app' },
        () => {
          loadSlots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const loadSlots = async () => {
    const data = await getTimeSlots();
    setSlots(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  const changeWeek = (weeks: number) => {
    const newDate = new Date(startOfWeek);
    newDate.setDate(newDate.getDate() + (weeks * 7));
    setStartOfWeek(newDate);
  };

  const getWeekDays = (): Date[] => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const getDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatDayHeader = (date: Date): string => {
    return date.toLocaleDateString('es-AR', {
      timeZone: TIMEZONE,
      weekday: 'short',
      day: 'numeric',
    });
  };

  const getDaySlotsForUser = (date: Date, userId: string): TimeSlot[] => {
    const dateStr = getDateString(date);
    return slots.filter(s => s.userId === userId && s.date === dateStr && s.isUnavailable);
  };

  if (!user) return null;

  const weekDays = getWeekDays();
  const otherUserId = user.id === '1' ? '2' : '1';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-20">
      <div className="sticky top-0 bg-white shadow-md z-10">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/calendar')}>
            ← Día
          </Button>
          <h1 className="text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Semana
          </h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Salir
          </Button>
        </div>
        <div className="flex items-center justify-between px-4 pb-3 border-t pt-3">
          <Button variant="outline" size="sm" onClick={() => changeWeek(-1)}>
            ←
          </Button>
          <span className="text-xs font-medium">
            {weekDays[0].toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} - {weekDays[6].toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
          </span>
          <Button variant="outline" size="sm" onClick={() => changeWeek(1)}>
            →
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {weekDays.map((day, index) => {
          const mySlots = getDaySlotsForUser(day, user.id);
          const otherSlots = getDaySlotsForUser(day, otherUserId);
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <Card key={index} className={`shadow-md ${isToday ? 'ring-2 ring-blue-400' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm capitalize">
                      {day.toLocaleDateString('es-AR', { weekday: 'long' })}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {day.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  {isToday && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                      Hoy
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Tus horarios */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-600">Tu disponibilidad:</p>
                  {mySlots.length === 0 ? (
                    <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                      ✅ Disponible todo el día
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {mySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="text-xs bg-blue-50 p-2 rounded border border-blue-200"
                        >
                          <div className="font-medium text-blue-900">
                            🔵 {parseInt(slot.startTime).toString().padStart(2, '0')}:00 - {parseInt(slot.endTime).toString().padStart(2, '0')}:00
                          </div>
                          {slot.note && (
                            <div className="text-gray-600 mt-0.5">{slot.note}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Horarios del otro usuario */}
                <div className="space-y-1 pt-1 border-t">
                  <p className="text-xs font-medium text-gray-600">Otro usuario:</p>
                  {otherSlots.length === 0 ? (
                    <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                      ✅ Disponible todo el día
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {otherSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="text-xs bg-red-50 p-2 rounded border border-red-200"
                        >
                          <div className="font-medium text-red-900">
                            🔴 {parseInt(slot.startTime).toString().padStart(2, '0')}:00 - {parseInt(slot.endTime).toString().padStart(2, '0')}:00
                          </div>
                          {slot.note && (
                            <div className="text-gray-600 mt-0.5">{slot.note}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4">
        <Button 
          onClick={() => router.push('/calendar')} 
          variant="outline" 
          className="w-full bg-white shadow-lg"
        >
          Volver a vista diaria
        </Button>
      </div>
    </div>
  );
}
