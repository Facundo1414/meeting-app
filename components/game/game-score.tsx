'use client';

import { Trophy, Target, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface GameScoreProps {
  scores: {
    [email: string]: number;
  };
  round: number;
  currentUser: string;
  maxRounds?: number;
}

export function GameScore({ scores, round, currentUser, maxRounds = 10 }: GameScoreProps) {
  const entries = Object.entries(scores);
  const [player1, player2] = entries;
  
  const getPlayerName = (email: string) => {
    return email === currentUser ? 'Tú' : 'Oponente';
  };

  const isWinning = (email: string) => {
    return scores[email] > Math.max(...Object.values(scores).filter(s => scores[email] !== s));
  };

  return (
    <Card className="p-4 space-y-4">
      {/* Round Counter */}
      <div className="flex items-center justify-center gap-2 pb-3 border-b">
        <Target className="h-5 w-5 text-blue-600" />
        <span className="text-lg font-semibold">
          Ronda {round} de {maxRounds}
        </span>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-4">
        {entries.map(([email, score]) => (
          <div 
            key={email}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all ${
              email === currentUser 
                ? 'bg-blue-50 dark:bg-blue-950 border-2 border-blue-300 dark:border-blue-700' 
                : 'bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600'
            } ${
              isWinning(email) ? 'ring-2 ring-yellow-400' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              {isWinning(email) && <Trophy className="h-4 w-4 text-yellow-500" />}
              <span className={`text-sm font-medium ${
                email === currentUser ? 'text-blue-900 dark:text-blue-200' : 'text-gray-700 dark:text-gray-300'
              }`}>
                {getPlayerName(email)}
              </span>
            </div>
            
            <div className="text-3xl font-bold">
              {score}
            </div>
            
            <div className="text-xs text-gray-500 dark:text-gray-400">
              puntos
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="pt-3 border-t">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-400">Progreso del juego</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(round / maxRounds) * 100}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
