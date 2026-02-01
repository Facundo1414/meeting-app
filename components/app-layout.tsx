'use client';

import { useEffect, useState, useCallback, ReactNode, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/auth-supabase';
import { DesktopSidebar } from '@/components/desktop-sidebar';
import { getMessages } from '@/lib/storage-supabase';

interface AppLayoutProps {
  children: ReactNode;
  /** Si es true, no aplica padding ni max-width al contenido (para páginas que necesitan full-width como mensajes) */
  fullWidth?: boolean;
  /** Clases adicionales para el contenedor principal */
  className?: string;
  /** Estilos de fondo personalizados */
  bgClassName?: string;
}

export function AppLayout({ 
  children, 
  fullWidth = false,
  className = '',
  bgClassName = 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800'
}: AppLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(userData));
    
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, [router]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('user');
    router.push('/');
  }, [router]);

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

  // Escuchar cambios en mensajes no leídos
  useEffect(() => {
    const checkUnread = async () => {
      if (!user) return;
      const messages = await getMessages();
      const lastReadTimestamp = localStorage.getItem(`lastReadMessage_${user.id}`);
      
      if (!lastReadTimestamp) {
        const unread = messages.filter(m => m.senderId !== user.id).length;
        setUnreadCount(unread);
      } else {
        const unread = messages.filter(
          m => m.senderId !== user.id && new Date(m.timestamp) > new Date(lastReadTimestamp)
        ).length;
        setUnreadCount(unread);
      }
    };

    checkUnread();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(checkUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  return (
    <>
      {/* Sidebar para desktop */}
      <DesktopSidebar 
        user={user}
        unreadCount={unreadCount}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
      />
      
      {/* Contenedor principal */}
      <div className={`min-h-screen lg:ml-64 ${bgClassName}`}>
        {fullWidth ? (
          <div className={className}>
            {children}
          </div>
        ) : (
          <div className={`w-full max-w-7xl mx-auto px-4 lg:px-8 xl:px-12 ${className}`}>
            {children}
          </div>
        )}
      </div>
    </>
  );
}

// Hook para usar en componentes que necesitan acceso al estado del layout
export function useAppLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
  }, []);

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

  return { user, darkMode, toggleDarkMode };
}
