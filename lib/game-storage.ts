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
  difficulty: "easy" | "medium" | "hard" = "medium"
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
  difficulty: "easy" | "medium" | "hard" = "medium"
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
  difficulty: "easy" | "medium" | "hard" = "medium"
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
