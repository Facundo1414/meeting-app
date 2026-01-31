export interface GameState {
  currentDrawer: string; // user email
  currentWord: string;
  wordToGuess: string; // actual word for drawer
  drawing: string; // base64 canvas data
  round: number;
  scores: {
    [email: string]: number;
  };
  guesses: Array<{
    user: string;
    guess: string;
    timestamp: number;
  }>;
  startTime: number;
  isActive: boolean;
  winner?: string;
  // Nuevo: tracking de quién adivinó y cuándo
  correctGuessers?: Array<{
    user: string;
    timestamp: number;
    points: number;
  }>;
}

export interface GameHistory {
  id: string;
  date: number;
  winner: string;
  finalScores: { [email: string]: number };
  rounds: number;
}

const GAME_STORAGE_KEY = "quick-draw-game";
const GAME_HISTORY_KEY = "quick-draw-history";

// Sistema de puntuación dinámico basado en juegos profesionales como Skribbl
export const POINTS_CONFIG = {
  // Puntos para el adivinador según el orden
  FIRST_GUESS: 100,
  SECOND_GUESS: 80,
  THIRD_GUESS: 60,
  LATE_GUESS: 40,
  // Bonus por velocidad (se multiplica por segundos restantes)
  SPEED_BONUS_MULTIPLIER: 0.5,
  // Puntos para el dibujante
  DRAWER_BASE: 25, // Puntos base cuando alguien adivina
  DRAWER_BONUS_PER_GUESSER: 10, // Bonus por cada persona que adivina
  // Penalización
  DRAWER_PENALTY: 0, // Sin penalización si nadie adivina (para no frustrar)
};

/**
 * Calcula los puntos para un adivinador basado en:
 * - Orden de adivinanza (primero gana más)
 * - Tiempo restante (bonus por velocidad)
 */
export function calculateGuesserPoints(
  guessOrder: number, // 0 = primero, 1 = segundo, etc
  timeRemaining: number, // segundos restantes
  totalTime: number, // tiempo total del round
): number {
  let basePoints: number;

  switch (guessOrder) {
    case 0:
      basePoints = POINTS_CONFIG.FIRST_GUESS;
      break;
    case 1:
      basePoints = POINTS_CONFIG.SECOND_GUESS;
      break;
    case 2:
      basePoints = POINTS_CONFIG.THIRD_GUESS;
      break;
    default:
      basePoints = POINTS_CONFIG.LATE_GUESS;
  }

  // Bonus por velocidad: más puntos si adivinas rápido
  const speedBonus = Math.floor(
    timeRemaining * POINTS_CONFIG.SPEED_BONUS_MULTIPLIER,
  );

  return basePoints + speedBonus;
}

/**
 * Calcula los puntos para el dibujante basado en cuántas personas adivinaron
 */
export function calculateDrawerPoints(numCorrectGuessers: number): number {
  if (numCorrectGuessers === 0) {
    return POINTS_CONFIG.DRAWER_PENALTY;
  }

  return (
    POINTS_CONFIG.DRAWER_BASE +
    numCorrectGuessers * POINTS_CONFIG.DRAWER_BONUS_PER_GUESSER
  );
}

// Lista de palabras para dibujar (español) por dificultad
export const DRAWING_WORDS = {
  easy: [
    "casa",
    "perro",
    "gato",
    "sol",
    "luna",
    "estrella",
    "corazón",
    "auto",
    "flor",
    "árbol",
    "pelota",
    "mano",
    "ojo",
    "cara",
    "silla",
    "mesa",
    "cama",
    "pez",
    "pájaro",
    "libro",
    "lápiz",
    "taza",
    "vaso",
    "plato",
    "zapato",
    "camisa",
    "pizza",
    "helado",
  ],
  medium: [
    "bicicleta",
    "montaña",
    "playa",
    "paraguas",
    "reloj",
    "teléfono",
    "computadora",
    "café",
    "avión",
    "barco",
    "pie",
    "puerta",
    "ventana",
    "escalera",
    "lámpara",
    "espejo",
    "botella",
    "cuchara",
    "tenedor",
    "guitarra",
    "tambor",
    "cámara",
    "llave",
    "mariposa",
    "tortuga",
    "elefante",
    "león",
    "jirafa",
    "conejo",
    "ratón",
    "caballo",
    "vaca",
    "cerdo",
    "pollo",
    "oveja",
  ],
  hard: [
    "serpiente",
    "araña",
    "hormiga",
    "abeja",
    "rana",
    "pulpo",
    "tiburón",
    "ballena",
    "delfín",
    "cangrejo",
    "microscopio",
    "telescopio",
    "dinosaurio",
    "volcán",
    "tornado",
    "arcoíris",
    "faro",
    "ancla",
    "brújula",
    "mapa",
    "castillo",
    "pirámide",
    "cohete",
    "satélite",
    "paracaídas",
    "submarino",
    "helicóptero",
  ],
};

export function getRandomWord(
  difficulty: "easy" | "medium" | "hard" = "medium",
): string {
  const words = DRAWING_WORDS[difficulty];
  return words[Math.floor(Math.random() * words.length)];
}

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Error saving game state:", error);
  }
}

export function loadGameState(): GameState | null {
  try {
    const data = localStorage.getItem(GAME_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error loading game state:", error);
    return null;
  }
}

export function clearGameState(): void {
  try {
    localStorage.removeItem(GAME_STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing game state:", error);
  }
}

export function createNewGame(
  user1: string,
  user2: string,
  difficulty: "easy" | "medium" | "hard" = "medium",
): GameState {
  const firstDrawer = Math.random() > 0.5 ? user1 : user2;
  const word = getRandomWord(difficulty);

  return {
    currentDrawer: firstDrawer,
    currentWord: word,
    wordToGuess: word,
    drawing: "",
    round: 1,
    scores: {
      [user1]: 0,
      [user2]: 0,
    },
    guesses: [],
    startTime: Date.now(),
    isActive: true,
  };
}

export function saveGameHistory(game: GameState, winner: string): void {
  try {
    const history = loadGameHistory();
    const newEntry: GameHistory = {
      id: Date.now().toString(),
      date: Date.now(),
      winner,
      finalScores: game.scores,
      rounds: game.round,
    };

    history.unshift(newEntry);

    // Keep only last 20 games
    const limitedHistory = history.slice(0, 20);
    localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(limitedHistory));
  } catch (error) {
    console.error("Error saving game history:", error);
  }
}

export function loadGameHistory(): GameHistory[] {
  try {
    const data = localStorage.getItem(GAME_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading game history:", error);
    return [];
  }
}

export function nextRound(
  currentState: GameState,
  users: string[],
  difficulty: "easy" | "medium" | "hard" = "medium",
): GameState {
  const currentDrawerIndex = users.indexOf(currentState.currentDrawer);
  const nextDrawer = users[(currentDrawerIndex + 1) % users.length];
  const newWord = getRandomWord(difficulty);

  return {
    ...currentState,
    currentDrawer: nextDrawer,
    currentWord: newWord,
    wordToGuess: newWord,
    drawing: "",
    round: currentState.round + 1,
    guesses: [],
    correctGuessers: [], // Limpiar lista de adivinadores para la nueva ronda
    startTime: Date.now(),
  };
}

export function normalizeGuess(guess: string): string {
  return guess
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove accents
}

export function checkGuess(guess: string, word: string): boolean {
  return normalizeGuess(guess) === normalizeGuess(word);
}
