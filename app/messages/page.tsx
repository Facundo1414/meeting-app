'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { User } from '@/lib/auth-supabase';
import { Message, getMessages, sendMessage } from '@/lib/storage-supabase';
import { supabase } from '@/lib/supabase';

export default function MessagesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(userData));
    
    // Cargar dark mode
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    
    // Cargar mensajes iniciales
    const initMessages = async () => {
      await loadMessages();
      
      // Solo suscribirse después de la carga inicial
      const channel = supabase
        .channel('messages_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages_meeting_app' },
          () => {
            loadMessages();
          }
        )
        .subscribe();

      return channel;
    };

    let channelPromise = initMessages();

    return () => {
      channelPromise.then(channel => {
        if (channel) supabase.removeChannel(channel);
      });
    };
  }, [router]);

  useEffect(() => {
    scrollToBottom();
    
    // Marcar mensajes del otro usuario como leídos
    if (user && messages.length > 0) {
      const unreadMessages = messages
        .filter(m => m.senderId !== user.id && !(m.readBy || []).includes(user.id))
        .map(m => m.id);
      
      if (unreadMessages.length > 0) {
        import('@/lib/storage-supabase').then(({ markMessagesAsRead }) => {
          markMessagesAsRead(unreadMessages, user.id);
        });
      }
    }
  }, [messages, user]);

  const loadMessages = async () => {
    const data = await getMessages();
    setMessages(data);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!user || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    // Agregar mensaje optimista inmediatamente
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: user.id,
      senderUsername: user.username,
      message: messageText,
      timestamp: new Date().toISOString(),
      readBy: [user.id],
    };

    setMessages(prev => [...prev, optimisticMessage]);

    // Enviar al servidor en segundo plano
    const sent = await sendMessage(user.id, user.username, messageText);
    
    // Si falló, remover el mensaje optimista
    if (!sent) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(messageText); // Restaurar el texto
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Cordoba',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/calendar')}
            className="dark:border-gray-600 dark:text-gray-200"
          >
            ← Calendario
          </Button>
          <h1 className="text-lg font-bold dark:text-gray-100">Mensajes</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleDarkMode} title="Cambiar tema">
            {darkMode ? '☀️' : '🌙'}
          </Button>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {user?.username}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-lg p-3 ${
                msg.senderId === user?.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 border dark:border-gray-600 dark:text-gray-100'
              }`}
            >
              <div className="text-xs opacity-70 mb-1">
                {msg.senderUsername}
              </div>
              <div className="break-words">{msg.message}</div>
              <div className="text-xs opacity-70 mt-1 flex items-center gap-1">
                {formatTime(msg.timestamp)}
                {msg.senderId === user?.id && (
                  <span>
                    {(msg.readBy || []).length > 1 ? (
                      <span className="text-blue-400">✓✓</span>
                    ) : (
                      <span className="opacity-50">✓✓</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-4 sticky bottom-0">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe un mensaje..."
            className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
          />
          <Button onClick={handleSend} disabled={!newMessage.trim()}>
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
