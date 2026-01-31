'use client';

import { useMemo } from 'react';

interface WordHintProps {
  wordLength: number;
  guessedLetters?: string[];
  // Opcional: la palabra real para mostrar hints progresivos
  word?: string;
  // Progreso del tiempo (0-1) para revelar letras gradualmente
  timeProgress?: number;
}

/**
 * Genera posiciones aleatorias pero consistentes para revelar letras
 * Usa el largo de la palabra como seed para que sea consistente entre renders
 */
function getRevealPositions(wordLength: number, revealCount: number): Set<number> {
  const positions = new Set<number>();
  if (revealCount <= 0 || wordLength <= 0) return positions;
  
  // Algoritmo simple para distribuir las letras reveladas
  // Evita revelar la primera y última letra primero (más difícil adivinar)
  const middlePositions = Array.from({ length: wordLength }, (_, i) => i)
    .filter(i => i > 0 && i < wordLength - 1)
    .sort(() => 0.5 - Math.random());
  
  // Primero revelamos letras del medio
  for (let i = 0; i < Math.min(revealCount, middlePositions.length); i++) {
    positions.add(middlePositions[i]);
  }
  
  // Si aún quedan por revelar, añadimos extremos
  if (positions.size < revealCount) {
    if (!positions.has(0)) positions.add(0);
  }
  if (positions.size < revealCount) {
    if (!positions.has(wordLength - 1)) positions.add(wordLength - 1);
  }
  
  return positions;
}

export function WordHint({ 
  wordLength, 
  guessedLetters = [],
  word,
  timeProgress = 0
}: WordHintProps) {
  // Calcular cuántas letras revelar basado en el progreso del tiempo
  // Máximo 40% de las letras se revelan
  const revealedPositions = useMemo(() => {
    if (!word) return new Set<number>();
    
    // Empezar a revelar después del 30% del tiempo, máximo 40% de letras
    const effectiveProgress = Math.max(0, (timeProgress - 0.3) / 0.7);
    const maxReveal = Math.floor(wordLength * 0.4);
    const revealCount = Math.floor(effectiveProgress * maxReveal);
    
    return getRevealPositions(wordLength, revealCount);
  }, [word, wordLength, timeProgress]);

  return (
    <div className="space-y-2">
      <div className="flex justify-center gap-1.5 py-4 flex-wrap">
        {Array.from({ length: wordLength }).map((_, i) => {
          // Prioridad: letras adivinadas > letras reveladas por tiempo > vacío
          const letter = guessedLetters[i] || 
            (word && revealedPositions.has(i) ? word[i] : '');
          const isRevealed = word && revealedPositions.has(i) && !guessedLetters[i];
          
          return (
            <div
              key={i}
              className={`
                w-8 h-10 border-b-4 flex items-end justify-center pb-1 
                text-xl font-bold transition-all duration-300
                ${isRevealed 
                  ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400 animate-pulse' 
                  : 'border-blue-500 dark:border-blue-400 text-gray-700 dark:text-gray-300'
                }
              `}
            >
              {letter.toUpperCase()}
            </div>
          );
        })}
      </div>
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        {wordLength} letras
        {word && timeProgress > 0.3 && revealedPositions.size > 0 && (
          <span className="ml-2 text-yellow-600 dark:text-yellow-400">
            • {revealedPositions.size} pista{revealedPositions.size > 1 ? 's' : ''}
          </span>
        )}
      </p>
    </div>
  );
}
