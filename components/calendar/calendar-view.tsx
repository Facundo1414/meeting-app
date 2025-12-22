'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { User } from '@/lib/auth-supabase';
import { TimeSlot, getTimeSlots, addTimeSlot, deleteTimeSlot } from '@/lib/storage-supabase';
import { supabase } from '@/lib/supabase';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { useSwipeNavigation } from '@/hooks/use-swipe-navigation';
import { SyncIndicator } from '@/components/sync-indicator';
import { CalendarHeader } from './calendar-header';
import { SlotCard } from './slot-card';

const TIMEZONE = 'America/Argentina/Cordoba';

export function CalendarView() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [startHour, setStartHour] = useState<string>('9');
  const [endHour, setEndHour] = useState<string>('18');
  const [note, setNote] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [eventType, setEventType] = useState<'unavailable' | 'plan' | 'meeting' | 'tentative' | 'other'>('unavailable');
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);
  const router = useRouter();
  const isChangingDate = useRef(false);

  // Swipe navigation
  useSwipeNavigation({
    onSwipeLeft: () => changeDate(1),
    onSwipeRight: () => {
      if (!isBeforeToday()) changeDate(-1);
    },
  });

  const loadSlots = useCallback(async () => {
    const cached = localStorage.getItem('cachedSlots');
    if (cached) {
      try {
        setSlots(JSON.parse(cached));
      } catch (e) {}
    }
    
    try {
      setIsSyncing(true);
      const data = await getTimeSlots();
      setSlots(data);
      localStorage.setItem('cachedSlots', JSON.stringify(data));
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }

    const currentUser: User = JSON.parse(userData);
    setUser(currentUser);
    
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
    
    loadSlots();

    const channel = supabase
      .channel('time_slots_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_slots_meeting_app' },
        () => {
          loadSlots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, loadSlots]);

  const checkUnreadMessages = useCallback(async () => {
    if (!user) return;
    
    const { getMessages } = await import('@/lib/storage-supabase');
    const messages = await getMessages();
    const lastReadTimestamp = localStorage.getItem(`lastReadMessage_${user.id}`);
    
    if (!lastReadTimestamp) {
      const unread = messages.filter(m => m.senderId !== user.id).length;
      setUnreadCount(unread);
    } else {
      const unread = messages.filter(
        m => m.senderId !== user.id && new Date(m.timestamp) > new Date(lastReadTimestamp)
      ).length;
      setUnreadCount(unread);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    checkUnreadMessages();

    const messagesChannel = supabase
      .channel('messages_count')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages_meeting_app' },
        checkUnreadMessages
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [user, checkUnreadMessages]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showProfileMenu && !target.closest('.profile-menu-container')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showProfileMenu]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  const toggleDarkMode = useCallback(() => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('es-AR', {
      timeZone: TIMEZONE,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const getDateString = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const changeDate = (days: number) => {
    if (isChangingDate.current) return;
    isChangingDate.current = true;
    
    const newDate = new Date(selectedDate.getTime());
    newDate.setDate(newDate.getDate() + days);
    newDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (newDate >= today) {
      setSelectedDate(newDate);
    }
    
    setTimeout(() => {
      isChangingDate.current = false;
    }, 200);
  };

  const isBeforeToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    const yesterday = new Date(selected);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday < today;
  };

  const getUserSlots = useCallback((userId: string) => {
    const dateStr = getDateString(selectedDate);
    return slots.filter(s => s.userId === userId && s.date === dateStr);
  }, [slots, selectedDate, getDateString]);

  const saveSlot = async () => {
    if (!user) return;

    const start = parseInt(startHour);
    const end = parseInt(endHour);

    if (start >= end) return;

    const dateStr = getDateString(selectedDate);
    
    try {
      setIsSaving(true);
      
      if (editingSlotId) {
        const { updateTimeSlot } = await import('@/lib/storage-supabase');
        await updateTimeSlot(editingSlotId, {
          startTime: start.toString(),
          endTime: end.toString(),
          isUnavailable: eventType === 'unavailable',
          eventType: eventType,
          note: note || undefined,
        });
      } else {
        await addTimeSlot({
          userId: user.id,
          date: dateStr,
          startTime: start.toString(),
          endTime: end.toString(),
          isUnavailable: eventType === 'unavailable',
          eventType: eventType,
          note: note || undefined,
        });
      }

      setStartHour('9');
      setEndHour('18');
      setNote('');
      setEventType('unavailable');
      setShowForm(false);
      setEditingSlotId(null);
      await loadSlots();
    } finally {
      setIsSaving(false);
    }
  };

  const removeSlot = async (id: string) => {
    await deleteTimeSlot(id);
    await loadSlots();
    setDeleteSlotId(null);
  };

  const startEditSlot = (slot: TimeSlot) => {
    setEditingSlotId(slot.id);
    setStartHour(slot.startTime);
    setEndHour(slot.endTime);
    setNote(slot.note || '');
    setEventType(slot.eventType || 'unavailable');
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingSlotId(null);
    setStartHour('9');
    setEndHour('18');
    setNote('');
    setEventType('unavailable');
    setShowForm(false);
  };

  const otherUserId = user?.id === '1' ? '2' : '1';
  const mySlots = useMemo(() => user ? getUserSlots(user.id) : [], [getUserSlots, user]);
  const otherSlots = useMemo(() => user ? getUserSlots(otherUserId) : [], [getUserSlots, otherUserId, user]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 pb-20 overflow-auto">
      <div className="h-full overflow-auto">
        <SyncIndicator isSyncing={isSyncing} />
        
        <CalendarHeader
          user={user}
          darkMode={darkMode}
          unreadCount={unreadCount}
          showProfileMenu={showProfileMenu}
          selectedDate={selectedDate}
          onToggleDarkMode={toggleDarkMode}
          onToggleProfileMenu={() => setShowProfileMenu(!showProfileMenu)}
          onLogout={handleLogout}
          onChangeDate={changeDate}
          onMessagesClick={() => {
            localStorage.setItem(`lastReadMessage_${user.id}`, new Date().toISOString());
            setUnreadCount(0);
            router.push('/messages');
          }}
          onWeekClick={() => router.push('/week')}
          formatDate={formatDate}
          isBeforeToday={isBeforeToday}
        />

        <div className="p-4 space-y-4">
          {/* Tu disponibilidad */}
          <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg dark:text-gray-100">Tu disponibilidad</CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => setShowForm(true)}
                  variant="default"
                >
                  + Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {mySlots.length === 0 ? (
                <EmptyState type="calendar" />
              ) : (
                <motion.div 
                  className="space-y-2"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: { transition: { staggerChildren: 0.05 } }
                  }}
                >
                  {mySlots.map((slot) => (
                    <SlotCard
                      key={slot.id}
                      slot={slot}
                      isOwn={true}
                      onEdit={() => startEditSlot(slot)}
                      onDelete={() => setDeleteSlotId(slot.id)}
                    />
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Disponibilidad del otro usuario */}
          <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg dark:text-gray-100">Eventos del otro usuario</CardTitle>
            </CardHeader>
            <CardContent>
              {otherSlots.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-green-700 dark:text-green-400 font-medium">Sin eventos</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No tiene eventos para este día</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {otherSlots.map((slot) => (
                    <SlotCard key={slot.id} slot={slot} isOwn={false} />
                  ))}
                  {(() => {
                    const totalBusyHours = otherSlots.reduce((total, slot) => {
                      return total + (parseInt(slot.endTime) - parseInt(slot.startTime));
                    }, 0);
                    
                    if (totalBusyHours < 24) {
                      return (
                        <div className="text-center mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg border-2 border-green-200 dark:border-green-800">
                          <p className="text-sm text-green-700 dark:text-green-300">El resto del día está disponible ✅</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="text-center mt-4 p-3 bg-red-50 dark:bg-red-950 rounded-lg border-2 border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-700 dark:text-red-300">❌ No disponible todo el día</p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Sheet para agregar/editar eventos */}
        <BottomSheet
          isOpen={showForm}
          onClose={cancelEdit}
          title={editingSlotId ? 'Editar Evento' : 'Nuevo Evento'}
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de evento</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={eventType === 'unavailable' ? 'default' : 'outline'}
                  className={eventType === 'unavailable' ? 'bg-red-500 hover:bg-red-600' : ''}
                  onClick={() => setEventType('unavailable')}
                  size="sm"
                >
                  🔴 Ocupado
                </Button>
                <Button
                  type="button"
                  variant={eventType === 'plan' ? 'default' : 'outline'}
                  className={eventType === 'plan' ? 'bg-green-500 hover:bg-green-600' : ''}
                  onClick={() => setEventType('plan')}
                  size="sm"
                >
                  🟢 Plan
                </Button>
                <Button
                  type="button"
                  variant={eventType === 'meeting' ? 'default' : 'outline'}
                  className={eventType === 'meeting' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                  onClick={() => setEventType('meeting')}
                  size="sm"
                >
                  🔵 Reunión
                </Button>
                <Button
                  type="button"
                  variant={eventType === 'tentative' ? 'default' : 'outline'}
                  className={eventType === 'tentative' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                  onClick={() => setEventType('tentative')}
                  size="sm"
                >
                  🟡 Charlemos
                </Button>
              </div>
            </div>

            <Button 
              onClick={() => {
                setStartHour('0');
                setEndHour('24');
              }}
              variant="outline"
              className="w-full border-dashed"
              type="button"
            >
              🕐 Todo el día (00:00 - 24:00)
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Desde</label>
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="w-full"
                  placeholder="Ej: 9"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {startHour ? `${startHour.padStart(2, '0')}:00` : 'Hora'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Hasta</label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="w-full"
                  placeholder="Ej: 18"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {endHour ? `${endHour.padStart(2, '0')}:00` : 'Hora'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => { setStartHour('9'); setEndHour('13'); }}
                variant="outline"
                size="sm"
                type="button"
                className="text-xs"
              >
                Mañana
              </Button>
              <Button
                onClick={() => { setStartHour('13'); setEndHour('18'); }}
                variant="outline"
                size="sm"
                type="button"
                className="text-xs"
              >
                Tarde
              </Button>
              <Button
                onClick={() => { setStartHour('18'); setEndHour('22'); }}
                variant="outline"
                size="sm"
                type="button"
                className="text-xs"
              >
                Noche
              </Button>
            </div>

            <Input
              placeholder="Nota opcional..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <LoadingButton 
              onClick={saveSlot} 
              className="w-full" 
              size="lg"
              isLoading={isSaving}
              loadingText="Guardando..."
            >
              {editingSlotId ? '✏️ Actualizar Evento' : 
               (eventType === 'unavailable' ? '🔴 Guardar Ocupado' : 
                eventType === 'plan' ? '🟢 Guardar Plan' : 
                eventType === 'meeting' ? '🔵 Guardar Reunión' : 
                eventType === 'tentative' ? '🟡 Guardar Charlemos' : 'Guardar Evento')}
            </LoadingButton>
          </div>
        </BottomSheet>

        <ConfirmDialog
          isOpen={!!deleteSlotId}
          onClose={() => setDeleteSlotId(null)}
          onConfirm={() => deleteSlotId && removeSlot(deleteSlotId)}
          title="Eliminar Evento"
          message="¿Estás seguro de que quieres eliminar este evento? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="danger"
        />
      </div>
    </div>
  );
}
