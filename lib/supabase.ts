import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface TimeSlotDB {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_unavailable: boolean;
  note?: string;
  created_at?: string;
}
