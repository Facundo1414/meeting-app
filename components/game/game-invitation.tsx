'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User } from '@/lib/auth-supabase';
import { Gamepad2, Send, X, Check, Clock } from 'lucide-react';
import {
  GameInvitation as GameInvitationType,
  sendGameInvitation,
  getGameInvitations,
  updateInvitationStatus,
  cancelGameInvitation,
  subscribeToInvitations,
} from '@/lib/game-supabase';

interface GameInvitationProps {
  currentUser: User;
  opponentId: string;
  opponentUsername: string;
  isOpponentOnline: boolean;
  onGameStart: (settings: {
    maxRounds: number;
    roundTime: number;
    pointsPerCorrect: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }) => void;
  onShowInvitationSetup: () => void;
}

export function GameInvitation({ 
  currentUser, 
  opponentId, 
  opponentUsername,
  isOpponentOnline,
  onGameStart,
  onShowInvitationSetup
}: GameInvitationProps) {
  const [sentInvitation, setSentInvitation] = useState<GameInvitationType | null>(null);
  const [receivedInvitation, setReceivedInvitation] = useState<GameInvitationType | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Load invitations
  useEffect(() => {
    const loadInvitations = async () => {
      const invitations = await getGameInvitations(currentUser.id);
      
      // Check for invitation sent by current user
      const sent = invitations.find(
        inv => inv.fromUserId === currentUser.id && inv.toUserId === opponentId
      );
      if (sent) {
        // Si la invitación fue aceptada, iniciar el juego inmediatamente
        if (sent.status === 'accepted') {
          setSentInvitation(null);
          onGameStart({
            maxRounds: sent.maxRounds || 3,
            roundTime: sent.roundTime || 60,
            pointsPerCorrect: sent.pointsPerCorrect || 100,
            difficulty: sent.difficulty,
          });
          return;
        }
        
        // Si está pendiente, mostrarla
        setSentInvitation(sent);
        const timeLeft = new Date(sent.expiresAt || Date.now()).getTime() - Date.now();
        setTimeRemaining(Math.max(0, timeLeft));
      }

      // Check for invitation received by current user (solo pendientes)
      const received = invitations.find(
        inv => inv.fromUserId === opponentId && inv.toUserId === currentUser.id && inv.status === 'pending'
      );
      if (received) {
        setReceivedInvitation(received);
      }
    };

    loadInvitations();

    // Subscribe to real-time updates
    const subscription = subscribeToInvitations(currentUser.id, (invitation) => {
      // Invitación recibida (yo soy to_user_id)
      if (invitation.toUserId === currentUser.id && invitation.fromUserId === opponentId) {
        // Si fue cancelada o rechazada, removerla
        if (invitation.status === 'canceled' || invitation.status === 'rejected') {
          setReceivedInvitation(null);
        } else if (invitation.status === 'pending') {
          setReceivedInvitation(invitation);
        }
      }
      
      // Invitación enviada que fue aceptada (yo soy from_user_id)
      if (invitation.fromUserId === currentUser.id && invitation.toUserId === opponentId) {
        if (invitation.status === 'accepted') {
          setSentInvitation(null);
          onGameStart({
            maxRounds: invitation.maxRounds || 10,
            roundTime: invitation.roundTime || 60,
            pointsPerCorrect: invitation.pointsPerCorrect || 10,
            difficulty: invitation.difficulty,
          });
        } else if (invitation.status === 'rejected' || invitation.status === 'canceled') {
          // Si fue rechazada o cancelada, limpiar
          setSentInvitation(null);
        } else {
          setSentInvitation(invitation);
        }
      }
    });

    // Poll every 2 seconds for updates
    const pollInterval = setInterval(loadInvitations, 2000);

    return () => {
      subscription.unsubscribe();
      clearInterval(pollInterval);
    };
  }, [currentUser.id, opponentId, onGameStart]);

  // Update time remaining countdown
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1000));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (sentInvitation && timeRemaining === 0) {
      setSentInvitation(null);
    }
  }, [timeRemaining, sentInvitation]);

  const sendInvitation = async () => {
    // Mostrar pantalla de configuración antes de enviar
    onShowInvitationSetup();
  };

  const acceptInvitation = async () => {
    if (!receivedInvitation) return;

    const success = await updateInvitationStatus(receivedInvitation.id, 'accepted');
    if (success) {
      setReceivedInvitation(null);
      // Validar que existan todos los campos necesarios
      const settings = {
        maxRounds: receivedInvitation.maxRounds || 3,
        roundTime: receivedInvitation.roundTime || 60,
        pointsPerCorrect: receivedInvitation.pointsPerCorrect || 100,
        difficulty: receivedInvitation.difficulty || 'medium' as const,
      };
      onGameStart(settings);
    }
  };

  const rejectInvitation = async () => {
    if (!receivedInvitation) return;

    await updateInvitationStatus(receivedInvitation.id, 'rejected');
    setReceivedInvitation(null);
  };

  const cancelSentInvitation = async () => {
    if (!sentInvitation) return;

    await cancelGameInvitation(sentInvitation.id);
    setSentInvitation(null);
    setTimeRemaining(0);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Show received invitation
  if (receivedInvitation) {
    return (
      <Card className="p-6 space-y-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 border-2 border-green-300 dark:border-green-700">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
            <Gamepad2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">¡Invitación de Juego!</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold">{opponentUsername}</span> te invita a jugar
            </p>
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg text-sm">
          <p>• {receivedInvitation.maxRounds} rondas</p>
          <p>• {receivedInvitation.roundTime} segundos por ronda</p>
          <p>• Dificultad: {receivedInvitation.difficulty === 'easy' ? 'Fácil' : receivedInvitation.difficulty === 'medium' ? 'Media' : 'Difícil'}</p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={acceptInvitation}
            className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
            size="lg"
          >
            <Check className="h-5 w-5" />
            Aceptar
          </Button>
          <Button
            onClick={rejectInvitation}
            variant="outline"
            className="flex-1 gap-2"
            size="lg"
          >
            <X className="h-5 w-5" />
            Rechazar
          </Button>
        </div>
      </Card>
    );
  }

  // Show sent invitation status
  if (sentInvitation) {
    return (
      <Card className="p-6 space-y-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-2 border-purple-300 dark:border-purple-700">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full animate-pulse">
            <Gamepad2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">Invitación Enviada</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Esperando respuesta de <span className="font-semibold">{opponentUsername}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            <span>Expira en: <span className="font-mono font-bold">{formatTime(timeRemaining)}</span></span>
          </div>
        </div>

        <Button
          onClick={cancelSentInvitation}
          variant="outline"
          className="w-full gap-2"
        >
          <X className="h-4 w-4" />
          Cancelar Invitación
        </Button>
      </Card>
    );
  }

  // Show send invitation button
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
          <Gamepad2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg">¿Listo para jugar?</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Invita a <span className="font-semibold">{opponentUsername}</span> a una partida
          </p>
        </div>
      </div>

      {!isOpponentOnline && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ El jugador está desconectado. La invitación estará disponible cuando se conecte.
          </p>
        </div>
      )}

      <Button
        onClick={sendInvitation}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2"
        size="lg"
      >
        <Send className="h-5 w-5" />
        Enviar Invitación
      </Button>
    </Card>
  );
}
