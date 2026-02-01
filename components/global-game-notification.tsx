'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Gamepad2, X, Check, Clock } from 'lucide-react';
import { 
  subscribeToInvitations, 
  updateInvitationStatus,
  GameInvitation 
} from '@/lib/game-supabase';
import { toast } from 'sonner';

interface GlobalGameNotificationProps {
  userId: string | null;
}

export function GlobalGameNotification({ userId }: GlobalGameNotificationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [invitation, setInvitation] = useState<GameInvitation | null>(null);
  const [senderName, setSenderName] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isVisible, setIsVisible] = useState(false);

  // No mostrar si ya estamos en la página del juego
  const isOnGamePage = pathname === '/game';

  // Cargar nombre del remitente
  const loadSenderName = useCallback(async (senderId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase
        .from('users_meeting_app')
        .select('username')
        .eq('id', senderId)
        .single();
      
      if (data) {
        setSenderName(data.username);
      }
    } catch (error) {
      console.error('Error loading sender name:', error);
    }
  }, []);

  // Suscribirse a invitaciones
  useEffect(() => {
    if (!userId) return;

    const subscription = subscribeToInvitations(userId, async (inv) => {
      // Solo mostrar si es una invitación pendiente dirigida a mí
      if (inv.toUserId === userId && inv.status === 'pending') {
        setInvitation(inv);
        await loadSenderName(inv.fromUserId!);
        
        // Calcular tiempo restante
        const expiresAt = new Date(inv.expiresAt || Date.now() + 120000).getTime();
        setTimeRemaining(Math.max(0, expiresAt - Date.now()));
        
        setIsVisible(true);

        // Reproducir sonido de notificación
        try {
          const audio = new Audio('/notification.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {}); // Ignorar errores si no hay archivo
        } catch {}

        // Mostrar notificación del sistema si está permitido
        if (Notification.permission === 'granted') {
          new Notification('🎮 Invitación de Juego', {
            body: `${senderName || 'Tu pareja'} te invitó a jugar Quick Draw!`,
            icon: '/icon-192.png',
          });
        }
      }

      // Ocultar si la invitación fue cancelada o expiró
      if (inv.status === 'canceled' || inv.status === 'rejected' || inv.status === 'expired') {
        if (invitation?.id === inv.id) {
          setIsVisible(false);
          setInvitation(null);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, loadSenderName, invitation?.id, senderName]);

  // Countdown del tiempo
  useEffect(() => {
    if (!isVisible || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          setIsVisible(false);
          setInvitation(null);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, timeRemaining]);

  // Aceptar invitación
  const handleAccept = async () => {
    if (!invitation) return;

    const success = await updateInvitationStatus(invitation.id, 'accepted');
    if (success) {
      setIsVisible(false);
      setInvitation(null);
      
      // Navegar a la página del juego
      router.push('/game');
      
      toast.success('¡Invitación aceptada! Iniciando juego...');
    } else {
      toast.error('Error al aceptar la invitación');
    }
  };

  // Rechazar invitación
  const handleReject = async () => {
    if (!invitation) return;

    await updateInvitationStatus(invitation.id, 'rejected');
    setIsVisible(false);
    setInvitation(null);
    
    toast.info('Invitación rechazada');
  };

  // No renderizar si no hay invitación o estamos en la página del juego
  if (!isVisible || !invitation || isOnGamePage) return null;

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-[90%] max-w-sm p-6 bg-white dark:bg-gray-800 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Gamepad2 className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold mb-2">
            ¡Invitación de Juego!
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              {senderName || 'Tu pareja'}
            </span>
            {' '}te invitó a jugar Quick Draw
          </p>
          
          {/* Detalles del juego */}
          <div className="mt-3 text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>🎯 {invitation.maxRounds || 10} rondas</p>
            <p>⏱️ {invitation.roundTime || 60}s por turno</p>
            <p>📊 Dificultad: {invitation.difficulty || 'medium'}</p>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 mb-4 text-sm text-orange-600 dark:text-orange-400">
          <Clock className="w-4 h-4" />
          <span>Expira en {minutes}:{seconds.toString().padStart(2, '0')}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleReject}
            className="flex-1 gap-2"
          >
            <X className="w-4 h-4" />
            Rechazar
          </Button>
          <Button
            onClick={handleAccept}
            className="flex-1 gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Check className="w-4 h-4" />
            Aceptar
          </Button>
        </div>
      </Card>
    </div>
  );
}
