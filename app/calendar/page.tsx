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
  const [eventType, setEventType] = useState<'unavailable' | 'plan' | 'meeting' | 'tentative' | 'other'>('unavailable');
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(userData));
    
    // Cargar preferencia de dark mode
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
    
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

  // Efecto para contar mensajes no leídos
  useEffect(() => {
    if (!user) return;
    
    const checkUnreadMessages = async () => {
      const { getMessages } = await import('@/lib/storage-supabase');
      const messages = await getMessages();
      const lastReadTimestamp = localStorage.getItem(`lastReadMessage_${user.id}`);
      
      if (!lastReadTimestamp) {
        // Si nunca leyó mensajes, contar todos los mensajes del otro usuario
        const unread = messages.filter(m => m.senderId !== user.id).length;
        setUnreadCount(unread);
      } else {
        // Contar mensajes posteriores a la última lectura del otro usuario
        const unread = messages.filter(
          m => m.senderId !== user.id && new Date(m.timestamp) > new Date(lastReadTimestamp)
        ).length;
        setUnreadCount(unread);
      }
    };

    checkUnreadMessages();

    // Suscribirse a cambios en mensajes
    const messagesChannel = supabase
      .channel('messages_count')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages_meeting_app' },
        () => {
          checkUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [user]);

  const loadSlots = async () => {
    const data = await getTimeSlots();
    setSlots(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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
    // Usar el timezone local para evitar desfases por UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    
    // No permitir navegar a fechas pasadas
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    newDate.setHours(0, 0, 0, 0);
    
    if (newDate >= today) {
      setSelectedDate(newDate);
    }
  };

  const isBeforeToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    const yesterday = new Date(selected);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday < today;
  };

  const getUserSlots = (userId: string) => {
    const dateStr = getDateString(selectedDate);
    return slots.filter(s => s.userId === userId && s.date === dateStr);
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
    
    if (editingSlotId) {
      // Editar slot existente
      const { updateTimeSlot } = await import('@/lib/storage-supabase');
      await updateTimeSlot(editingSlotId, {
        startTime: start.toString(),
        endTime: end.toString(),
        isUnavailable: eventType === 'unavailable',
        eventType: eventType,
        note: note || undefined,
      });
    } else {
      // Crear nuevo slot
      await addTimeSlot({
        userId: user.id,
        date: dateStr,
        startTime: start.toString(),
        endTime: end.toString(),
        isUnavailable: eventType === 'unavailable',
        eventType: eventType,
        note: note || undefined,
      });
    }

    setStartHour('9');
    setEndHour('18');
    setNote('');
    setEventType('unavailable');
    setShowForm(false);
    setEditingSlotId(null);
    await loadSlots();
  };

  const removeSlot = async (id: string) => {
    await deleteTimeSlot(id);
    await loadSlots();
  };

  const startEditSlot = (slot: TimeSlot) => {
    setEditingSlotId(slot.id);
    setStartHour(slot.startTime);
    setEndHour(slot.endTime);
    setNote(slot.note || '');
    setEventType(slot.eventType || 'unavailable');
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingSlotId(null);
    setStartHour('9');
    setEndHour('18');
    setNote('');
    setEventType('unavailable');
    setShowForm(false);
  };

  if (!user) return null;

  const otherUserId = user.id === '1' ? '2' : '1';
  const mySlots = getUserSlots(user.id);
  const otherSlots = getUserSlots(otherUserId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 pb-20">
      <div className="sticky top-0 bg-white dark:bg-gray-800 shadow-md z-10">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Calendar
          </h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (user) {
                  localStorage.setItem(`lastReadMessage_${user.id}`, new Date().toISOString());
                  setUnreadCount(0);
                }
                router.push('/messages');
              }}
              className="relative bg-blue-500 text-white hover:bg-blue-600 border-blue-600"
            >
              💬 Mensajes
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleDarkMode} title="Cambiar tema">
              {darkMode ? '☀️' : '🌙'}
            </Button>
            <Button variant="ghost" size="sm" onClick={loadSlots} title="Refrescar">
              🔄
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Salir
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => changeDate(-1)}
            disabled={isBeforeToday()}
          >
            ← 
          </Button>
          <span className="font-medium text-sm capitalize text-center">{formatDate(selectedDate)}</span>
          <Button variant="outline" size="sm" onClick={() => changeDate(1)}>
            →
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Vista Mensual Button */}
        <Button 
          onClick={() => router.push('/week')} 
          variant="outline" 
          className="w-full shadow-md border-2 border-purple-200 hover:bg-purple-50 dark:border-purple-700 dark:hover:bg-purple-900/20 dark:text-gray-200"
        >
          📅 Ver calendario mensual
        </Button>

        {/* Tu disponibilidad */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Tu disponibilidad</CardTitle>
              <Button 
                size="sm" 
                onClick={() => showForm ? cancelEdit() : setShowForm(true)}
                variant={showForm ? "outline" : "default"}
              >
                {showForm ? 'Cancelar' : '+ Agregar'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {showForm && (
              <div className="p-4 bg-blue-50 rounded-lg space-y-3 border-2 border-blue-200">
                {/* Selector de tipo de evento */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo de evento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={eventType === 'unavailable' ? 'default' : 'outline'}
                      className={eventType === 'unavailable' ? 'bg-red-500 hover:bg-red-600' : ''}
                      onClick={() => setEventType('unavailable')}
                      size="sm"
                    >
                      🔴 Ocupado
                    </Button>
                    <Button
                      type="button"
                      variant={eventType === 'plan' ? 'default' : 'outline'}
                      className={eventType === 'plan' ? 'bg-green-500 hover:bg-green-600' : ''}
                      onClick={() => setEventType('plan')}
                      size="sm"
                    >
                      🟢 Plan
                    </Button>
                    <Button
                      type="button"
                      variant={eventType === 'meeting' ? 'default' : 'outline'}
                      className={eventType === 'meeting' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                      onClick={() => setEventType('meeting')}
                      size="sm"
                    >
                      🔵 Reunión
                    </Button>
                    <Button
                      type="button"
                      variant={eventType === 'tentative' ? 'default' : 'outline'}
                      className={eventType === 'tentative' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                      onClick={() => setEventType('tentative')}
                      size="sm"
                    >
                      🟡 Charlemos
                    </Button>
                  </div>
                </div>

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
                  {editingSlotId ? '✏️ Actualizar' : 
                   (eventType === 'unavailable' ? '🔴 Guardar ocupado' : 
                    eventType === 'plan' ? '🟢 Guardar plan' : 
                    eventType === 'meeting' ? '🔵 Guardar reunión' : 
                    eventType === 'tentative' ? '🟡 Guardar charlemos' : 'Guardar')}
                </Button>
              </div>
            )}

            {mySlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No tienes eventos para este día</p>
                <p className="text-xs mt-1">Toca "+ Agregar" para crear uno</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mySlots.map((slot) => {
                  const type = slot.eventType || 'unavailable';
                  
                  // Definir clases completas para cada tipo
                  let bgClass = 'bg-red-50';
                  let borderClass = 'border-red-200';
                  let textClass = 'text-red-900';
                  let emoji = '🔴';
                  let label = 'Ocupado';
                  
                  if (type === 'plan') {
                    bgClass = 'bg-green-50';
                    borderClass = 'border-green-200';
                    textClass = 'text-green-900';
                    emoji = '🟢';
                    label = 'Plan';
                  } else if (type === 'meeting') {
                    bgClass = 'bg-blue-50';
                    borderClass = 'border-blue-200';
                    textClass = 'text-blue-900';
                    emoji = '🔵';
                    label = 'Reunión';
                  } else if (type === 'tentative') {
                    bgClass = 'bg-yellow-50';
                    borderClass = 'border-yellow-200';
                    textClass = 'text-yellow-900';
                    emoji = '🟡';
                    label = 'Charlemos';
                  } else if (type === 'other') {
                    bgClass = 'bg-purple-50';
                    borderClass = 'border-purple-200';
                    textClass = 'text-purple-900';
                    emoji = '🟣';
                    label = 'Otro';
                  }
                  
                  return (
                  <div
                    key={slot.id}
                    className={`p-3 ${bgClass} border-2 ${borderClass} rounded-lg`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className={`font-semibold ${textClass}`}>
                          {emoji} {parseInt(slot.startTime).toString().padStart(2, '0')}:00 - {parseInt(slot.endTime).toString().padStart(2, '0')}:00
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">{label}</div>
                        {slot.note && (
                          <div className="text-sm text-gray-700 mt-1">{slot.note}</div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditSlot(slot)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                        >
                          ✏️
                        </Button>
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
                  </div>
                );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disponibilidad del otro usuario */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Eventos del otro usuario</CardTitle>
          </CardHeader>
          <CardContent>
            {otherSlots.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-green-700 font-medium">Sin eventos</p>
                <p className="text-sm text-gray-500 mt-1">No tiene eventos para este día</p>
              </div>
            ) : (
              <div className="space-y-2">
                {otherSlots.map((slot) => {
                  const type = slot.eventType || 'unavailable';
                  
                  // Definir clases completas para cada tipo
                  let bgClass = 'bg-red-50';
                  let borderClass = 'border-red-200';
                  let textClass = 'text-red-900';
                  let emoji = '🔴';
                  let label = 'Ocupado';
                  
                  if (type === 'plan') {
                    bgClass = 'bg-green-50';
                    borderClass = 'border-green-200';
                    textClass = 'text-green-900';
                    emoji = '🟢';
                    label = 'Plan';
                  } else if (type === 'meeting') {
                    bgClass = 'bg-blue-50';
                    borderClass = 'border-blue-200';
                    textClass = 'text-blue-900';
                    emoji = '🔵';
                    label = 'Reunión';
                  } else if (type === 'tentative') {
                    bgClass = 'bg-yellow-50';
                    borderClass = 'border-yellow-200';
                    textClass = 'text-yellow-900';
                    emoji = '🟡';
                    label = 'Charlemos';
                  } else if (type === 'other') {
                    bgClass = 'bg-purple-50';
                    borderClass = 'border-purple-200';
                    textClass = 'text-purple-900';
                    emoji = '🟣';
                    label = 'Otro';
                  }
                  
                  return (
                  <div
                    key={slot.id}
                    className={`p-3 ${bgClass} border-2 ${borderClass} rounded-lg`}
                  >
                    <div className={`font-semibold ${textClass}`}>
                      {emoji} {parseInt(slot.startTime).toString().padStart(2, '0')}:00 - {parseInt(slot.endTime).toString().padStart(2, '0')}:00
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">{label}</div>
                    {slot.note && (
                      <div className="text-sm text-gray-700 mt-1">{slot.note}</div>
                    )}
                  </div>
                  );
                })}
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
