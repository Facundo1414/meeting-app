'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CanvasDraw } from '@/components/game/canvas-draw';
import { GameControls } from '@/components/game/game-controls';
import { GameScore } from '@/components/game/game-score';
import { GameHeader } from '@/components/game/game-header';
import { ConfettiEffect } from '@/components/game/confetti-effect';
import { WordHint } from '@/components/game/word-hint';
import { StreakIndicator } from '@/components/game/streak-indicator';
import { GameSetup } from '@/components/game/game-setup';
import { GameInvitation } from '@/components/game/game-invitation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User } from '@/lib/auth-supabase';
import { updateLastSeen } from '@/lib/storage-supabase';
import { 
  GameState, 
  loadGameState, 
  saveGameState, 
  createNewGame, 
  nextRound, 
  checkGuess,
  clearGameState,
  loadGameHistory,
  GameHistory as LocalGameHistory
} from '@/lib/game-storage';
import {
  saveGameHistoryToSupabase as saveGameHistorySupabase,
  getGameHistory,
  GameHistory
} from '@/lib/game-supabase';
import { ArrowLeft, Trophy, History, RefreshCw } from 'lucide-react';

const DEFAULT_MAX_ROUNDS = 10;
const DEFAULT_ROUND_TIME = 60;
const DEFAULT_POINTS_PER_CORRECT = 10;

interface GameSettings {
  maxRounds: number;
  roundTime: number;
  pointsPerCorrect: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export default function GamePage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [streak, setStreak] = useState(0);
  const [wrongGuessShake, setWrongGuessShake] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [isOpponentOnline, setIsOpponentOnline] = useState(false);
  const [showInvitation, setShowInvitation] = useState(false);
  const [opponentUsername, setOpponentUsername] = useState<string>('');
  const [fromInvitation, setFromInvitation] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    maxRounds: DEFAULT_MAX_ROUNDS,
    roundTime: DEFAULT_ROUND_TIME,
    pointsPerCorrect: DEFAULT_POINTS_PER_CORRECT,
    difficulty: 'medium',
  });

  useEffect(() => {
    // Get current user
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    const user: User = JSON.parse(userData);
    setCurrentUser(user);
    
    // Load opponent username
    const loadOpponent = async () => {
      const opponentId = user.id === '1' ? '2' : '1';
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase
        .from('users_meeting_app')
        .select('username')
        .eq('id', opponentId)
        .single();
      
      if (data) {
        setOpponentUsername(data.username);
      }
    };
    loadOpponent();
    
    // Update last_seen when entering game
    updateLastSeen(user.id, user.username);

    // Update last_seen every 30 seconds
    const lastSeenInterval = setInterval(() => {
      updateLastSeen(user.id, user.username);
    }, 30000);

    // Load game state
    const saved = loadGameState();
    if (saved && saved.isActive) {
      setGameState(saved);
    }

    // Load history
    setHistory(loadGameHistory());

    return () => {
      clearInterval(lastSeenInterval);
    };
  }, [router]);

  // Memoize the onGameStart handler to prevent unnecessary re-renders
  const handleGameStart = useCallback((settings: GameSettings) => {
    setGameSettings(settings);
    setFromInvitation(true);
    setShowSetup(true);
  }, []);

  const startNewGame = (settings?: GameSettings) => {
    if (!currentUser) return;
    
    // Use provided settings or current game settings
    const finalSettings = settings || gameSettings;
    if (settings) {
      setGameSettings(settings);
    }
    
    // Get both users IDs
    const user1Id = currentUser.id;
    const user2Id = currentUser.id === '1' ? '2' : '1';
    const newGame = createNewGame(user1Id, user2Id, finalSettings.difficulty);
    setGameState(newGame);
    saveGameState(newGame);
    setGameOver(false);
    setWinner(null);
    setShowSetup(false);
    setShowInvitation(false);
    setFromInvitation(false);
  };

  const handleDrawingChange = (dataUrl: string) => {
    if (!gameState) return;
    
    const updated = { ...gameState, drawing: dataUrl };
    setGameState(updated);
    saveGameState(updated);
  };

  const handleGuess = async (guess: string) => {
    if (!gameState || !currentUser) return;

    const isCorrect = checkGuess(guess, gameState.wordToGuess);
    
    // Add guess to history
    const newGuess = {
      user: currentUser.id,
      guess,
      timestamp: Date.now(),
    };
    
    const updatedGuesses = [...gameState.guesses, newGuess];
    
    if (isCorrect) {
      // Award points
      const updatedScores = {
        ...gameState.scores,
        [currentUser.id]: gameState.scores[currentUser.id] + gameSettings.pointsPerCorrect,
      };

      // Update streak
      setStreak(prev => prev + 1);
      
      // Show confetti celebration
      setShowConfetti(true);

      // Check if game is over
      if (gameState.round >= gameSettings.maxRounds) {
        const winner = Object.entries(updatedScores).reduce((a, b) => 
          a[1] > b[1] ? a : b
        )[0];
        
        const finalState = {
          ...gameState,
          scores: updatedScores,
          guesses: updatedGuesses,
          isActive: false,
          winner,
        };
        
        setGameState(finalState);
        
        // Get player IDs correctly
        const player1Id = Object.keys(gameState.scores)[0];
        const player2Id = Object.keys(gameState.scores)[1];
        
        await saveGameHistorySupabase(
          player1Id,
          player2Id,
          winner,
          updatedScores[player1Id] || 0,
          updatedScores[player2Id] || 0,
          gameState.round,
          gameSettings.difficulty
        );
        setGameOver(true);
        setWinner(winner);
        clearGameState();
        const updatedHistory = await getGameHistory(currentUser.id);
        setHistory(updatedHistory);
        return;
      }

      // Move to next round
      const users = Object.keys(gameState.scores);
      const nextState = nextRound(
        { ...gameState, scores: updatedScores, guesses: updatedGuesses },
        users,
        gameSettings.difficulty
      );
      
      setGameState(nextState);
      saveGameState(nextState);
    } else {
      // Wrong guess - shake effect
      setWrongGuessShake(true);
      setTimeout(() => setWrongGuessShake(false), 500);
      
      const updated = { ...gameState, guesses: updatedGuesses };
      setGameState(updated);
      saveGameState(updated);
    }
  };

  const handleSkip = async () => {
    if (!gameState) return;

    // Reset streak on skip
    setStreak(0);

    // Check if game is over
    if (gameState.round >= gameSettings.maxRounds) {
      const winner = Object.entries(gameState.scores).reduce((a, b) => 
        a[1] > b[1] ? a : b
      )[0];
      
      const finalState = {
        ...gameState,
        isActive: false,
        winner,
      };
      
      setGameState(finalState);
      
      // Get player IDs correctly
      const player1Id = Object.keys(gameState.scores)[0];
      const player2Id = Object.keys(gameState.scores)[1];
      
      await saveGameHistorySupabase(
        player1Id,
        player2Id,
        winner,
        gameState.scores[player1Id] || 0,
        gameState.scores[player2Id] || 0,
        gameState.round,
        gameSettings.difficulty,
        0
      );
      setGameOver(true);
      setWinner(winner);
      clearGameState();
      const updatedHistory = await getGameHistory(currentUser?.id || '');
      setHistory(updatedHistory);
      return;
    }

    // Move to next round
    const users = Object.keys(gameState.scores);
    const nextState = nextRound(gameState, users, gameSettings.difficulty);
    
    setGameState(nextState);
    saveGameState(nextState);
  };

  const handleForfeit = async () => {
    if (!gameState || !currentUser) return;
    
    // El oponente gana automáticamente
    const opponentId = Object.keys(gameState.scores).find(id => id !== currentUser.id);
    if (!opponentId) return;
    
    const finalState = {
      ...gameState,
      isActive: false,
      winner: opponentId,
    };
    
    setGameState(finalState);
    
    // Guardar en historial con el oponente como ganador
    await saveGameHistorySupabase(
      currentUser.id,
      opponentId,
      opponentId, // El oponente gana
      gameState.scores[currentUser.id] || 0,
      gameState.scores[opponentId] || 0,
      gameState.round,
      gameSettings.difficulty,
      0
    );
    
    setGameOver(true);
    setWinner(opponentId);
    clearGameState();
    const updatedHistory = await getGameHistory(currentUser.id);
    setHistory(updatedHistory);
  };

  const handleEndGame = async () => {
    if (!gameState || !currentUser) return;
    
    const winner = Object.entries(gameState.scores).reduce((a, b) => 
      a[1] > b[1] ? a : b
    )[0];
    
    const finalState = {
      ...gameState,
      isActive: false,
      winner,
    };
    
    setGameState(finalState);
    
    // Get player IDs correctly
    const player1Id = Object.keys(gameState.scores)[0];
    const player2Id = Object.keys(gameState.scores)[1];
    
    await saveGameHistorySupabase(
      player1Id,
      player2Id,
      winner,
      gameState.scores[player1Id] || 0,
      gameState.scores[player2Id] || 0,
      gameState.round,
      gameSettings.difficulty
    );
    setGameOver(true);
    setWinner(winner);
    clearGameState();
    const updatedHistory = await getGameHistory(currentUser.id);
    setHistory(updatedHistory);
  };

  const isDrawer = gameState?.currentDrawer === currentUser?.id;
  
  // Get opponent username
  const getOpponentUsername = () => {
    return opponentUsername || 'Oponente';
  };

  if (showSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        {currentUser && (
          <GameHeader
            onBack={() => {
              setShowSetup(false);
              router.push('/calendar');
            }}
            onHistory={() => {
              setShowSetup(false);
              setShowHistory(true);
            }}
            currentUserName={currentUser.username}
            opponentUsername={getOpponentUsername()}
            onOpponentStatusChange={setIsOpponentOnline}
          />
        )}
        <GameSetup
          onStartGame={startNewGame}
          onCancel={() => {
            setShowSetup(false);
            setFromInvitation(false);
            router.push('/calendar');
          }}
          initialSettings={fromInvitation ? gameSettings : undefined}
          readonly={fromInvitation}
        />
      </div>
    );
  }

  if (showHistory) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(false)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Historial de Partidas</h1>
          </div>

          {history.length === 0 ? (
            <Card className="p-8 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No hay partidas jugadas aún</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((game) => (
                <Card key={game.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="font-semibold">
                          Ganador: {game.winnerId === currentUser?.id ? 'Tú' : 'Oponente'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {game.roundsPlayed} rondas jugadas
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(game.createdAt).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        <span className={game.player1Id === currentUser?.id ? 'font-bold' : ''}>
                          {game.player1Id === currentUser?.id ? 'Tú' : 'Oponente'}:
                        </span>{' '}
                        <span className="font-semibold">{game.player1Score}</span>
                      </div>
                      <div className="text-sm">
                        <span className={game.player2Id === currentUser?.id ? 'font-bold' : ''}>
                          {game.player2Id === currentUser?.id ? 'Tú' : 'Oponente'}:
                        </span>{' '}
                        <span className="font-semibold">{game.player2Score}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameOver && winner) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <Trophy className="h-20 w-20 mx-auto text-yellow-500" />
          <div>
            <h1 className="text-3xl font-bold mb-2">¡Juego Terminado!</h1>
            <p className="text-xl">
              {winner === currentUser?.id ? '¡Ganaste! 🎉' : 'Perdiste 😢'}
            </p>
          </div>
          
          {gameState && (
            <div className="space-y-2">
              <h2 className="font-semibold">Puntuación Final:</h2>
              {Object.entries(gameState.scores).map(([userId, score]) => (
                <div key={userId} className="flex justify-between items-center">
                  <span>{userId === currentUser?.id ? 'Tú' : 'Oponente'}:</span>
                  <span className="font-bold text-xl">{score}</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Button onClick={startNewGame} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              Jugar de Nuevo
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/calendar')}
              className="w-full"
            >
              Volver al Calendario
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Confetti Effect */}
      <ConfettiEffect isActive={showConfetti} onComplete={() => setShowConfetti(false)} />
      
      {/* Header */}
      {currentUser && (
        <GameHeader
          onBack={() => router.push('/calendar')}
          onHistory={() => setShowHistory(true)}
          currentUserName={currentUser.username}
          opponentUsername={getOpponentUsername()}
          onOpponentStatusChange={setIsOpponentOnline}
          onForfeit={handleForfeit}
          showForfeit={gameState?.isActive || false}
        />
      )}
      
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Game Description - Show when no active game */}
        {(!gameState || !gameState.isActive) && (
          <Card className="p-6 space-y-4 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                🎨 Quick Draw
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                ¡Dibuja y adivina en tiempo real!
              </p>
            </div>

            <div className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📝 ¿Cómo jugar?
              </h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex gap-2">
                  <span className="font-bold text-purple-600 dark:text-purple-400">1.</span>
                  <p><strong>Invita</strong> a tu oponente a una partida</p>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-purple-600 dark:text-purple-400">2.</span>
                  <p><strong>Turno de dibujar:</strong> Recibe una palabra secreta y dibújala</p>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-purple-600 dark:text-purple-400">3.</span>
                  <p><strong>Turno de adivinar:</strong> Observa el dibujo y adivina la palabra</p>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-purple-600 dark:text-purple-400">4.</span>
                  <p><strong>Gana puntos</strong> por cada palabra correcta</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-2xl mb-1">⏱️</div>
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tiempo limitado</div>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="text-2xl mb-1">🎯</div>
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Varias rondas</div>
              </div>
              <div className="p-3 bg-pink-50 dark:bg-pink-950 rounded-lg">
                <div className="text-2xl mb-1">🏆</div>
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Mayor puntaje gana</div>
              </div>
            </div>
          </Card>
        )}

        {/* Game Invitation */}
        {(!gameState || !gameState.isActive) && currentUser && (
          <GameInvitation
            currentUser={currentUser}
            opponentId={currentUser.id === '1' ? '2' : '1'}
            opponentUsername={getOpponentUsername()}
            isOpponentOnline={isOpponentOnline}
            onGameStart={handleGameStart}
          />
        )}

        {/* Score */}
        {gameState && currentUser && (
          <GameScore
            scores={gameState.scores}
            round={gameState.round}
            currentUser={currentUser.id}
            maxRounds={gameSettings.maxRounds}
          />
        )}

        {/* Streak Indicator */}
        {gameState?.isActive && <StreakIndicator streak={streak} />}

        {/* Role Indicator */}
        {gameState?.isActive && (
          <Card className={`p-4 transition-all duration-300 ${
            isDrawer 
              ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-300' 
              : 'bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950 border-blue-300'
          }`}>
            <p className="text-center text-lg font-semibold">
              {isDrawer ? '🎨 Estás dibujando' : '🤔 Estás adivinando'}
            </p>
            {!isDrawer && gameState && (
              <WordHint wordLength={gameState.wordToGuess.length} />
            )}
          </Card>
        )}

        {/* Canvas */}
        {gameState?.isActive && (
          <Card className={`p-4 transition-all duration-300 ${wrongGuessShake ? 'animate-shake' : ''}`}>
            <CanvasDraw
              onDrawingChange={handleDrawingChange}
              disabled={!isDrawer || !gameState?.isActive}
              initialDrawing={gameState?.drawing}
              readOnly={!isDrawer}
            />
          </Card>
        )}
        
        <style jsx>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
            20%, 40%, 60%, 80% { transform: translateX(10px); }
          }
          .animate-shake {
            animation: shake 0.5s;
          }
        `}</style>

        {/* Controls */}
        {gameState?.isActive && (
          <Card className="p-4">
            <GameControls
              isDrawer={isDrawer}
              wordToGuess={gameState?.wordToGuess}
              onGuess={handleGuess}
              onSkip={handleSkip}
              onNewGame={startNewGame}
              onEndGame={handleEndGame}
              timeLimit={gameSettings.roundTime}
              isActive={gameState?.isActive || false}
              canStartGame={!gameState || !gameState.isActive}
            />
          </Card>
        )}

        {/* Recent Guesses */}
        {gameState?.isActive && gameState && gameState.guesses.length > 0 && !isDrawer && (
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Tus intentos:</h3>
            <div className="space-y-1">
              {gameState.guesses
                .filter(g => g.user === currentUser?.id)
                .slice(-5)
                .reverse()
                .map((g, i) => (
                  <div key={i} className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="text-red-500">✗</span>
                    <span>{g.guess}</span>
                  </div>
                ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
