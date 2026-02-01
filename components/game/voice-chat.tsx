'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useVoiceChat } from '@/hooks/use-voice-chat';
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceChatProps {
  sessionId: string | null;
  currentUserId: string;
  remoteUserId: string;
  remoteUsername: string;
  enabled?: boolean;
}

export function VoiceChat({
  sessionId,
  currentUserId,
  remoteUserId,
  remoteUsername,
  enabled = true,
}: VoiceChatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    isConnected,
    isConnecting,
    isMuted,
    error,
    hasPermission,
    startCall,
    hangUp,
    toggleMute,
  } = useVoiceChat({
    sessionId,
    currentUserId,
    remoteUserId,
    enabled,
  });

  if (!sessionId || !enabled) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50">
      {/* Panel expandido */}
      {isExpanded && (
        <div className="mb-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[200px]">
          <div className="text-sm font-medium mb-2 text-center">
            🎙️ Chat de Voz
          </div>
          
          {error && (
            <div className="text-xs text-red-500 mb-2 text-center">
              {error}
            </div>
          )}

          {hasPermission === false && (
            <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-2 text-center">
              Permitir acceso al micrófono
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            {!isConnected && !isConnecting && (
              <Button
                size="sm"
                onClick={startCall}
                className="gap-1 bg-green-600 hover:bg-green-700"
              >
                <Phone className="h-4 w-4" />
                Llamar
              </Button>
            )}

            {isConnecting && (
              <Button size="sm" disabled className="gap-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                Conectando...
              </Button>
            )}

            {isConnected && (
              <>
                <Button
                  size="sm"
                  variant={isMuted ? "destructive" : "outline"}
                  onClick={toggleMute}
                  className="gap-1"
                >
                  {isMuted ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={hangUp}
                  className="gap-1"
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {isConnected && (
            <div className="mt-2 text-xs text-center text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Conectado con {remoteUsername}
            </div>
          )}
        </div>
      )}

      {/* Botón flotante */}
      <Button
        size="icon"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "h-12 w-12 rounded-full shadow-lg transition-all",
          isConnected 
            ? "bg-green-600 hover:bg-green-700" 
            : "bg-blue-600 hover:bg-blue-700",
          isExpanded && "ring-2 ring-offset-2 ring-blue-400"
        )}
      >
        {isConnected ? (
          isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />
        ) : isConnecting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Phone className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
