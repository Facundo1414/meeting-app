'use client';

interface WordHintProps {
  wordLength: number;
  guessedLetters?: string[];
}

export function WordHint({ wordLength, guessedLetters = [] }: WordHintProps) {
  return (
    <div className="flex justify-center gap-2 py-4">
      {Array.from({ length: wordLength }).map((_, i) => (
        <div
          key={i}
          className="w-8 h-10 border-b-4 border-blue-500 dark:border-blue-400 flex items-end justify-center pb-1 text-xl font-bold text-gray-700 dark:text-gray-300"
        >
          {guessedLetters[i] || ''}
        </div>
      ))}
    </div>
  );
}
