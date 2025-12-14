import { supabase } from "./supabase";

export interface TimeSlot {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  isUnavailable: boolean;
  note?: string;
}

// Get all time slots from Supabase
export async function getTimeSlots(): Promise<TimeSlot[]> {
  try {
    const { data, error } = await supabase
      .from("time_slots_meeting_app")
      .select("*")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching slots:", error);
      return [];
    }

    return (data || []).map((slot) => ({
      id: slot.id,
      userId: slot.user_id,
      date: slot.date,
      startTime: slot.start_time,
      endTime: slot.end_time,
      isUnavailable: slot.is_unavailable,
      note: slot.note,
    }));
  } catch (error) {
    console.error("Error in getTimeSlots:", error);
    return [];
  }
}

// Add a new time slot to Supabase
export async function addTimeSlot(
  slot: Omit<TimeSlot, "id">
): Promise<TimeSlot | null> {
  try {
    const { data, error } = await supabase
      .from("time_slots_meeting_app")
      .insert({
        user_id: slot.userId,
        date: slot.date,
        start_time: slot.startTime,
        end_time: slot.endTime,
        is_unavailable: slot.isUnavailable,
        note: slot.note,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding slot:", error);
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      date: data.date,
      startTime: data.start_time,
      endTime: data.end_time,
      isUnavailable: data.is_unavailable,
      note: data.note,
    };
  } catch (error) {
    console.error("Error in addTimeSlot:", error);
    return null;
  }
}

// Update a time slot in Supabase
export async function updateTimeSlot(
  id: string,
  updates: Partial<TimeSlot>
): Promise<boolean> {
  try {
    const dbUpdates: any = {};
    if (updates.userId) dbUpdates.user_id = updates.userId;
    if (updates.date) dbUpdates.date = updates.date;
    if (updates.startTime) dbUpdates.start_time = updates.startTime;
    if (updates.endTime) dbUpdates.end_time = updates.endTime;
    if (updates.isUnavailable !== undefined)
      dbUpdates.is_unavailable = updates.isUnavailable;
    if (updates.note !== undefined) dbUpdates.note = updates.note;

    const { error } = await supabase
      .from("time_slots_meeting_app")
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      console.error("Error updating slot:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in updateTimeSlot:", error);
    return false;
  }
}

// Delete a time slot from Supabase
export async function deleteTimeSlot(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("time_slots_meeting_app")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting slot:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteTimeSlot:", error);
    return false;
  }
}

// Get slots for a specific user
export async function getUserSlots(userId: string): Promise<TimeSlot[]> {
  const allSlots = await getTimeSlots();
  return allSlots.filter((s) => s.userId === userId);
}

// Get all slots for a specific date
export async function getAllSlotsForDate(date: string): Promise<TimeSlot[]> {
  const allSlots = await getTimeSlots();
  return allSlots.filter((s) => s.date === date);
}
