'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Calendar, Image, MessageCircle, LogOut, Moon, Sun, Gamepad2 } from 'lucide-react';
import { User } from '@/lib/auth-supabase';

interface DesktopSidebarProps {
  user: User | null;
  unreadCount?: number;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onLogout?: () => void;
}

export function DesktopSidebar({ 
  user, 
  unreadCount = 0, 
  darkMode = false,
  onToggleDarkMode,
  onLogout 
}: DesktopSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: '/calendar', icon: Calendar, label: 'Calendario' },
    { href: '/gallery', icon: Image, label: 'Galería' },
    { href: '/messages', icon: MessageCircle, label: 'Mensajes', badge: unreadCount },
    { href: '/game', icon: Gamepad2, label: 'Juego' },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:bg-card lg:border-r lg:border-border lg:fixed lg:inset-y-0 lg:left-0 lg:z-50">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Calendar
        </h1>
        {user && (
          <p className="text-sm text-muted-foreground mt-2">
            {user.username}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Button
              key={item.href}
              variant={isActive ? 'secondary' : 'ghost'}
              className={`w-full justify-start relative ${
                isActive ? 'bg-secondary text-secondary-foreground' : ''
              }`}
              onClick={() => router.push(item.href)}
            >
              <Icon className="mr-3 h-5 w-5" />
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border space-y-2">
        {onToggleDarkMode && (
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={onToggleDarkMode}
          >
            {darkMode ? <Sun className="mr-3 h-5 w-5" /> : <Moon className="mr-3 h-5 w-5" />}
            <span>{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </Button>
        )}
        {onLogout && (
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={onLogout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            <span>Cerrar Sesión</span>
          </Button>
        )}
      </div>
    </aside>
  );
}
