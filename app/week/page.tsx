'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { User } from '@/lib/auth-supabase';
import { TimeSlot, getTimeSlots } from '@/lib/storage-supabase';
import { supabase } from '@/lib/supabase';

const TIMEZONE = 'America/Argentina/Cordoba';
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function MonthViewPage() {
  const [user, setUser] = useState<User | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(userData));
    
    // Cargar dark mode
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    
    loadSlots();

    // Supabase Realtime subscription
    const channel = supabase
      .channel('time_slots_changes_month')
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

  const changeMonth = (months: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + months);
    setCurrentMonth(newDate);
  };

  const getMonthDays = (): Date[] => {
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
  };

  const getDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDaySlots = (date: Date): { my: TimeSlot[], other: TimeSlot[] } => {
    const dateStr = getDateString(date);
    const otherUserId = user?.id === '1' ? '2' : '1';
    return {
      my: slots.filter(s => s.userId === user?.id && s.date === dateStr),
      other: slots.filter(s => s.userId === otherUserId && s.date === dateStr),
    };
  };

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

  const monthDays = getMonthDays();
  const otherUserId = user.id === '1' ? '2' : '1';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 pb-6">
      <div className="sticky top-0 bg-white dark:bg-gray-800 shadow-md z-10">
        <div className="flex items-center justify-between p-4">
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
          <h1 className="text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
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

      <div className="p-4">
        {/* Header de días */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Grid de días */}
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((day, index) => {
            const { my: mySlots, other: otherSlots } = getDaySlots(day);
            const today = isToday(day);
            const currentMo = isCurrentMonth(day);
            const past = isPast(day);

            return (
              <div
                key={index}
                onClick={() => {
                  if (!past) {
                    // Navegar al día específico en la vista de día
                    localStorage.setItem('selectedDate', day.toISOString());
                    router.push('/calendar');
                  }
                }}
                className={`
                  min-h-[80px] p-2 rounded-lg border cursor-pointer transition-all
                  ${today ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/30' : ''}
                  ${!currentMo ? 'opacity-40' : ''}
                  ${past ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                  ${currentMo && !past && !today ? 'bg-white dark:bg-gray-800' : ''}
                  border-gray-200 dark:border-gray-700
                `}
              >
                <div className={`text-xs font-semibold mb-1 ${today ? 'text-blue-600 dark:text-blue-400' : past ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {day.getDate()}
                </div>
                
                {/* Indicadores de eventos */}
                <div className="space-y-0.5">
                  {mySlots.length > 0 && (
                    <div className="flex gap-0.5">
                      {mySlots.slice(0, 2).map((slot) => {
                        const type = slot.eventType || 'unavailable';
                        let color = 'bg-red-500';
                        if (type === 'plan') color = 'bg-green-500';
                        else if (type === 'meeting') color = 'bg-blue-500';
                        else if (type === 'tentative') color = 'bg-yellow-500';
                        return <div key={slot.id} className={`h-1.5 flex-1 rounded ${color}`} />;
                      })}
                    </div>
                  )}
                  {otherSlots.length > 0 && (
                    <div className="flex gap-0.5">
                      {otherSlots.slice(0, 2).map((slot) => {
                        const type = slot.eventType || 'unavailable';
                        let color = 'bg-red-300';
                        if (type === 'plan') color = 'bg-green-300';
                        else if (type === 'meeting') color = 'bg-blue-300';
                        else if (type === 'tentative') color = 'bg-yellow-300';
                        return <div key={slot.id} className={`h-1.5 flex-1 rounded ${color}`} />;
                      })}
                    </div>
                  )}
                  {(mySlots.length > 2 || otherSlots.length > 2) && (
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">+{(mySlots.length + otherSlots.length) - 4}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
