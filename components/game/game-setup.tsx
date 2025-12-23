'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Play, Settings } from 'lucide-react';

interface GameSettings {
  maxRounds: number;
  roundTime: number;
  pointsPerCorrect: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface GameSetupProps {
  onStartGame: (settings: GameSettings) => void;
  onCancel: () => void;
  initialSettings?: GameSettings;
  readonly?: boolean;
}

export function GameSetup({ onStartGame, onCancel, initialSettings, readonly = false }: GameSetupProps) {
  const [maxRounds, setMaxRounds] = useState(initialSettings?.maxRounds || 10);
  const [roundTime, setRoundTime] = useState(initialSettings?.roundTime || 60);
  const [pointsPerCorrect, setPointsPerCorrect] = useState(initialSettings?.pointsPerCorrect || 10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(initialSettings?.difficulty || 'medium');

  const handleStart = () => {
    onStartGame({
      maxRounds,
      roundTime,
      pointsPerCorrect,
      difficulty,
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b">
          <Settings className="h-6 w-6 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold">{readonly ? 'Configuración de la Partida' : 'Configuración del Juego'}</h2>
            <p className="text-sm text-gray-500">
              {readonly ? 'Configuración establecida por tu oponente' : 'Personaliza tu partida de Quick Draw'}
            </p>
          </div>
        </div>

        {/* Cantidad de rondas */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Cantidad de Rondas
          </label>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              min="1"
              max="20"
              value={maxRounds}
              onChange={(e) => setMaxRounds(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              className="w-24 text-center text-lg font-bold"
              disabled={readonly}
            />
            <div className="flex gap-2">
              {[5, 10, 15, 20].map((rounds) => (
                <Button
                  key={rounds}
                  variant={maxRounds === rounds ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMaxRounds(rounds)}
                  disabled={readonly}
                >
                  {rounds}
                </Button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Entre 1 y 20 rondas</p>
        </div>

        {/* Tiempo por ronda */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Tiempo por Ronda (segundos)
          </label>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              min="15"
              max="180"
              value={roundTime}
              onChange={(e) => setRoundTime(Math.max(15, Math.min(180, parseInt(e.target.value) || 15)))}
              className="w-24 text-center text-lg font-bold"
              disabled={readonly}
            />
            <div className="flex gap-2">
              {[30, 60, 90, 120].map((seconds) => (
                <Button
                  key={seconds}
                  variant={roundTime === seconds ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoundTime(seconds)}
                  disabled={readonly}
                >
                  {seconds}s
                </Button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Entre 15 y 180 segundos</p>
        </div>

        {/* Puntos por acierto */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Puntos por Acierto
          </label>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              min="1"
              max="50"
              value={pointsPerCorrect}
              onChange={(e) => setPointsPerCorrect(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              className="w-24 text-center text-lg font-bold"
              disabled={readonly}
            />
            <div className="flex gap-2">
              {[5, 10, 15, 20].map((points) => (
                <Button
                  key={points}
                  variant={pointsPerCorrect === points ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPointsPerCorrect(points)}
                  disabled={readonly}
                >
                  {points}pts
                </Button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Entre 1 y 50 puntos</p>
        </div>

        {/* Dificultad */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Dificultad de las Palabras
          </label>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={difficulty === 'easy' ? 'default' : 'outline'}
              onClick={() => setDifficulty('easy')}
              className={difficulty === 'easy' ? 'bg-green-600 hover:bg-green-700' : ''}
              disabled={readonly}
            >
              <div className="text-center">
                <div className="text-lg">😊</div>
                <div className="text-xs">Fácil</div>
              </div>
            </Button>
            <Button
              variant={difficulty === 'medium' ? 'default' : 'outline'}
              onClick={() => setDifficulty('medium')}
              className={difficulty === 'medium' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
              disabled={readonly}
            >
              <div className="text-center">
                <div className="text-lg">😐</div>
                <div className="text-xs">Media</div>
              </div>
            </Button>
            <Button
              variant={difficulty === 'hard' ? 'default' : 'outline'}
              onClick={() => setDifficulty('hard')}
              className={difficulty === 'hard' ? 'bg-red-600 hover:bg-red-700' : ''}
              disabled={readonly}
            >
              <div className="text-center">
                <div className="text-lg">😰</div>
                <div className="text-xs">Difícil</div>
              </div>
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {difficulty === 'easy' && 'Palabras simples y comunes'}
            {difficulty === 'medium' && 'Mezcla de palabras simples y complejas'}
            {difficulty === 'hard' && 'Palabras complejas y específicas'}
          </p>
        </div>

        {/* Resumen */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Resumen:</h3>
          <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <p>• {maxRounds} rondas de {roundTime} segundos cada una</p>
            <p>• {pointsPerCorrect} puntos por cada palabra correcta</p>
            <p>• Dificultad: {difficulty === 'easy' ? 'Fácil' : difficulty === 'medium' ? 'Media' : 'Difícil'}</p>
            <p className="font-semibold mt-2">
              Duración aproximada: {Math.ceil((maxRounds * roundTime) / 60)} minutos
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleStart}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2"
            size="lg"
          >
            <Play className="h-5 w-5" />
            Comenzar Juego
          </Button>
        </div>
      </Card>
    </div>
  );
}
