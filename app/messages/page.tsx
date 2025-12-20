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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; message: string; sender: string } | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<any>(null);
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

    // Setup typing indicator channel
    if (user) {
      typingChannelRef.current = supabase.channel('typing')
        .on('broadcast', { event: 'typing' }, (payload: any) => {
          if (payload.payload.userId !== user.id) {
            setIsOtherUserTyping(true);
            // Clear after 3 seconds
            if (typingTimeout) clearTimeout(typingTimeout);
            const timeout = setTimeout(() => setIsOtherUserTyping(false), 3000);
            setTypingTimeout(timeout);
          }
        })
        .subscribe();
    }

    return () => {
      channelPromise.then(channel => {
        if (channel) supabase.removeChannel(channel);
      });
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
      }
      if (typingTimeout) clearTimeout(typingTimeout);
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
    if (!user || (!newMessage.trim() && !selectedFile)) return;

    const messageText = newMessage.trim() || '';
    
    // Handle edit mode
    if (editingMessage) {
      const { editMessage } = await import('@/lib/storage-supabase');
      const success = await editMessage(editingMessage.id, messageText);
      
      if (success) {
        setNewMessage('');
        setEditingMessage(null);
        await loadMessages();
      } else {
        alert('Error al editar el mensaje');
      }
      return;
    }

    setNewMessage('');
    
    let mediaUrl: string | null = null;
    let mediaType: 'image' | 'video' | undefined;

    // Upload file if present
    if (selectedFile) {
      setUploading(true);
      const { uploadMedia } = await import('@/lib/storage-supabase');
      mediaUrl = await uploadMedia(selectedFile, user.id);
      setUploading(false);
      
      if (!mediaUrl) {
        alert('Error al subir el archivo. Intenta de nuevo.');
        return;
      }
      
      mediaType = selectedFile.type.startsWith('image/') ? 'image' : 'video';
      setSelectedFile(null);
      setPreviewUrl(null);
    }

    // Agregar mensaje optimista inmediatamente
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: user.id,
      senderUsername: user.username,
      message: messageText,
      timestamp: new Date().toISOString(),
      readBy: [user.id],
      mediaUrl: mediaUrl || undefined,
      mediaType,
      replyToId: replyTo?.id,
      replyToMessage: replyTo?.message,
      replyToSender: replyTo?.sender,
    };

    setMessages(prev => [...prev, optimisticMessage]);

    // Enviar al servidor en segundo plano
    const sent = await sendMessage(
      user.id, 
      user.username, 
      messageText, 
      mediaUrl || undefined, 
      mediaType,
      replyTo?.id,
      replyTo?.message,
      replyTo?.sender
    );
    
    // Clear reply state
    setReplyTo(null);
    
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

  const handleTyping = () => {
    if (user && typingChannelRef.current) {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user.id }
      });
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if it's an image or video
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Solo se permiten imágenes y videos');
      return;
    }
    
    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('El archivo es muy grande. Máximo 50MB');
      return;
    }
    
    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteMessage = async (messageId: string, mediaUrl?: string) => {
    // No permitir borrar mensajes optimistas (que aún no están en la BD)
    if (messageId.startsWith('temp-')) {
      return;
    }
    
    if (!confirm('¿Seguro que quieres borrar este mensaje?')) return;
    
    const { deleteMessage } = await import('@/lib/storage-supabase');
    const success = await deleteMessage(messageId, mediaUrl);
    
    if (success) {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } else {
      alert('Error al borrar el mensaje');
    }
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      // Trigger file input with camera
      fileInputRef.current.click();
    }
  };

  const handleLongPressStart = (messageId: string) => {
    const timer = setTimeout(() => {
      setShowMenu(messageId);
    }, 500); // 500ms para activar
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    
    const { toggleReaction } = await import('@/lib/storage-supabase');
    await toggleReaction(messageId, user.id, emoji);
    setShowReactions(null);
    setShowMenu(null);
    await loadMessages();
  };

  const handleCopyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowMenu(null);
      // Simple feedback visual
      alert('Texto copiado');
    } catch (err) {
      console.error('Error copiando texto:', err);
      alert('No se pudo copiar el texto');
    }
  };

  const handleReplyTo = (msg: Message) => {
    setReplyTo({
      id: msg.id,
      message: msg.message || '(Media)',
      sender: msg.senderId === '1' ? 'Facu' : 'Bren'
    });
    setShowMenu(null);
    setShowReactions(null);
  };

  const handleEditMessage = (msg: Message) => {
    if (msg.senderId !== user?.id) return;
    setEditingMessage({ id: msg.id, text: msg.message || '' });
    setNewMessage(msg.message || '');
    setShowMenu(null);
    setShowReactions(null);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setNewMessage('');
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/calendar')}
            className="dark:border-gray-600 dark:text-gray-200 px-2 h-8"
          >
            ←
          </Button>
          <h1 className="text-lg font-bold dark:text-gray-100 absolute left-1/2 -translate-x-1/2">Mensajes</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleDarkMode} title="Cambiar tema" className="px-2 h-8">
              {darkMode ? '☀️' : '🌙'}
            </Button>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {user?.username}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex relative ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-lg p-3 relative ${
                msg.senderId === user?.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 border dark:border-gray-600 dark:text-gray-100'
              }`}
              onTouchStart={() => !msg.id.startsWith('temp-') && handleLongPressStart(msg.id)}
              onTouchEnd={handleLongPressEnd}
              onMouseDown={() => !msg.id.startsWith('temp-') && handleLongPressStart(msg.id)}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
            >
                <div className="text-xs opacity-70 mb-1">
                  {msg.senderUsername}
                </div>
              {/* Reply reference */}
              {msg.replyToId && (
                <div className="bg-black/10 dark:bg-white/10 border-l-2 border-white/50 pl-2 py-1 mb-2 rounded text-xs opacity-80">
                  <div className="font-semibold">{msg.replyToSender}</div>
                  <div className="truncate">{msg.replyToMessage}</div>
                </div>
              )}
              {msg.mediaUrl && (
                <div className="mb-2">
                  {msg.mediaType === 'image' ? (
                    <img 
                      src={msg.mediaUrl} 
                      alt="Imagen" 
                      className="max-w-full rounded-lg max-h-80 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <video 
                      src={msg.mediaUrl} 
                      controls 
                      className="max-w-full rounded-lg max-h-80"
                    />
                  )}
                </div>
              )}
              {msg.message && <div className="break-words">{msg.message}</div>}
              <div className="text-xs opacity-70 mt-1 flex items-center gap-1">
                {formatTime(msg.timestamp)}
                {msg.editedAt && <span className="text-xs opacity-60">(editado)</span>}
                {msg.senderId === user?.id && (
                  <span>
                    {(msg.readBy || []).length > 1 ? (
                      <span className="text-green-300" title={`Leído por ${msg.readBy?.length} personas`}>✓✓</span>
                    ) : (
                      <span className="opacity-50" title="Enviado">✓✓</span>
                    )}
                  </span>
                )}
              </div>
              {/* Reacciones del mensaje - compactas en la esquina */}
              {msg.reactions && msg.reactions.length > 0 && (
                <div className={`absolute -bottom-2 ${msg.senderId === user?.id ? 'left-2' : 'right-2'} flex gap-0.5`}>
                  {msg.reactions.map((reaction, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleReaction(msg.id, reaction.emoji)}
                      className="text-xs leading-none bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded-full shadow-md border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                      title={reaction.userId === user?.id ? 'Quitar tu reacción' : `Reacción de ${reaction.userId === '1' ? 'Facu' : 'Bren'}`}
                    >
                      {reaction.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Menú contextual */}
            {showMenu === msg.id && (
              <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 py-1 min-w-[140px] z-50">
                <button
                  onClick={() => setShowReactions(msg.id)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  😊 Reaccionar
                </button>
                <button
                  onClick={() => handleReplyTo(msg)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  ↩️ Responder
                </button>
                <button
                  onClick={() => handleCopyMessage(msg.message)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  📋 Copiar
                </button>
                {msg.senderId === user?.id && (
                  <button
                    onClick={() => handleEditMessage(msg)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    ✏️ Editar
                  </button>
                )}
                <button
                  onClick={() => {
                    handleDeleteMessage(msg.id, msg.mediaUrl);
                    setShowMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  🗑️ Eliminar
                </button>
              </div>
            )}
            {/* Selector de reacciones */}
            {showReactions === msg.id && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white dark:bg-gray-800 rounded-full shadow-2xl border dark:border-gray-700 px-3 py-2 z-50 flex gap-2">
                {['❤️', '👍', '😂', '😮', '😢', '🙏'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(msg.id, emoji)}
                    className="text-2xl hover:scale-125 transition-transform active:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />        
        {/* Indicador de escribiendo */}
        {isOtherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg p-3 max-w-[75%]">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}    </div>

    {/* Overlay para cerrar menú */}
    {(showMenu || showReactions) && (
      <div 
        className="fixed inset-0 z-40" 
        onClick={() => {
          setShowMenu(null);
          setShowReactions(null);
        }}
      />
    )}

      {/* Input */}
      <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-4 sticky bottom-0">
        {/* Reply preview */}
        {replyTo && (
          <div className="mb-2 bg-gray-100 dark:bg-gray-700 border-l-4 border-blue-500 p-2 rounded flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Respondiendo a {replyTo.sender}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 truncate">{replyTo.message}</div>
            </div>
            <button
              onClick={cancelReply}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-2"
            >
              ✕
            </button>
          </div>
        )}
        
        {/* Edit preview */}
        {editingMessage && (
          <div className="mb-2 bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-2 rounded flex justify-between items-center">
            <div className="flex-1">
              <div className="text-xs text-yellow-700 dark:text-yellow-400 font-semibold">✏️ Editando mensaje</div>
            </div>
            <button
              onClick={cancelEdit}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {previewUrl && (
          <div className="mb-3 relative inline-block">
            {selectedFile?.type.startsWith('image/') ? (
              <img src={previewUrl} alt="Preview" className="max-h-32 rounded-lg" />
            ) : (
              <video src={previewUrl} className="max-h-32 rounded-lg" />
            )}
            <button
              onClick={removeSelectedFile}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCameraCapture}
            disabled={uploading}
            className="dark:border-gray-600 dark:text-gray-200"
            title="Tomar foto o video"
          >
            📷
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute('capture');
                fileInputRef.current.click();
                setTimeout(() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('capture', 'environment');
                  }
                }, 100);
              }
            }}
            disabled={uploading}
            className="dark:border-gray-600 dark:text-gray-200"
            title="Adjuntar desde galería"
          >
            📎
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            placeholder={
              editingMessage 
                ? "Editar mensaje..." 
                : selectedFile 
                  ? "Mensaje opcional..." 
                  : "Escribe un mensaje..."
            }
            className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
            disabled={uploading}
          />
          <Button onClick={handleSend} disabled={(!newMessage.trim() && !selectedFile) || uploading}>
            {uploading ? '📤' : editingMessage ? '💾' : 'Enviar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
