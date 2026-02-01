'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { VoiceChatProvider } from '@/components/voice-chat-provider';
import { GlobalVoiceChatUI } from '@/components/global-voice-chat-ui';
import { MobileNav } from '@/components/mobile-nav';
import { supabase } from '@/lib/supabase';

interface UserContextType {
  userId: string | null;
  username: string | null;
  setUser: (id: string | null, name: string | null) => void;
}

const UserContext = createContext<UserContextType>({
  userId: null,
  username: null,
  setUser: () => {},
});

export function useUser() {
  return useContext(UserContext);
}

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  // Cargar usuario de localStorage al inicio
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserId(user.id);
        setUsername(user.username);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }

    // Escuchar cambios en localStorage (para cuando se hace login/logout)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        if (e.newValue) {
          try {
            const user = JSON.parse(e.newValue);
            setUserId(user.id);
            setUsername(user.username);
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        } else {
          setUserId(null);
          setUsername(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setUser = (id: string | null, name: string | null) => {
    setUserId(id);
    setUsername(name);
  };

  // Calcular el ID y nombre del otro usuario (solo 2 usuarios en la app)
  const partnerId = userId === '1' ? '2' : '1';
  const [partnerUsername, setPartnerUsername] = useState<string>('Tu pareja');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    
    const loadPartner = async () => {
      try {
        const { data, error } = await supabase
          .from('users_meeting_app')
          .select('username')
          .eq('id', partnerId)
          .single();
        
        if (data && data.username) {
          setPartnerUsername(data.username);
        }
        if (error) {
          console.error('Error loading partner:', error);
        }
      } catch (err) {
        console.error('Error loading partner username:', err);
      }
    };
    loadPartner();
  }, [userId, partnerId]);

  // Contar mensajes no leídos
  useEffect(() => {
    if (!userId) return;

    const checkUnread = async () => {
      try {
        const { data: messages } = await supabase
          .from('messages_meeting_app')
          .select('id, sender_id, created_at')
          .neq('sender_id', userId);
        
        if (!messages) return;

        const lastReadTimestamp = localStorage.getItem(`lastReadMessage_${userId}`);
        
        if (!lastReadTimestamp) {
          setUnreadCount(messages.length);
        } else {
          const unread = messages.filter(
            m => new Date(m.created_at) > new Date(lastReadTimestamp)
          ).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error('Error checking unread:', err);
      }
    };

    checkUnread();

    // Suscribirse a nuevos mensajes
    const channel = supabase
      .channel('messages_nav_count')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages_meeting_app' },
        checkUnread
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <UserContext.Provider value={{ userId, username, setUser }}>
      <VoiceChatProvider userId={userId}>
        {children}
        {/* Navegación móvil global */}
        <MobileNav unreadCount={unreadCount} />
        {/* Chat de voz global - disponible en toda la app */}
        {userId && (
          <GlobalVoiceChatUI 
            partnerId={partnerId} 
            partnerUsername={partnerUsername} 
          />
        )}
      </VoiceChatProvider>
    </UserContext.Provider>
  );
}
