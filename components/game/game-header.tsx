'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, History, Wifi, WifiOff, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

interface GameHeaderProps {
  onBack: () => void;
  onHistory: () => void;
  currentUserName: string;
  opponentUsername: string;
  onOpponentStatusChange?: (isOnline: boolean) => void;
  onForfeit?: () => void;
  showForfeit?: boolean;
}

export function GameHeader({ onBack, onHistory, currentUserName, opponentUsername, onOpponentStatusChange, onForfeit, showForfeit = false }: GameHeaderProps) {
  const [isOpponentOnline, setIsOpponentOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  useEffect(() => {
    // Check opponent's online status
    const checkOnlineStatus = async () => {
      try {
        // Import dynamically to avoid SSR issues
        const { supabase } = await import('@/lib/supabase');
        
        const { data, error } = await supabase
          .from('users_meeting_app')
          .select('last_seen')
          .eq('username', opponentUsername);
        
        if (error) {
          console.error('Error fetching last_seen:', error);
          return;
        }
        
        // Handle array response - check if we got any results
        if (data && data.length > 0 && data[0].last_seen) {
          const lastSeenDate = new Date(data[0].last_seen);
          setLastSeen(lastSeenDate);
          
          // Consider online if seen in last 2 minutes
          const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
          const isOnline = lastSeenDate > twoMinutesAgo;
          setIsOpponentOnline(isOnline);
          if (onOpponentStatusChange) onOpponentStatusChange(isOnline);
        } else {
          // No user found or no last_seen data
          setLastSeen(null);
          setIsOpponentOnline(false);
          if (onOpponentStatusChange) onOpponentStatusChange(false);
        }
      } catch (error) {
        console.error('Error checking online status:', error);
      }
    };

    checkOnlineStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkOnlineStatus, 30000);
    
    return () => clearInterval(interval);
  }, [opponentUsername]);

  const getOpponentName = () => {
    if (!opponentUsername) return 'Esperando...';
    return opponentUsername.charAt(0).toUpperCase() + opponentUsername.slice(1);
  };

  const getTimeSince = () => {
    if (!lastSeen) return 'Offline';
    
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Online';
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b shadow-sm">
      <div className="max-w-2xl mx-auto p-4 flex items-center justify-between">
        {/* Left: Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Volver</span>
        </Button>

        {/* Center: Title + Online Status */}
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Quick Draw
          </h1>
          {opponentUsername ? (
            <div className="flex items-center gap-2 mt-1">
              <div className={`flex items-center gap-1 text-xs ${
                isOpponentOnline ? 'text-green-600' : 'text-gray-400'
              }`}>
                {isOpponentOnline ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <Wifi className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    <WifiOff className="h-3 w-3" />
                  </>
                )}
                <span className="font-medium">{getOpponentName()}</span>
              </div>
              <span className="text-xs text-gray-400">
                {getTimeSince()}
              </span>
            </div>
          ) : (
            <div className="text-xs text-gray-400 mt-1">
              Esperando jugador...
            </div>
          )}
        </div>

        {/* Right: History and Forfeit buttons */}
        <div className="flex gap-2">
          {showForfeit && onForfeit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onForfeit}
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Rendirse</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onHistory}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Historial</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
