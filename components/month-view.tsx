'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { User } from '@/lib/auth-supabase';
import { TimeSlot, getTimeSlots, getLastSeen, updateLastSeen } from '@/lib/storage-supabase';
import { supabase } from '@/lib/supabase';
import { CalendarMonthSkeleton } from '@/components/calendar-skeleton';
import { useSwipeNavigation } from '@/hooks/use-swipe-navigation';
import { PageTransition } from '@/components/page-transition';
import { SyncIndicator } from '@/components/sync-indicator';
import { DesktopSidebar } from '@/components/desktop-sidebar';

const TIMEZONE = 'America/Argentina/Cordoba';
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function MonthView() {
  const [user, setUser] = useState<User | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(null);
  const router = useRouter();

  // Swipe navigation
  useSwipeNavigation({
    onSwipeLeft: () => changeMonth(1),
    onSwipeRight: () => changeMonth(-1),
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    // Actualizar last_seen al entrar a la app
    updateLastSeen(parsedUser.id, parsedUser.username);
    
    // Cargar dark mode
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    
    loadSlots();

    // Supabase Realtime subscription optimizada
    const channel = supabase
      .channel('time_slots_changes_month')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_slots_meeting_app' },
        (payload) => {
          // Solo recargar cuando hay cambios reales
          if (payload.eventType === 'DELETE' || payload.new || payload.old) {
            loadSlots();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

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

  // Cargar última conexión del otro usuario cuando se abre el menú
  useEffect(() => {
    if (showProfileMenu && user) {
      const otherUserId = user.id === '1' ? '2' : '1';
      getLastSeen(otherUserId).then(lastSeen => {
        if (lastSeen) {
          setOtherUserLastSeen(lastSeen);
        }
      });
    }
  }, [showProfileMenu, user]);

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

  const changeMonth = (months: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + months);
    setCurrentMonth(newDate);
  };

  // Memoize expensive month calculation
  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Días del mes actual
    const days: Date[] = [];
    
    // Agregar días vacíos al inicio para alinear con el día de la semana
    const startDay = firstDay.getDay();
    for (let i = 0; i < startDay; i++) {
      const prevDate = new Date(firstDay);
      prevDate.setDate(prevDate.getDate() - (startDay - i));
      days.push(prevDate);
    }
    
    // Agregar todos los días del mes
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    // Completar la última semana si es necesario
    while (days.length % 7 !== 0) {
      const nextDate = new Date(days[days.length - 1]);
      nextDate.setDate(nextDate.getDate() + 1);
      days.push(nextDate);
    }
    
    return days;
  }, [currentMonth]);

  const getDateString = useCallback((date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Memoizar los slots por fecha para evitar filtros repetidos
  const slotsByDate = useMemo(() => {
    const map = new Map<string, { my: TimeSlot[], other: TimeSlot[] }>();
    const otherUserId = user?.id === '1' ? '2' : '1';
    
    slots.forEach(slot => {
      const key = slot.date;
      if (!map.has(key)) {
        map.set(key, { my: [], other: [] });
      }
      const daySlots = map.get(key)!;
      if (slot.userId === user?.id) {
        daySlots.my.push(slot);
      } else if (slot.userId === otherUserId) {
        daySlots.other.push(slot);
      }
    });
    
    return map;
  }, [slots, user?.id]);

  const getDaySlots = useCallback((date: Date): { my: TimeSlot[], other: TimeSlot[] } => {
    const dateStr = getDateString(date);
    return slotsByDate.get(dateStr) || { my: [], other: [] };
  }, [slotsByDate, getDateString]);

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const isPast = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  if (!user) return null;

  const otherUserId = user.id === '1' ? '2' : '1';

  return (
    <>
      <DesktopSidebar 
        user={user}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
      />
      
      <PageTransition className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 pb-6 overflow-auto lg:ml-64">
        <div className="h-full overflow-auto lg:max-w-6xl lg:mx-auto lg:px-6 xl:px-8">
          <SyncIndicator isSyncing={isSyncing} />
          
          {/* Mobile Header */}
          <div className="lg:hidden sticky top-0 bg-white dark:bg-gray-800 shadow-md z-10">
            <div className="flex items-center justify-between p-4 h-16">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => router.push('/calendar')}
              className="px-3 py-1.5 text-sm rounded-md transition-colors hover:bg-white dark:hover:bg-gray-600 dark:text-gray-200"
              title="Vista día"
            >
              📅
            </button>
            <button
              onClick={toggleDarkMode}
              className="px-3 py-1.5 text-sm rounded-md transition-colors hover:bg-white dark:hover:bg-gray-600"
              title="Cambiar tema"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
          <h1 className="text-base font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {currentMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).toUpperCase()}
          </h1>
          
          {/* Menú hamburguesa de perfil */}
          <div className="relative profile-menu-container">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="px-3 py-1.5 text-sm rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200"
              title="Perfil y configuración"
            >
              ☰
            </button>
            
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden">
                {/* Perfil */}
                <div className="p-4 bg-linear-to-r from-blue-500 to-purple-500">
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
                
                {/* Última conexión del otro usuario */}
                <div className="px-4 py-3 border-b dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Última conexión de {user?.id === '1' ? 'Usuario #2' : 'Usuario #1'}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {otherUserLastSeen ? new Date(otherUserLastSeen).toLocaleString('es-AR', { 
                      timeZone: 'America/Argentina/Cordoba',
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Sin conexiones recientes'}
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
            <div className="flex items-center justify-between px-4 pb-3 border-t dark:border-gray-700 pt-3">
              <Button 
            variant="outline" 
            size="sm" 
            onClick={() => changeMonth(-1)}
            className="dark:border-gray-600 dark:text-gray-200"
          >
            ←
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentMonth(new Date())}
            className="text-xs dark:border-gray-600 dark:text-gray-200"
          >
            Hoy
          </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => changeMonth(1)}
                className="dark:border-gray-600 dark:text-gray-200"
              >
                →
              </Button>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block sticky top-0 bg-white dark:bg-gray-800 shadow-md z-10 border-b border-border">
            <div className="px-8 py-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold dark:text-gray-100">
                  {currentMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                </h2>
                <Button 
                  size="sm" 
                  onClick={() => router.push('/calendar')}
                  variant="outline"
                >
                  📅 Vista Día
                </Button>
              </div>
              <div className="flex items-center justify-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => changeMonth(-1)}
                  className="dark:border-gray-600 dark:text-gray-200"
                >
                  ← Mes Anterior
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentMonth(new Date())}
                  className="dark:border-gray-600 dark:text-gray-200 min-w-24"
                >
                  Hoy
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => changeMonth(1)}
                  className="dark:border-gray-600 dark:text-gray-200"
                >
                  Mes Siguiente →
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 lg:p-8 max-w-7xl lg:mx-auto">
            {/* Header de días */}
            <div className="grid grid-cols-7 gap-2 lg:gap-3 mb-2">
              {DAYS.map((day, idx) => (
                <div key={day} className="text-center text-xs lg:text-sm font-semibold text-gray-600 dark:text-gray-400 py-2 lg:py-3">
                  <span className="lg:hidden">{day}</span>
                  <span className="hidden lg:inline">{['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][idx]}</span>
                </div>
              ))}
            </div>

            {/* Grid de días */}
            <div className="grid grid-cols-7 gap-2 lg:gap-3">
          {monthDays.map((day) => {
            const { my: mySlots, other: otherSlots } = getDaySlots(day);
            const today = isToday(day);
            const currentMo = isCurrentMonth(day);
            const past = isPast(day);
            const dateKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;

            return (
              <div
                key={dateKey}
                onClick={() => {
                  if (!past) {
                    localStorage.setItem('selectedDate', day.toISOString());
                    router.push('/calendar');
                  }
                }}
                className={`
                  min-h-20 lg:min-h-32 p-2 lg:p-3 rounded-lg border cursor-pointer transition-all
                  ${today ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-lg' : ''}
                  ${!currentMo ? 'opacity-40' : ''}
                  ${past ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md active:bg-gray-100 dark:active:bg-gray-600'}
                  ${currentMo && !past && !today ? 'bg-white dark:bg-gray-800' : ''}
                  border-gray-200 dark:border-gray-700
                `}
              >
                <div className={`text-xs lg:text-base font-semibold mb-1 lg:mb-2 ${today ? 'text-blue-600 dark:text-blue-400' : past ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {day.getDate()}
                </div>
                
                {/* Indicadores de eventos */}
                <div className="space-y-1 lg:space-y-1.5">
                  {mySlots.length > 0 && (
                    <div className="space-y-0.5">
                      <div className="text-[10px] lg:text-xs text-gray-600 dark:text-gray-400 font-medium hidden lg:block">Tu disponibilidad:</div>
                      <div className="flex gap-0.5 lg:gap-1">
                        {mySlots.slice(0, 3).map((slot) => {
                          const type = slot.eventType || 'unavailable';
                          let color = 'bg-red-500';
                          let emoji = '🔴';
                          if (type === 'plan') { color = 'bg-green-500'; emoji = '🟢'; }
                          else if (type === 'meeting') { color = 'bg-blue-500'; emoji = '🔵'; }
                          else if (type === 'tentative') { color = 'bg-yellow-500'; emoji = '🟡'; }
                          return (
                            <div key={slot.id} className="flex-1">
                              <div className={`h-1.5 lg:h-2 rounded ${color}`} title={slot.note || type} />
                              <div className="lg:hidden">{emoji}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {otherSlots.length > 0 && (
                    <div className="space-y-0.5">
                      <div className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-500 hidden lg:block">Otro usuario:</div>
                      <div className="flex gap-0.5 lg:gap-1">
                        {otherSlots.slice(0, 3).map((slot) => {
                          const type = slot.eventType || 'unavailable';
                          let color = 'bg-red-300 dark:bg-red-400';
                          if (type === 'plan') color = 'bg-green-300 dark:bg-green-400';
                          else if (type === 'meeting') color = 'bg-blue-300 dark:bg-blue-400';
                          else if (type === 'tentative') color = 'bg-yellow-300 dark:bg-yellow-400';
                          return <div key={slot.id} className={`h-1.5 lg:h-2 flex-1 rounded ${color}`} title={slot.note || type} />;
                        })}
                      </div>
                    </div>
                  )}
                  {(mySlots.length > 3 || otherSlots.length > 3) && (
                    <div className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 mt-1">+{Math.max(mySlots.length + otherSlots.length - 6, 0)} más</div>
                  )}
                </div>
              </div>
            );
          })}
            </div>
          </div>
        </div>
      </PageTransition>
    </>
  );
}
