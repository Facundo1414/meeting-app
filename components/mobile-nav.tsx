'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Image, MessageCircle, Gamepad2, Dices } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, memo } from 'react';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
}

interface MobileNavProps {
  unreadCount?: number;
}

export const MobileNav = memo(function MobileNav({ unreadCount = 0 }: MobileNavProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems: NavItem[] = [
    { href: '/calendar', icon: Calendar, label: 'Inicio' },
    { href: '/gallery', icon: Image, label: 'Galería' },
    { href: '/messages', icon: MessageCircle, label: 'Chat', badge: unreadCount },
    { href: '/game', icon: Gamepad2, label: 'Juego' },
    { href: '/roulette', icon: Dices, label: 'Ruleta' },
  ];

  // No renderizar hasta que esté montado (evita hydration mismatch)
  if (!mounted) return null;

  // No mostrar en páginas de login/landing/messages (messages tiene su propio input bar)
  if (pathname === '/' || pathname === '/landing' || pathname === '/messages') return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full px-1 py-2 relative",
                isActive 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-gray-500 dark:text-gray-400 active:scale-95"
              )}
            >
              {/* Indicador activo */}
              {isActive && (
                <span className="absolute top-1 w-8 h-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
              
              <div className="relative">
                <Icon className={cn(
                  "h-6 w-6",
                  isActive && "scale-110"
                )} />
                
                {/* Badge de notificaciones */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              
              <span className={cn(
                "text-[10px] mt-1 font-medium",
                isActive ? "opacity-100" : "opacity-70"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});
