import { supabase } from "./supabase";

export type EventType =
  | "unavailable"
  | "plan"
  | "meeting"
  | "tentative"
  | "other";

export interface TimeSlot {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  isUnavailable: boolean;
  eventType?: EventType;
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
      eventType: slot.event_type || "unavailable",
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
        event_type: slot.eventType || "unavailable",
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
      eventType: data.event_type || "unavailable",
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
    if (updates.eventType !== undefined)
      dbUpdates.event_type = updates.eventType;
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

// Messages
export interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  message: string;
  timestamp: string;
  readBy?: string[];
}

// Get all messages
export async function getMessages(): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from("messages_meeting_app")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return [];
    }

    return (data || []).map((msg) => ({
      id: msg.id,
      senderId: msg.sender_id,
      senderUsername: msg.sender_username,
      message: msg.message,
      timestamp: msg.created_at,
      readBy: msg.read_by || [],
    }));
  } catch (error) {
    console.error("Error in getMessages:", error);
    return [];
  }
}

// Send a message
export async function sendMessage(
  senderId: string,
  senderUsername: string,
  message: string
): Promise<Message | null> {
  try {
    const { data, error } = await supabase
      .from("messages_meeting_app")
      .insert({
        sender_id: senderId,
        sender_username: senderUsername,
        message: message,
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      return null;
    }

    return {
      id: data.id,
      senderId: data.sender_id,
      senderUsername: data.sender_username,
      message: data.message,
      timestamp: data.created_at,
      readBy: data.read_by || [],
    };
  } catch (error) {
    console.error("Error in sendMessage:", error);
    return null;
  }
}

// Mark messages as read
export async function markMessagesAsRead(
  messageIds: string[],
  userId: string
): Promise<boolean> {
  try {
    // Obtener los mensajes actuales
    const { data: messages, error: fetchError } = await supabase
      .from("messages_meeting_app")
      .select("id, read_by")
      .in("id", messageIds);

    if (fetchError) {
      console.error("Error fetching messages for read:", fetchError);
      return false;
    }

    // Actualizar cada mensaje
    for (const msg of messages || []) {
      const readBy = msg.read_by || [];
      if (!readBy.includes(userId)) {
        readBy.push(userId);
        await supabase
          .from("messages_meeting_app")
          .update({ read_by: readBy })
          .eq("id", msg.id);
      }
    }

    return true;
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error);
    return false;
  }
}
