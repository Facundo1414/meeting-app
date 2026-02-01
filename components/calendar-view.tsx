'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { User } from '@/lib/auth-supabase';
import { TimeSlot, getTimeSlots, addTimeSlot, deleteTimeSlot, updateLastSeen } from '@/lib/storage-supabase';
import { supabase } from '@/lib/supabase';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { CalendarDaySkeleton } from '@/components/calendar-skeleton';
import { useSwipeNavigation } from '@/hooks/use-swipe-navigation';
import { PageTransition } from '@/components/page-transition';
import { SyncIndicator } from '@/components/sync-indicator';
import { DesktopSidebar } from '@/components/desktop-sidebar';
import { useVoiceChatGlobal } from '@/components/voice-chat-provider';
import { Phone

 } from 'lucide-react';

const TIMEZONE = 'America/Argentina/Cordoba';

export function CalendarView() {
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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);
  const [partnerUsername, setPartnerUsername] = useState<string>('Tu pareja');
  const router = useRouter();
  const isChangingDate = useRef(false);
  
  // Hook de llamadas de voz
  const { startCall, isInCall, isConnecting } = useVoiceChatGlobal();

  // Definir loadSlots antes de usarlo en useEffect
  const loadSlots = useCallback(async () => {
    // Cargar caché primero para render inmediato
    const cached = localStorage.getItem('cachedSlots');
    if (cached) {
      try {
        setSlots(JSON.parse(cached));
      } catch (e) {
        // Ignorar errores de parseo
      }
    }
    
    try {
      setIsSyncing(true);
      const data = await getTimeSlots();
      setSlots(data);
      // Guardar en caché
      localStorage.setItem('cachedSlots', JSON.stringify(data));
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Swipe navigation
  useSwipeNavigation({
    onSwipeLeft: () => changeDate(1),
    onSwipeRight: () => {
      if (!isBeforeToday()) changeDate(-1);
    },
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }

    const currentUser: User = JSON.parse(userData);
    setUser(currentUser);
    
    // Actualizar last_seen al entrar a la app
    updateLastSeen(currentUser.id, currentUser.username);
    
    // Cargar nombre del partner
    const partnerId = currentUser.id === '1' ? '2' : '1';
    supabase
      .from('users_meeting_app')
      .select('username')
      .eq('id', partnerId)
      .single()
      .then(({ data }) => {
        if (data?.username) setPartnerUsername(data.username);
      });
    
    // Cargar preferencia de dark mode
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
    
    loadSlots();

    // Supabase Realtime subscription - recarga siempre que haya cambios
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
  }, [router, loadSlots]);

  // Optimizar el callback de mensajes no leídos
  const checkUnreadMessages = useCallback(async () => {
    if (!user) return;
    
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
  }, [user]);

  // Efecto para contar mensajes no leídos
  useEffect(() => {
    if (!user) return;

    checkUnreadMessages();

    // Suscribirse a cambios en mensajes
    const messagesChannel = supabase
      .channel('messages_count')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages_meeting_app' },
        checkUnreadMessages
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [user, checkUnreadMessages]);

  // Cerrar menú de perfil al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showProfileMenu && !target.closest('.profile-menu-container')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showProfileMenu]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  const toggleDarkMode = useCallback(() => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('es-AR', {
      timeZone: TIMEZONE,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const getDateString = useCallback((date: Date) => {
    // Usar el timezone local para evitar desfases por UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const changeDate = (days: number) => {
    // Prevenir múltiples cambios simultáneos
    if (isChangingDate.current) return;
    isChangingDate.current = true;
    
    // Usar la fecha actual del estado, no crear nueva
    const newDate = new Date(selectedDate.getTime());
    newDate.setDate(newDate.getDate() + days);
    newDate.setHours(0, 0, 0, 0);
    
    // No permitir navegar a fechas pasadas
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (newDate >= today) {
      setSelectedDate(newDate);
    }
    
    // Liberar el lock después de un breve delay
    setTimeout(() => {
      isChangingDate.current = false;
    }, 200);
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

  const getUserSlots = useCallback((userId: string) => {
    const dateStr = getDateString(selectedDate);
    return slots.filter(s => s.userId === userId && s.date === dateStr);
  }, [slots, selectedDate, getDateString]);

  const saveSlot = async () => {
    if (!user) return;

    const start = parseInt(startHour);
    const end = parseInt(endHour);

    if (start >= end) {
      return;
    }

    const dateStr = getDateString(selectedDate);
    
    try {
      setIsSaving(true);
      
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
    } finally {
      setIsSaving(false);
    }
  };

  const removeSlot = async (id: string) => {
    await deleteTimeSlot(id);
    await loadSlots();    setDeleteSlotId(null);  };

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

  // Calcular slots antes de los returns condicionales (reglas de hooks)
  const otherUserId = user?.id === '1' ? '2' : '1';
  const mySlots = useMemo(() => user ? getUserSlots(user.id) : [], [getUserSlots, user]);
  const otherSlots = useMemo(() => user ? getUserSlots(otherUserId) : [], [getUserSlots, otherUserId, user]);

  if (!user) return null;

  return (
    <>
      <DesktopSidebar 
        user={user}
        unreadCount={unreadCount}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
      />
      
      <PageTransition className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 pb-mobile-nav overflow-auto lg:ml-64">
        <div className="h-full overflow-auto lg:max-w-6xl lg:mx-auto">
          <SyncIndicator isSyncing={isSyncing} />
          
          {/* Mobile Header */}
          <div className="lg:hidden sticky top-0 bg-white dark:bg-gray-800 shadow-md z-10">
            <div className="flex items-center justify-between p-3">
              <button
                onClick={() => router.push('/week')}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Vista mensual"
              >
                📅 Mes
              </button>
              <h1 className="text-lg font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
                Calendario
              </h1>
              <div className="flex gap-2 items-center">
                {/* Botón de llamada */}
                <button
                  onClick={() => {
                    const partnerId = user?.id === '1' ? '2' : '1';
                    startCall(partnerId, partnerUsername);
                  }}
                  disabled={isInCall || isConnecting}
                  className="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={`Llamar a ${partnerUsername}`}
                >
                  <Phone className="h-4 w-4" />
                </button>
                
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Cambiar tema"
                >
                  {darkMode ? '☀️' : '🌙'}
                </button>
                
                {/* Menú hamburguesa de perfil */}
                <div className="relative profile-menu-container">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Perfil y configuración"
                  >
                    ☰
                  </button>
                  
                  {showProfileMenu && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden">
                      {/* Perfil */}
                      <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-500">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-2xl">
                            {user?.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-white">{user?.username}</div>
                            <div className="text-xs text-white/80">Usuario #{user?.id}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Última conexión */}
                      <div className="px-4 py-3 border-b dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Última conexión</div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {new Date().toLocaleString('es-AR', { 
                            timeZone: 'America/Argentina/Cordoba',
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      
                      {/* Botón salir */}
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                      >
                        <span>🚪</span>
                        <span className="font-medium">Cerrar sesión</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-2 border-t dark:border-gray-700">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => changeDate(-1)}
                disabled={isBeforeToday()}
                className="dark:border-gray-600 dark:text-gray-200 h-8"
              >
                ← 
              </Button>
              <span className="font-medium text-sm capitalize text-center dark:text-gray-200">{formatDate(selectedDate)}</span>
              <Button variant="outline" size="sm" onClick={() => changeDate(1)} className="dark:border-gray-600 dark:text-gray-200 h-8">
                →
              </Button>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-sm z-10 border-b border-border">
            <div className="px-6 xl:px-8 py-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold dark:text-gray-100">
                  Calendario de Disponibilidad
                </h2>
                <Button 
                  size="sm" 
                  onClick={() => router.push('/week')}
                  variant="outline"
                >
                  📅 Vista Mensual
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => changeDate(-1)}
                  disabled={isBeforeToday()}
                  className="dark:border-gray-600 dark:text-gray-200"
                >
                  ← Día Anterior
                </Button>
                <span className="font-medium text-lg capitalize text-center dark:text-gray-200">{formatDate(selectedDate)}</span>
                <Button 
                  variant="outline" 
                  onClick={() => changeDate(1)} 
                  className="dark:border-gray-600 dark:text-gray-200"
                >
                  Día Siguiente →
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 lg:px-6 xl:px-8 lg:py-6 space-y-4 lg:space-y-6">
            {/* Desktop: Two column layout */}
            <div className="lg:grid lg:grid-cols-2 lg:gap-8 space-y-4 lg:space-y-0">
              {/* Tu disponibilidad */}
              <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg dark:text-gray-100">Tu disponibilidad</CardTitle>
              <Button 
                size="sm" 
                onClick={() => setShowForm(true)}
                variant="default"
              >
                + Agregar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {mySlots.length === 0 ? (
              <EmptyState type="calendar" />
            ) : (
              <div className="space-y-2">
                {mySlots.map((slot) => {
                  const type = slot.eventType || 'unavailable';
                  
                  // Definir clases completas para cada tipo
                  let bgClass = 'bg-red-50 dark:bg-red-950';
                  let borderClass = 'border-red-200 dark:border-red-800';
                  let textClass = 'text-red-900 dark:text-red-200';
                  let emoji = '🔴';
                  let label = 'Ocupado';
                  
                  if (type === 'plan') {
                    bgClass = 'bg-green-50 dark:bg-green-950';
                    borderClass = 'border-green-200 dark:border-green-800';
                    textClass = 'text-green-900 dark:text-green-200';
                    emoji = '🟢';
                    label = 'Plan';
                  } else if (type === 'meeting') {
                    bgClass = 'bg-blue-50 dark:bg-blue-950';
                    borderClass = 'border-blue-200 dark:border-blue-800';
                    textClass = 'text-blue-900 dark:text-blue-200';
                    emoji = '🔵';
                    label = 'Reunión';
                  } else if (type === 'tentative') {
                    bgClass = 'bg-yellow-50 dark:bg-yellow-950';
                    borderClass = 'border-yellow-200 dark:border-yellow-800';
                    textClass = 'text-yellow-900 dark:text-yellow-200';
                    emoji = '🟡';
                    label = 'Charlemos';
                  } else if (type === 'other') {
                    bgClass = 'bg-purple-50 dark:bg-purple-950';
                    borderClass = 'border-purple-200 dark:border-purple-800';
                    textClass = 'text-purple-900 dark:text-purple-200';
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
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{label}</div>
                        {slot.note && (
                          <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{slot.note}</div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditSlot(slot)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950"
                        >
                          ✏️
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteSlotId(slot.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
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
        <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg dark:text-gray-100">Eventos del otro usuario</CardTitle>
          </CardHeader>
          <CardContent>
            {otherSlots.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-green-700 dark:text-green-400 font-medium">Sin eventos</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No tiene eventos para este día</p>
              </div>
            ) : (
              <div className="space-y-2">
                {otherSlots.map((slot) => {
                  const type = slot.eventType || 'unavailable';
                  
                  // Definir clases completas para cada tipo
                  let bgClass = 'bg-red-50 dark:bg-red-950';
                  let borderClass = 'border-red-200 dark:border-red-800';
                  let textClass = 'text-red-900 dark:text-red-200';
                  let emoji = '🔴';
                  let label = 'Ocupado';
                  
                  if (type === 'plan') {
                    bgClass = 'bg-green-50 dark:bg-green-950';
                    borderClass = 'border-green-200 dark:border-green-800';
                    textClass = 'text-green-900 dark:text-green-200';
                    emoji = '🟢';
                    label = 'Plan';
                  } else if (type === 'meeting') {
                    bgClass = 'bg-blue-50 dark:bg-blue-950';
                    borderClass = 'border-blue-200 dark:border-blue-800';
                    textClass = 'text-blue-900 dark:text-blue-200';
                    emoji = '🔵';
                    label = 'Reunión';
                  } else if (type === 'tentative') {
                    bgClass = 'bg-yellow-50 dark:bg-yellow-950';
                    borderClass = 'border-yellow-200 dark:border-yellow-800';
                    textClass = 'text-yellow-900 dark:text-yellow-200';
                    emoji = '🟡';
                    label = 'Charlemos';
                  } else if (type === 'other') {
                    bgClass = 'bg-purple-50 dark:bg-purple-950';
                    borderClass = 'border-purple-200 dark:border-purple-800';
                    textClass = 'text-purple-900 dark:text-purple-200';
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
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{label}</div>
                    {slot.note && (
                      <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{slot.note}</div>
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
                      <div className="text-center mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg border-2 border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-700 dark:text-green-300">El resto del día está disponible ✅</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="text-center mt-4 p-3 bg-red-50 dark:bg-red-950 rounded-lg border-2 border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-700 dark:text-red-300">❌ No disponible todo el día</p>
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
            </div>
        </div>

      {/* Bottom Sheet para agregar/editar eventos */}
      <BottomSheet
        isOpen={showForm}
        onClose={cancelEdit}
        title={editingSlotId ? 'Editar Evento' : 'Nuevo Evento'}
      >
        <div className="space-y-4">
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
              <p className="text-xs text-muted-foreground mt-1">
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
              <p className="text-xs text-muted-foreground mt-1">
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
              Mañana
            </Button>
            <Button
              onClick={() => { setStartHour('13'); setEndHour('18'); }}
              variant="outline"
              size="sm"
              type="button"
              className="text-xs"
            >
              Tarde
            </Button>
            <Button
              onClick={() => { setStartHour('18'); setEndHour('22'); }}
              variant="outline"
              size="sm"
              type="button"
              className="text-xs"
            >
              Noche
            </Button>
          </div>

          <Input
            placeholder="Nota opcional..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <LoadingButton 
            onClick={saveSlot} 
            className="w-full" 
            size="lg"
            isLoading={isSaving}
            loadingText="Guardando..."
          >
            {editingSlotId ? '✏️ Actualizar Evento' : 
             (eventType === 'unavailable' ? '🔴 Guardar Ocupado' : 
              eventType === 'plan' ? '🟢 Guardar Plan' : 
              eventType === 'meeting' ? '🔵 Guardar Reunión' : 
              eventType === 'tentative' ? '🟡 Guardar Charlemos' : 'Guardar Evento')}
          </LoadingButton>
        </div>
      </BottomSheet>

      {/* Confirm Dialog para eliminar */}
      <ConfirmDialog
        isOpen={!!deleteSlotId}
        onClose={() => setDeleteSlotId(null)}
        onConfirm={() => deleteSlotId && removeSlot(deleteSlotId)}
        title="Eliminar Evento"
        message="¿Estás seguro de que quieres eliminar este evento? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
      </div>
      </PageTransition>
    </>
  );
}
