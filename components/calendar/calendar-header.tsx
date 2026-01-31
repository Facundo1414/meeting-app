'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { User } from '@/lib/auth-supabase';
import { CalendarDays } from 'lucide-react';

interface CalendarHeaderProps {
  user: User;
  darkMode: boolean;
  unreadCount: number;
  showProfileMenu: boolean;
  selectedDate: Date;
  onToggleDarkMode: () => void;
  onToggleProfileMenu: () => void;
  onLogout: () => void;
  onChangeDate: (days: number) => void;
  onMessagesClick: () => void;
  onWeekClick: () => void;
  formatDate: (date: Date) => string;
  isBeforeToday: () => boolean;
}

const TIMEZONE = 'America/Argentina/Cordoba';

export function CalendarHeader({
  user,
  darkMode,
  unreadCount,
  showProfileMenu,
  selectedDate,
  onToggleDarkMode,
  onToggleProfileMenu,
  onLogout,
  onChangeDate,
  onMessagesClick,
  onWeekClick,
  formatDate,
  isBeforeToday,
}: CalendarHeaderProps) {
  const router = useRouter();
  
  return (
    <div className="sticky top-0 bg-white dark:bg-gray-800 shadow-md z-10">
      <div className="flex items-center justify-between p-2 gap-2">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={onWeekClick}
            className="px-3 py-1.5 text-sm rounded-md transition-colors hover:bg-white dark:hover:bg-gray-600"
            title="Vista mensual"
          >
            📅
          </button>
          <button
            onClick={() => router.push('/week-view')}
            className="px-3 py-1.5 text-sm rounded-md transition-colors hover:bg-white dark:hover:bg-gray-600 flex items-center gap-1"
            title="Vista semanal"
          >
            <CalendarDays className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleDarkMode}
            className="px-3 py-1.5 text-sm rounded-md transition-colors hover:bg-white dark:hover:bg-gray-600"
            title="Cambiar tema"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
        <h1 className="text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
          Calendar
        </h1>
        <div className="flex gap-1 items-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onMessagesClick}
            className="relative bg-blue-500 text-white hover:bg-blue-600 border-blue-600 px-2 text-xs h-8"
          >
            💬
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold text-[10px] animate-bounce"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
          
          <div className="relative profile-menu-container">
            <button
              onClick={onToggleProfileMenu}
              className="px-2 py-1 text-sm rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 h-8"
              title="Perfil y configuración"
            >
              ☰
            </button>
            
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-500">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-2xl">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-white">{user.username}</div>
                      <div className="text-xs text-white/80">Usuario #{user.id}</div>
                    </div>
                  </div>
                </div>
                
                <div className="px-4 py-3 border-b dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Última conexión</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {new Date().toLocaleString('es-AR', { 
                      timeZone: TIMEZONE,
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                
                <button
                  onClick={onLogout}
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
          onClick={() => onChangeDate(-1)}
          disabled={isBeforeToday()}
          className="dark:border-gray-600 dark:text-gray-200 h-8"
        >
          ← 
        </Button>
        <span className="font-medium text-sm capitalize text-center dark:text-gray-200">{formatDate(selectedDate)}</span>
        <Button variant="outline" size="sm" onClick={() => onChangeDate(1)} className="dark:border-gray-600 dark:text-gray-200 h-8">
          →
        </Button>
      </div>
    </div>
  );
}
