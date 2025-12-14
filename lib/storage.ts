export interface TimeSlot {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  isUnavailable: boolean;
  note?: string;
}

const STORAGE_KEY = "meeting-app-slots";

export function getTimeSlots(): TimeSlot[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveTimeSlots(slots: TimeSlot[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
}

export function addTimeSlot(slot: Omit<TimeSlot, "id">): TimeSlot {
  const slots = getTimeSlots();
  const newSlot = { ...slot, id: Date.now().toString() };
  slots.push(newSlot);
  saveTimeSlots(slots);
  return newSlot;
}

export function updateTimeSlot(id: string, updates: Partial<TimeSlot>): void {
  const slots = getTimeSlots();
  const index = slots.findIndex((s) => s.id === id);
  if (index !== -1) {
    slots[index] = { ...slots[index], ...updates };
    saveTimeSlots(slots);
  }
}

export function deleteTimeSlot(id: string): void {
  const slots = getTimeSlots();
  saveTimeSlots(slots.filter((s) => s.id !== id));
}

export function getUserSlots(userId: string): TimeSlot[] {
  return getTimeSlots().filter((s) => s.userId === userId);
}

export function getAllSlotsForDate(date: string): TimeSlot[] {
  return getTimeSlots().filter((s) => s.date === date);
}
