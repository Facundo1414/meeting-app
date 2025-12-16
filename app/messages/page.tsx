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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(userData));
    loadMessages();

    // Supabase Realtime subscription
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    const data = await getMessages();
    setMessages(data);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!user || !newMessage.trim()) return;

    await sendMessage(user.id, user.username, newMessage.trim());
    setNewMessage('');
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/calendar')}
          >
            ← Calendario
          </Button>
          <h1 className="text-lg font-bold">Mensajes</h1>
        </div>
        <div className="text-sm text-gray-600">
          {user?.username}
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
                  : 'bg-white border'
              }`}
            >
              <div className="text-xs opacity-70 mb-1">
                {msg.senderUsername}
              </div>
              <div className="break-words">{msg.message}</div>
              <div className="text-xs opacity-70 mt-1">
                {formatTime(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4 sticky bottom-0">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe un mensaje..."
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!newMessage.trim()}>
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
