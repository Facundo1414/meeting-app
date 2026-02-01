'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useVoiceChatGlobal } from '@/components/voice-chat-provider';
import { Mic, MicOff, Phone, PhoneOff, PhoneIncoming, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlobalVoiceChatUIProps {
  partnerId: string;
  partnerUsername: string;
}

export function GlobalVoiceChatUI({ partnerId, partnerUsername }: GlobalVoiceChatUIProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    isInCall,
    isConnecting,
    isMuted,
    error,
    remoteUsername,
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    hangUp,
    toggleMute,
  } = useVoiceChatGlobal();

  // Modal de llamada entrante
  if (incomingCall) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <Card className="w-[90%] max-w-sm p-6 bg-white dark:bg-gray-800 shadow-2xl animate-pulse">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center animate-bounce">
              <PhoneIncoming className="w-10 h-10 text-white" />
            </div>
            
            <div className="text-center">
              <h2 className="text-xl font-bold">Llamada entrante</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {incomingCall.fromUsername} te está llamando
              </p>
            </div>

            <div className="flex gap-4 mt-2">
              <Button
                size="lg"
                variant="destructive"
                onClick={rejectCall}
                className="rounded-full h-14 w-14"
              >
                <X className="h-6 w-6" />
              </Button>
              
              <Button
                size="lg"
                onClick={acceptCall}
                className="rounded-full h-14 w-14 bg-green-600 hover:bg-green-700"
              >
                <Phone className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50">
      {/* Panel expandido */}
      {isExpanded && (
        <div className="mb-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[220px]">
          <div className="text-sm font-medium mb-3 text-center flex items-center justify-center gap-2">
            <Phone className="h-4 w-4" />
            Chat de Voz
          </div>
          
          {error && (
            <div className="text-xs text-red-500 mb-3 text-center bg-red-50 dark:bg-red-950 p-2 rounded">
              {error}
            </div>
          )}

          {/* Estado: No en llamada */}
          {!isInCall && !isConnecting && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 text-center">
                Llamar a {partnerUsername}
              </p>
              <Button
                onClick={() => startCall(partnerId, partnerUsername)}
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
              >
                <Phone className="h-4 w-4" />
                Iniciar llamada
              </Button>
            </div>
          )}

          {/* Estado: Conectando */}
          {isConnecting && (
            <div className="flex flex-col items-center gap-3 py-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Llamando a {remoteUsername}...
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={hangUp}
                className="gap-1"
              >
                <PhoneOff className="h-4 w-4" />
                Cancelar
              </Button>
            </div>
          )}

          {/* Estado: En llamada */}
          {isInCall && (
            <div className="space-y-3">
              {/* Indicador de conexión */}
              <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 p-2 rounded-lg">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                En llamada con {remoteUsername}
              </div>

              {/* Controles */}
              <div className="flex items-center justify-center gap-3">
                <Button
                  size="lg"
                  variant={isMuted ? "destructive" : "outline"}
                  onClick={toggleMute}
                  className="rounded-full h-12 w-12"
                >
                  {isMuted ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>

                <Button
                  size="lg"
                  variant="destructive"
                  onClick={hangUp}
                  className="rounded-full h-12 w-12"
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </div>

              {isMuted && (
                <p className="text-xs text-center text-orange-600 dark:text-orange-400">
                  🔇 Micrófono silenciado
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Botón flotante */}
      <Button
        size="icon"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "h-14 w-14 rounded-full shadow-lg transition-all",
          isInCall 
            ? "bg-green-600 hover:bg-green-700 animate-pulse" 
            : isConnecting
              ? "bg-yellow-600 hover:bg-yellow-700"
              : "bg-blue-600 hover:bg-blue-700",
          isExpanded && "ring-2 ring-offset-2 ring-blue-400"
        )}
      >
        {isInCall ? (
          isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />
        ) : isConnecting ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Phone className="h-6 w-6" />
        )}
      </Button>

      {/* Badge indicador de llamada activa */}
      {isInCall && !isExpanded && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
      )}
    </div>
  );
}
