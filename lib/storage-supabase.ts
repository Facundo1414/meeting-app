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
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio";
  reactions?: Array<{ userId: string; emoji: string }>;
  replyToId?: string;
  editedAt?: string;
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
      mediaUrl: msg.media_url,
      mediaType: msg.media_type,
      reactions: msg.reactions || [],
      replyToId: msg.reply_to_id,
      editedAt: msg.edited_at,
    }));
  } catch (error) {
    console.error("Error in getMessages:", error);
    return [];
  }
}

// Get all messages with media (for gallery)
export async function getMediaMessages(): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from("messages_meeting_app")
      .select("*")
      .not("media_url", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching media messages:", error);
      return [];
    }

    return (data || []).map((msg) => ({
      id: msg.id,
      senderId: msg.sender_id,
      senderUsername: msg.sender_username,
      message: msg.message,
      timestamp: msg.created_at,
      readBy: msg.read_by || [],
      mediaUrl: msg.media_url,
      mediaType: msg.media_type,
      reactions: msg.reactions || [],
      replyToId: msg.reply_to_id,
      editedAt: msg.edited_at,
    }));
  } catch (error) {
    console.error("Error in getMediaMessages:", error);
    return [];
  }
}

// Get messages with pagination (for loading older messages)
export async function getMessagesPaginated(
  limit: number = 50,
  beforeTimestamp?: string
): Promise<{ messages: Message[]; hasMore: boolean }> {
  try {
    let query = supabase
      .from("messages_meeting_app")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit + 1); // Fetch one extra to check if there are more

    if (beforeTimestamp) {
      query = query.lt("created_at", beforeTimestamp);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching paginated messages:", error);
      return { messages: [], hasMore: false };
    }

    const hasMore = (data || []).length > limit;
    const messages = (data || [])
      .slice(0, limit)
      .map((msg) => ({
        id: msg.id,
        senderId: msg.sender_id,
        senderUsername: msg.sender_username,
        message: msg.message,
        timestamp: msg.created_at,
        readBy: msg.read_by || [],
        mediaUrl: msg.media_url,
        mediaType: msg.media_type,
        reactions: msg.reactions || [],
        replyToId: msg.reply_to_id,
        editedAt: msg.edited_at,
      }))
      .reverse(); // Reverse to get chronological order

    return { messages, hasMore };
  } catch (error) {
    console.error("Error in getMessagesPaginated:", error);
    return { messages: [], hasMore: false };
  }
}

// Get new messages after a specific timestamp (for real-time updates without losing history)
export async function getNewMessages(
  afterTimestamp: string
): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from("messages_meeting_app")
      .select("*")
      .gt("created_at", afterTimestamp)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching new messages:", error);
      return [];
    }

    return (data || []).map((msg) => ({
      id: msg.id,
      senderId: msg.sender_id,
      senderUsername: msg.sender_username,
      message: msg.message,
      timestamp: msg.created_at,
      readBy: msg.read_by || [],
      mediaUrl: msg.media_url,
      mediaType: msg.media_type,
      reactions: msg.reactions || [],
      replyToId: msg.reply_to_id,
      editedAt: msg.edited_at,
    }));
  } catch (error) {
    console.error("Error in getNewMessages:", error);
    return [];
  }
}

// Get a single message by ID (for updates)
export async function getMessageById(
  messageId: string
): Promise<Message | null> {
  try {
    const { data, error } = await supabase
      .from("messages_meeting_app")
      .select("*")
      .eq("id", messageId)
      .single();

    if (error) {
      console.error("Error fetching message:", error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      senderId: data.sender_id,
      senderUsername: data.sender_username,
      message: data.message,
      timestamp: data.created_at,
      readBy: data.read_by || [],
      mediaUrl: data.media_url,
      mediaType: data.media_type,
      reactions: data.reactions || [],
      replyToId: data.reply_to_id,
      editedAt: data.edited_at,
    };
  } catch (error) {
    console.error("Error in getMessageById:", error);
    return null;
  }
}

// Send a message
export async function sendMessage(
  senderId: string,
  senderUsername: string,
  message: string,
  mediaUrl?: string,
  mediaType?: "image" | "video" | "audio",
  replyToId?: string
): Promise<Message | null> {
  try {
    console.log("Sending message:", {
      senderId,
      senderUsername,
      message,
      mediaUrl,
      mediaType,
      replyToId,
    });

    // Construir el objeto solo con campos que existen
    const insertData: any = {
      sender_id: senderId,
      sender_username: senderUsername,
      message: message,
    };

    // Solo agregar campos opcionales si tienen valor
    if (mediaUrl) insertData.media_url = mediaUrl;
    if (mediaType) insertData.media_type = mediaType;
    if (replyToId) insertData.reply_to_id = replyToId;

    const { data, error } = await supabase
      .from("messages_meeting_app")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error hint:", error.hint);
      console.error("Error details:", error.details);
      console.error("Full error:", JSON.stringify(error, null, 2));
      return null;
    }

    console.log("Message sent successfully:", data);

    return {
      id: data.id,
      senderId: data.sender_id,
      senderUsername: data.sender_username,
      message: data.message,
      timestamp: data.created_at,
      readBy: data.read_by || [],
      mediaUrl: data.media_url,
      mediaType: data.media_type,
      replyToId: data.reply_to_id,
    };
  } catch (error) {
    console.error("Error in sendMessage:", error);
    console.error("Error type:", typeof error);
    console.error("Error stringified:", JSON.stringify(error, null, 2));
    return null;
  }
}

// Edit a message
export async function editMessage(
  messageId: string,
  newText: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("messages_meeting_app")
      .update({
        message: newText,
        edited_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    if (error) {
      console.error("Error editing message:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in editMessage:", error);
    return false;
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

// Compress image before upload
export async function compressImage(
  file: File,
  maxSizeMB: number = 1
): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Max dimensions
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1920;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to blob with quality adjustment
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.8 // Quality 80%
        );
      };
    };
  });
}

// Upload file to Supabase Storage
export async function uploadMedia(
  file: File,
  userId: string
): Promise<string | null> {
  try {
    console.log("Starting upload:", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      userId,
    });

    // Compress only if it's an image
    let fileToUpload = file;
    if (file.type.startsWith("image/")) {
      fileToUpload = await compressImage(file);
      console.log("Image compressed:", {
        originalSize: file.size,
        compressedSize: fileToUpload.size,
      });
    }

    // Get proper file extension from file name or mime type
    let fileExt = file.name.split(".").pop();

    // Fallback: extract extension from mime type if not in filename
    if (!fileExt || fileExt === file.name) {
      const mimeType = file.type;
      if (mimeType.includes("/")) {
        fileExt = mimeType.split("/")[1].split(";")[0];
      } else {
        fileExt = "bin"; // generic binary fallback
      }
    }

    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    console.log("Uploading to:", fileName);

    const { data, error } = await supabase.storage
      .from("meeting-app-media")
      .upload(fileName, fileToUpload, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type, // Explicitly set content type
      });

    if (error) {
      console.error("Supabase storage error:", error);
      return null;
    }

    console.log("Upload successful:", data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("meeting-app-media")
      .getPublicUrl(fileName);

    console.log("Public URL generated:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Error in uploadMedia:", error);
    return null;
  }
}

// Delete message and its media file
export async function deleteMessage(
  messageId: string,
  mediaUrl?: string
): Promise<boolean> {
  try {
    // Delete media file from storage if exists
    if (mediaUrl) {
      const urlParts = mediaUrl.split("/");
      const fileName = urlParts.slice(-2).join("/"); // Get "userId/timestamp.ext"

      await supabase.storage.from("meeting-app-media").remove([fileName]);
    }

    // Delete message from database
    const { error } = await supabase
      .from("messages_meeting_app")
      .delete()
      .eq("id", messageId);

    if (error) {
      console.error("Error deleting message:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    return false;
  }
}

// Add or toggle reaction to message
export async function toggleReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<boolean> {
  try {
    // Get current message
    const { data: message, error: fetchError } = await supabase
      .from("messages_meeting_app")
      .select("reactions")
      .eq("id", messageId)
      .single();

    if (fetchError) {
      console.error("Error fetching message for reaction:", fetchError);
      return false;
    }

    let reactions = message.reactions || [];

    // Check if user already reacted with this emoji
    const existingIndex = reactions.findIndex(
      (r: any) => r.userId === userId && r.emoji === emoji
    );

    if (existingIndex >= 0) {
      // Remove reaction
      reactions.splice(existingIndex, 1);
    } else {
      // Remove any other reaction from this user first
      reactions = reactions.filter((r: any) => r.userId !== userId);
      // Add new reaction
      reactions.push({ userId, emoji });
    }

    // Update message
    const { error: updateError } = await supabase
      .from("messages_meeting_app")
      .update({ reactions })
      .eq("id", messageId);

    if (updateError) {
      console.error("Error updating reaction:", updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in toggleReaction:", error);
    return false;
  }
}
// Update user's last seen timestamp
export async function updateLastSeen(
  userId: string,
  username?: string
): Promise<boolean> {
  try {
    // Primero intentar actualizar
    const { data, error: updateError } = await supabase
      .from("users_meeting_app")
      .update({ last_seen: new Date().toISOString() })
      .eq("id", userId)
      .select();

    if (updateError) {
      console.error("Error updating last seen:", updateError);
      return false;
    }

    // Si no se actualizó ningún registro y tenemos username, crear el registro
    if ((!data || data.length === 0) && username) {
      const { error: insertError } = await supabase
        .from("users_meeting_app")
        .insert({
          id: userId,
          username: username,
          last_seen: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Error inserting user for last seen:", insertError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error in updateLastSeen:", error);
    return false;
  }
}

// Get user's last seen timestamp
export async function getLastSeen(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("users_meeting_app")
      .select("last_seen")
      .eq("id", userId)
      .single();

    if (error) {
      // Si no hay datos aún, no es un error crítico
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching last seen:", error);
      return null;
    }

    return data?.last_seen || null;
  } catch (error) {
    console.error("Error in getLastSeen:", error);
    return null;
  }
}
