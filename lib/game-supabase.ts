import { supabase } from "./supabase";

// Types
export interface GameHistory {
  id: string;
  player1_id: string;
  player2_id: string;
  winner_id: string;
  player1_score: number;
  player2_score: number;
  rounds_played: number;
  difficulty: "easy" | "medium" | "hard";
  duration_seconds: number;
  created_at: string;
}

export interface GameInvitation {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "rejected" | "expired" | "canceled";
  max_rounds: number;
  round_time: number;
  points_per_correct: number;
  difficulty: "easy" | "medium" | "hard";
  created_at: string;
  expires_at: string;
  // Mapped properties for easier access
  fromUserId?: string;
  toUserId?: string;
  maxRounds?: number;
  roundTime?: number;
  pointsPerCorrect?: number;
  expiresAt?: string;
  createdAt?: string;
}

export interface GameSession {
  id: string;
  player1_id: string;
  player2_id: string;
  current_drawer: string;
  current_word: string;
  drawing_data?: string;
  current_round: number;
  player1_score: number;
  player2_score: number;
  max_rounds: number;
  round_time: number;
  points_per_correct: number;
  difficulty: "easy" | "medium" | "hard";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlayerStats {
  user_id: string;
  games_played: number;
  games_won: number;
  games_lost: number;
  total_points: number;
  highest_score: number;
  current_streak: number;
  best_streak: number;
  words_guessed: number;
  words_drawn: number;
  average_guess_time: number;
  updated_at: string;
}

// Game History Functions
export async function saveGameHistoryToSupabase(
  player1Id: string,
  player2Id: string,
  winnerId: string,
  player1Score: number,
  player2Score: number,
  roundsPlayed: number,
  difficulty: "easy" | "medium" | "hard",
  durationSeconds: number
) {
  try {
    const { data, error } = await supabase
      .from("game_history_meeting_app")
      .insert([
        {
          player1_id: player1Id,
          player2_id: player2Id,
          winner_id: winnerId,
          player1_score: player1Score,
          player2_score: player2Score,
          rounds_played: roundsPlayed,
          difficulty,
          duration_seconds: durationSeconds,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Update player stats
    await updatePlayerStats(player1Id, winnerId === player1Id, player1Score);
    await updatePlayerStats(player2Id, winnerId === player2Id, player2Score);

    return data;
  } catch (error) {
    console.error("Error saving game history:", error);
    return null;
  }
}

export async function getGameHistory(userId: string, limit = 20) {
  try {
    const { data, error } = await supabase
      .from("game_history_meeting_app")
      .select("*")
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as GameHistory[];
  } catch (error) {
    console.error("Error fetching game history:", error);
    return [];
  }
}

// Helper function to map invitation data from snake_case to camelCase
function mapInvitation(inv: any): GameInvitation {
  return {
    ...inv,
    fromUserId: inv.from_user_id,
    toUserId: inv.to_user_id,
    maxRounds: inv.max_rounds,
    roundTime: inv.round_time,
    pointsPerCorrect: inv.points_per_correct,
    expiresAt: inv.expires_at,
    createdAt: inv.created_at,
  };
}

// Game Invitations Functions
export async function sendGameInvitation(
  fromUserId: string,
  toUserId: string,
  settings: {
    maxRounds: number;
    roundTime: number;
    pointsPerCorrect: number;
    difficulty: "easy" | "medium" | "hard";
  }
) {
  try {
    // Check for existing pending invitation
    const { data: existingList } = await supabase
      .from("game_invitations_meeting_app")
      .select("*")
      .eq("from_user_id", fromUserId)
      .eq("to_user_id", toUserId)
      .eq("status", "pending")
      .limit(1);

    if (existingList && existingList.length > 0) {
      return mapInvitation(existingList[0]);
    }

    // Create new invitation with 2 minute expiry
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("game_invitations_meeting_app")
      .insert([
        {
          from_user_id: fromUserId,
          to_user_id: toUserId,
          status: "pending",
          max_rounds: settings.maxRounds,
          round_time: settings.roundTime,
          points_per_correct: settings.pointsPerCorrect,
          difficulty: settings.difficulty,
          expires_at: expiresAt,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return mapInvitation(data);
  } catch (error) {
    console.error("Error sending invitation:", error);
    return null;
  }
}

export async function getGameInvitations(userId: string) {
  try {
    const { data, error } = await supabase
      .from("game_invitations_meeting_app")
      .select("*")
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .in("status", ["pending", "accepted"])
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ? data.map(mapInvitation) : [];
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return [];
  }
}

export async function updateInvitationStatus(
  invitationId: string,
  status: "accepted" | "rejected" | "expired"
) {
  try {
    const { data, error } = await supabase
      .from("game_invitations_meeting_app")
      .update({ status })
      .eq("id", invitationId)
      .select()
      .single();

    if (error) throw error;
    return data as GameInvitation;
  } catch (error) {
    console.error("Error updating invitation:", error);
    return null;
  }
}

export async function cancelGameInvitation(invitationId: string) {
  try {
    const { error } = await supabase
      .from("game_invitations_meeting_app")
      .update({ status: "canceled" })
      .eq("id", invitationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error canceling invitation:", error);
    return false;
  }
}

// Subscribe to invitations in real-time
export function subscribeToInvitations(
  userId: string,
  callback: (invitation: GameInvitation) => void
) {
  const channel = supabase
    .channel("game-invitations")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "game_invitations_meeting_app",
        filter: `to_user_id=eq.${userId}`,
      },
      (payload) => {
        callback(mapInvitation(payload.new));
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "game_invitations_meeting_app",
        filter: `from_user_id=eq.${userId}`,
      },
      (payload) => {
        callback(mapInvitation(payload.new));
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "game_invitations_meeting_app",
        filter: `to_user_id=eq.${userId}`,
      },
      (payload) => {
        callback(mapInvitation(payload.new));
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "game_invitations_meeting_app",
      },
      (payload) => {
        // Enviar invitación con status canceled para indicar eliminación
        if (payload.old) {
          callback({ ...mapInvitation(payload.old), status: "canceled" });
        }
      }
    )
    .subscribe();

  return channel;
}

// Game Session Functions
export async function saveGameSession(
  player1Id: string,
  player2Id: string,
  currentDrawerId: string,
  wordToGuess: string,
  round: number,
  player1Score: number,
  player2Score: number,
  maxRounds: number,
  difficulty: "easy" | "medium" | "hard",
  drawingData?: string
) {
  try {
    // Check if session exists
    const { data: existing } = await supabase
      .from("game_sessions_meeting_app")
      .select("id")
      .eq("player1_id", player1Id)
      .eq("player2_id", player2Id)
      .eq("is_active", true)
      .single();

    const sessionData = {
      player1_id: player1Id,
      player2_id: player2Id,
      current_drawer_id: currentDrawerId,
      word_to_guess: wordToGuess,
      drawing_data: drawingData,
      round,
      player1_score: player1Score,
      player2_score: player2Score,
      max_rounds: maxRounds,
      difficulty,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Update existing session
      const { data, error } = await supabase
        .from("game_sessions_meeting_app")
        .update(sessionData)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return data as GameSession;
    } else {
      // Create new session
      const { data, error } = await supabase
        .from("game_sessions_meeting_app")
        .insert([sessionData])
        .select()
        .single();

      if (error) throw error;
      return data as GameSession;
    }
  } catch (error) {
    console.error("Error saving game session:", error);
    return null;
  }
}

// Player Stats Functions
export async function getPlayerStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from("player_stats_meeting_app")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code === "PGRST116") {
      // Create initial stats if not exists
      return await createInitialStats(userId);
    }

    if (error) throw error;
    return data as PlayerStats;
  } catch (error) {
    console.error("Error fetching player stats:", error);
    return null;
  }
}

async function createInitialStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from("player_stats_meeting_app")
      .insert([
        {
          user_id: userId,
          games_played: 0,
          games_won: 0,
          games_lost: 0,
          total_points: 0,
          highest_score: 0,
          current_streak: 0,
          best_streak: 0,
          words_guessed: 0,
          words_drawn: 0,
          average_guess_time: 0,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as PlayerStats;
  } catch (error) {
    console.error("Error creating initial stats:", error);
    return null;
  }
}

async function updatePlayerStats(userId: string, won: boolean, score: number) {
  try {
    const stats = await getPlayerStats(userId);
    if (!stats) return;

    const newStreak = won ? stats.current_streak + 1 : 0;

    const { error } = await supabase
      .from("player_stats_meeting_app")
      .update({
        games_played: stats.games_played + 1,
        games_won: won ? stats.games_won + 1 : stats.games_won,
        games_lost: !won ? stats.games_lost + 1 : stats.games_lost,
        total_points: stats.total_points + score,
        highest_score: Math.max(stats.highest_score, score),
        current_streak: newStreak,
        best_streak: Math.max(stats.best_streak, newStreak),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) throw error;
  } catch (error) {
    console.error("Error updating player stats:", error);
  }
}

export async function updateWordStats(
  userId: string,
  guessed: number,
  drawn: number
) {
  try {
    const stats = await getPlayerStats(userId);
    if (!stats) return;

    const { error } = await supabase
      .from("player_stats_meeting_app")
      .update({
        words_guessed: stats.words_guessed + guessed,
        words_drawn: stats.words_drawn + drawn,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) throw error;
  } catch (error) {
    console.error("Error updating word stats:", error);
  }
}

// Game Session Real-time Functions
export async function createGameSession(
  player1Id: string,
  player2Id: string,
  drawerId: string,
  word: string,
  maxRounds: number,
  difficulty: "easy" | "medium" | "hard"
): Promise<GameSession | null> {
  try {
    const { data, error } = await supabase
      .from("game_sessions_meeting_app")
      .insert([
        {
          player1_id: player1Id,
          player2_id: player2Id,
          current_drawer: drawerId,
          current_word: word,
          current_round: 1,
          player1_score: 0,
          player2_score: 0,
          max_rounds: maxRounds,
          difficulty,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating game session:", error);
    return null;
  }
}

export async function getActiveGameSession(
  userId: string
): Promise<GameSession | null> {
  try {
    const { data, error } = await supabase
      .from("game_sessions_meeting_app")
      .select("*")
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .eq("is_active", true)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error getting active game session:", error);
    return null;
  }
}

export async function updateGameSession(
  sessionId: string,
  updates: {
    drawing_data?: string;
    player1_score?: number;
    player2_score?: number;
    current_round?: number;
    current_drawer?: string;
    current_word?: string;
    is_active?: boolean;
  }
) {
  try {
    const { error } = await supabase
      .from("game_sessions_meeting_app")
      .update(updates)
      .eq("id", sessionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating game session:", error);
    return false;
  }
}

export function subscribeToGameSession(
  sessionId: string,
  callback: (session: GameSession) => void
) {
  const channel = supabase
    .channel(`game-session-${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "game_sessions_meeting_app",
        filter: `id=eq.${sessionId}`,
      },
      (payload) => {
        callback(payload.new as GameSession);
      }
    )
    .subscribe();

  return channel;
}

export async function endGameSession(sessionId: string) {
  try {
    const { error } = await supabase
      .from("game_sessions_meeting_app")
      .update({ is_active: false })
      .eq("id", sessionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error ending game session:", error);
    return false;
  }
}

// Force end all active sessions for a user (useful for cleanup)
export async function forceEndAllUserSessions(userId: string) {
  try {
    const { error } = await supabase
      .from("game_sessions_meeting_app")
      .update({ is_active: false })
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .eq("is_active", true);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error force ending user sessions:", error);
    return false;
  }
}
