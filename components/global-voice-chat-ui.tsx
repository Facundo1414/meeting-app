'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useVoiceChatGlobal } from '@/components/voice-chat-provider';
import { Mic, MicOff, Phone, PhoneOff, PhoneIncoming, X, Loader2 } from 'lucide-react';

interface GlobalVoiceChatUIProps {
  partnerId: string;
  partnerUsername: string;
}

export function GlobalVoiceChatUI({ partnerId, partnerUsername }: GlobalVoiceChatUIProps) {
  const {
    isInCall,
    isConnecting,
    isMuted,
    error,
    remoteUsername,
    incomingCall,
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
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-green-500 to-emerald-500 flex items-center justify-center animate-bounce">
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

  // Modal de conectando
  if (isConnecting) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <Card className="w-[90%] max-w-sm p-6 bg-white dark:bg-gray-800 shadow-2xl">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
            <div className="text-center">
              <h2 className="text-xl font-bold">Llamando...</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Conectando con {remoteUsername || partnerUsername}
              </p>
            </div>
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            <Button
              variant="destructive"
              onClick={hangUp}
              className="gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Barra de llamada activa (fija arriba)
  if (isInCall) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-green-600 text-white py-2 px-4 lg:ml-64">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium">
              En llamada con {remoteUsername || partnerUsername}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isMuted ? "destructive" : "ghost"}
              onClick={toggleMute}
              className="h-8 w-8 p-0 rounded-full bg-white/20 hover:bg-white/30"
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
              className="h-8 px-3 gap-1"
            >
              <PhoneOff className="h-4 w-4" />
              <span className="hidden sm:inline">Colgar</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No mostrar nada si no hay llamada activa
  return null;
}
