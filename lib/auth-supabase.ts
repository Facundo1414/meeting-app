import { supabase } from "./supabase";

export interface User {
  id: string;
  username: string;
}

export async function validateCredentials(
  username: string,
  password: string
): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from("users_meeting_app")
      .select("id, username")
      .eq("username", username)
      .eq("password", password)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      username: data.username,
    };
  } catch (error) {
    console.error("Error validating credentials:", error);
    return null;
  }
}
