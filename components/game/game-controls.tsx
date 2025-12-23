'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Send, SkipForward, Play } from 'lucide-react';

interface GameControlsProps {
  isDrawer: boolean;
  wordToGuess?: string;
  onGuess?: (guess: string) => void;
  onSkip?: () => void;
  onNewGame?: () => void;
  onEndGame?: () => void;
  timeLimit?: number; // seconds
  isActive: boolean;
  canStartGame?: boolean;
}

export function GameControls({ 
  isDrawer, 
  wordToGuess,
  onGuess,
  onSkip,
  onNewGame,
  onEndGame,
  timeLimit = 60,
  isActive,
  canStartGame = false
}: GameControlsProps) {
  const [guess, setGuess] = useState('');
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(timeLimit);
      return;
    }

    setTimeLeft(timeLimit);
    
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (onSkip) onSkip();
          return timeLimit;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLimit, onSkip]);

  const handleSubmitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.trim() && onGuess) {
      onGuess(guess.trim());
      setGuess('');
    }
  };

  const getTimerColor = () => {
    if (timeLeft > 40) return 'text-green-600';
    if (timeLeft > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isActive && canStartGame) {
    return (
      <div className="flex flex-col items-center gap-4 p-6">
        <Button 
          onClick={onNewGame}
          size="lg"
          className="w-full max-w-xs gap-2"
        >
          <Play className="h-5 w-5" />
          Empezar Juego
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timer */}
      <div className="flex items-center justify-center gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <Clock className={`h-5 w-5 ${getTimerColor()}`} />
        <span className={`text-2xl font-bold ${getTimerColor()}`}>
          {timeLeft}s
        </span>
      </div>

      {/* Drawer View */}
      {isDrawer && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Tu palabra para dibujar:</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">{wordToGuess}</p>
          </div>
          
          <Button
            variant="outline"
            onClick={onSkip}
            className="w-full gap-2"
            disabled={!isActive}
          >
            <SkipForward className="h-4 w-4" />
            Pasar Palabra
          </Button>
          
          {onEndGame && (
            <Button
              variant="destructive"
              onClick={onEndGame}
              className="w-full gap-2"
              disabled={!isActive}
            >
              ⏹️ Terminar Juego
            </Button>
          )}
        </div>
      )}

      {/* Guesser View */}
      {!isDrawer && (
        <form onSubmit={handleSubmitGuess} className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              ¡Adivina qué está dibujando!
            </p>
            <p className="text-lg font-semibold text-green-900 dark:text-green-200">
              {wordToGuess?.length || 0} letras
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Escribe tu respuesta..."
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              disabled={!isActive}
              className="flex-1"
              autoComplete="off"
            />
            <Button 
              type="submit" 
              disabled={!guess.trim() || !isActive}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Enviar
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={onSkip}
            type="button"
            className="w-full gap-2"
            disabled={!isActive}
          >
            <SkipForward className="h-4 w-4" />
            Pasar
          </Button>
          
          {onEndGame && (
            <Button
              variant="destructive"
              onClick={onEndGame}
              type="button"
              className="w-full gap-2"
              disabled={!isActive}
            >
              ⏹️ Terminar Juego
            </Button>
          )}
        </form>
      )}
    </div>
  );
}
