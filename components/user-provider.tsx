'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { VoiceChatProvider } from '@/components/voice-chat-provider';
import { GlobalVoiceChatUI } from '@/components/global-voice-chat-ui';

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

  // Solicitar permisos de notificación al cargar
  useEffect(() => {
    if (userId && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [userId]);

  // Calcular el ID y nombre del otro usuario (solo 2 usuarios en la app)
  const partnerId = userId === '1' ? '2' : '1';
  const [partnerUsername, setPartnerUsername] = useState<string>('Tu pareja');

  useEffect(() => {
    if (!userId) return;
    
    const loadPartner = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
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

  return (
    <UserContext.Provider value={{ userId, username, setUser }}>
      <VoiceChatProvider userId={userId}>
        {children}
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
