'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { User } from '@/lib/auth-supabase';
import { TimeSlot, getTimeSlots, addTimeSlot, deleteTimeSlot } from '@/lib/storage-supabase';
import { supabase } from '@/lib/supabase';

const TIMEZONE = 'America/Argentina/Cordoba';

export default function CalendarPage() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [startHour, setStartHour] = useState<string>('9');
  const [endHour, setEndHour] = useState<string>('18');
  const [note, setNote] = useState('');
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

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
      .channel('time_slots_changes')
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-AR', {
      timeZone: TIMEZONE,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDateString = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const getUserSlots = (userId: string) => {
    const dateStr = getDateString(selectedDate);
    return slots.filter(s => s.userId === userId && s.date === dateStr && s.isUnavailable);
  };

  const saveSlot = async () => {
    if (!user) return;

    const start = parseInt(startHour);
    const end = parseInt(endHour);

    if (start >= end) {
      alert('La hora de fin debe ser mayor a la hora de inicio');
      return;
    }

    const dateStr = getDateString(selectedDate);
    await addTimeSlot({
      userId: user.id,
      date: dateStr,
      startTime: start.toString(),
      endTime: end.toString(),
      isUnavailable: true,
      note: note || undefined,
    });

    setStartHour('9');
    setEndHour('18');
    setNote('');
    setShowForm(false);
    await loadSlots();
  };

  const removeSlot = async (id: string) => {
    await deleteTimeSlot(id);
    await loadSlots();
  };

  if (!user) return null;

  const otherUserId = user.id === '1' ? '2' : '1';
  const mySlots = getUserSlots(user.id);
  const otherSlots = getUserSlots(otherUserId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-20">
      <div className="sticky top-0 bg-white shadow-md z-10">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Calendar
          </h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={loadSlots} title="Refrescar">
              🔄
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Salir
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 border-t">
          <Button variant="outline" size="sm" onClick={() => changeDate(-1)}>
            ← 
          </Button>
          <span className="font-medium text-sm capitalize text-center">{formatDate(selectedDate)}</span>
          <Button variant="outline" size="sm" onClick={() => changeDate(1)}>
            →
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Vista Semanal Button */}
        <Button 
          onClick={() => router.push('/week')} 
          variant="outline" 
          className="w-full shadow-md border-2 border-purple-200 hover:bg-purple-50"
        >
          📅 Ver calendario semanal
        </Button>

        {/* Tu disponibilidad */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Tu disponibilidad</CardTitle>
              <Button 
                size="sm" 
                onClick={() => setShowForm(!showForm)}
                variant={showForm ? "outline" : "default"}
              >
                {showForm ? 'Cancelar' : '+ Agregar'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {showForm && (
              <div className="p-4 bg-blue-50 rounded-lg space-y-3 border-2 border-blue-200">
                {/* Botón de todo el día */}
                <Button 
                  onClick={() => {
                    setStartHour('0');
                    setEndHour('24');
                  }}
                  variant="outline"
                  className="w-full border-dashed"
                  type="button"
                >
                  🕐 Todo el día (00:00 - 24:00)
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Desde</label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={startHour}
                      onChange={(e) => setStartHour(e.target.value)}
                      className="w-full"
                      placeholder="Ej: 9"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {startHour ? `${startHour.padStart(2, '0')}:00` : 'Hora'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Hasta</label>
                    <Input
                      type="number"
                      min="1"
                      max="24"
                      value={endHour}
                      onChange={(e) => setEndHour(e.target.value)}
                      className="w-full"
                      placeholder="Ej: 18"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {endHour ? `${endHour.padStart(2, '0')}:00` : 'Hora'}
                    </p>
                  </div>
                </div>
                
                {/* Botones rápidos */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => { setStartHour('9'); setEndHour('13'); }}
                    variant="outline"
                    size="sm"
                    type="button"
                    className="text-xs"
                  >
                    Mañana (9-13)
                  </Button>
                  <Button
                    onClick={() => { setStartHour('13'); setEndHour('18'); }}
                    variant="outline"
                    size="sm"
                    type="button"
                    className="text-xs"
                  >
                    Tarde (13-18)
                  </Button>
                  <Button
                    onClick={() => { setStartHour('18'); setEndHour('22'); }}
                    variant="outline"
                    size="sm"
                    type="button"
                    className="text-xs"
                  >
                    Noche (18-22)
                  </Button>
                </div>

                <Input
                  placeholder="Nota opcional..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button onClick={saveSlot} className="w-full">
                  Guardar horario ocupado
                </Button>
              </div>
            )}

            {mySlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No tienes horarios ocupados para este día</p>
                <p className="text-xs mt-1">Toca "+ Agregar" para marcar un rango</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-3 bg-red-50 border-2 border-red-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-red-900">
                          🔴 {parseInt(slot.startTime).toString().padStart(2, '0')}:00 - {parseInt(slot.endTime).toString().padStart(2, '0')}:00
                        </div>
                        {slot.note && (
                          <div className="text-sm text-gray-700 mt-1">{slot.note}</div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSlot(slot.id)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-100"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disponibilidad del otro usuario */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Disponibilidad del otro usuario</CardTitle>
          </CardHeader>
          <CardContent>
            {otherSlots.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-green-700 font-medium">Disponible todo el día</p>
                <p className="text-sm text-gray-500 mt-1">No tiene horarios ocupados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {otherSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-3 bg-red-50 border-2 border-red-200 rounded-lg"
                  >
                    <div className="font-semibold text-red-900">
                      🔴 {parseInt(slot.startTime).toString().padStart(2, '0')}:00 - {parseInt(slot.endTime).toString().padStart(2, '0')}:00
                    </div>
                    {slot.note && (
                      <div className="text-sm text-gray-700 mt-1">{slot.note}</div>
                    )}
                  </div>
                ))}
                {(() => {
                  // Calcular horas ocupadas totales
                  const totalBusyHours = otherSlots.reduce((total, slot) => {
                    return total + (parseInt(slot.endTime) - parseInt(slot.startTime));
                  }, 0);
                  
                  // Solo mostrar mensaje de disponibilidad si hay tiempo libre
                  if (totalBusyHours < 24) {
                    return (
                      <div className="text-center mt-4 p-3 bg-green-50 rounded-lg border-2 border-green-200">
                        <p className="text-sm text-green-700">El resto del día está disponible ✅</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="text-center mt-4 p-3 bg-red-50 rounded-lg border-2 border-red-200">
                      <p className="text-sm text-red-700">❌ No disponible todo el día</p>
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
