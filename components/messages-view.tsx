'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User } from '@/lib/auth-supabase';
import { 
  Message, 
  getMessages, 
  getMessagesPaginated,
  getNewMessages,
  getMessageById,
  sendMessage, 
  updateLastSeen, 
  getLastSeen,
  editMessage,
  markMessagesAsRead,
  deleteMessage,
  toggleReaction,
  uploadMedia
} from '@/lib/storage-supabase';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { AudioPlayer as SmartAudioPlayer } from '@/components/audio-player';
import { getOptimizedImageUrl } from '@/lib/image-utils';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function MessagesView() {
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
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(null);
  const [deleteMessageData, setDeleteMessageData] = useState<{id: string; mediaUrl?: string} | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; time: number; messageId: string } | null>(null);
  const [lastTap, setLastTap] = useState<{ messageId: string; time: number } | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLoadingOlderRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<any>(null);
  const lastTypingBroadcast = useRef<number>(0);
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
          { event: 'INSERT', schema: 'public', table: 'messages_meeting_app' },
          async (payload) => {
            // Agregar nuevo mensaje sin perder historial
            const newMsg = payload.new as any;
            const formattedMsg: Message = {
              id: newMsg.id,
              senderId: newMsg.sender_id,
              senderUsername: newMsg.sender_username,
              message: newMsg.message,
              timestamp: newMsg.created_at,
              readBy: newMsg.read_by || [],
              mediaUrl: newMsg.media_url,
              mediaType: newMsg.media_type,
              reactions: newMsg.reactions || [],
              replyToId: newMsg.reply_to_id,
              editedAt: newMsg.edited_at,
            };
            
            setMessages(prev => {
              // Evitar duplicados - verificar si ya existe el mensaje real
              if (prev.some(m => m.id === formattedMsg.id)) {
                return prev;
              }
              
              // Buscar mensaje optimista del mismo usuario con contenido similar
              // Comparar mensaje, sender, mediaUrl y replyToId para mayor precisión
              const optimisticIndex = prev.findIndex(m => 
                m.id.startsWith('temp-') && 
                m.senderId === formattedMsg.senderId && 
                m.message === formattedMsg.message &&
                m.mediaUrl === formattedMsg.mediaUrl &&
                m.replyToId === formattedMsg.replyToId
              );
              
              if (optimisticIndex !== -1) {
                // Reemplazar mensaje optimista con el real
                const newMessages = [...prev];
                newMessages[optimisticIndex] = formattedMsg;
                return newMessages;
              }
              
              // Si no hay mensaje optimista pero el timestamp es muy reciente (< 5 segundos),
              // buscar uno del mismo usuario que podría coincidir
              const now = new Date();
              const msgTime = new Date(formattedMsg.timestamp);
              const timeDiff = now.getTime() - msgTime.getTime();
              
              if (timeDiff < 5000) {
                const recentOptimistic = prev.findIndex(m => 
                  m.id.startsWith('temp-') && 
                  m.senderId === formattedMsg.senderId
                );
                
                if (recentOptimistic !== -1) {
                  const newMessages = [...prev];
                  newMessages[recentOptimistic] = formattedMsg;
                  return newMessages;
                }
              }
              
              return [...prev, formattedMsg];
            });
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages_meeting_app' },
          async (payload) => {
            // Actualizar mensaje existente
            const updatedMsg = payload.new as any;
            const formattedMsg: Message = {
              id: updatedMsg.id,
              senderId: updatedMsg.sender_id,
              senderUsername: updatedMsg.sender_username,
              message: updatedMsg.message,
              timestamp: updatedMsg.created_at,
              readBy: updatedMsg.read_by || [],
              mediaUrl: updatedMsg.media_url,
              mediaType: updatedMsg.media_type,
              reactions: updatedMsg.reactions || [],
              replyToId: updatedMsg.reply_to_id,
              editedAt: updatedMsg.edited_at,
            };
            
            setMessages(prev => prev.map(m => m.id === formattedMsg.id ? formattedMsg : m));
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'messages_meeting_app' },
          (payload) => {
            // Eliminar mensaje
            const deletedId = (payload.old as any).id;
            setMessages(prev => prev.filter(m => m.id !== deletedId));
          }
        )
        .subscribe();

      return channel;
    };

    let channelPromise = initMessages();

    // Setup typing indicator channel
    const currentUser = JSON.parse(userData);
    if (currentUser) {
      // Actualizar last_seen inmediatamente al entrar
      updateLastSeen(currentUser.id, currentUser.username);
      
      typingChannelRef.current = supabase.channel('typing')
        .on('broadcast', { event: 'typing' }, (payload: any) => {
          if (payload.payload.userId !== currentUser.id) {
            setIsOtherUserTyping(true);
            // Clear after 3 seconds
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setIsOtherUserTyping(false), 3000);
          }
        })
        .subscribe();

      // Setup presence channel for online status
      const otherUserId = currentUser.id === '1' ? '2' : '1';
      
      // Load initial last seen from Supabase
      getLastSeen(otherUserId).then(lastSeen => {
        if (lastSeen) {
          setOtherUserLastSeen(lastSeen);
        }
      });
      
      presenceChannelRef.current = supabase.channel('presence')
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannelRef.current.presenceState();
          const otherUserPresent = Object.values(state).some((presences: any) => 
            presences.some((p: any) => p.userId === otherUserId)
          );
          setOtherUserOnline(otherUserPresent);
          
          if (!otherUserPresent) {
            // Get last seen from Supabase
            getLastSeen(otherUserId).then(lastSeen => {
              if (lastSeen) {
                setOtherUserLastSeen(lastSeen);
              }
            });
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannelRef.current.track({
              userId: currentUser.id,
              online_at: new Date().toISOString(),
            });
          }
        });
    }

    return () => {
      // Update last seen in Supabase before leaving
      if (currentUser) {
        updateLastSeen(currentUser.id, currentUser.username);
      }
      
      channelPromise.then(channel => {
        if (channel) supabase.removeChannel(channel);
      });
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
      }
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, [router]);

  // Update lastSeen periodically while user is active and on page unload
  useEffect(() => {
    if (!user) return;

    // Update lastSeen every 30 seconds while on the page
    const interval = setInterval(() => {
      updateLastSeen(user.id, user.username);
    }, 30000);

    // Update lastSeen when user leaves the page
    const handleBeforeUnload = () => {
      updateLastSeen(user.id, user.username);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updateLastSeen(user.id, user.username);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  useEffect(() => {
    // No hacer scroll si estamos cargando mensajes antiguos
    if (isLoadingOlderRef.current) {
      return;
    }
    
    // Solo hacer scroll automático en carga inicial o si el usuario está cerca del fondo
    if (isInitialLoad) {
      // Scroll instantáneo en la carga inicial
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      setIsInitialLoad(false);
    } else if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages, isInitialLoad, isNearBottom]);

  // Separar el marcado de mensajes como leídos en su propio efecto
  useEffect(() => {
    if (!user || messages.length === 0 || isLoadingOlderRef.current) return;
    
    const unreadMessages = messages
      .filter(m => m.senderId !== user.id && !(m.readBy || []).includes(user.id) && !m.id.startsWith('temp-'))
      .map(m => m.id);
    
    if (unreadMessages.length > 0) {
      markMessagesAsRead(unreadMessages, user.id);
    }
  }, [messages, user]);

  // Reset textarea height cuando se limpia el mensaje
  useEffect(() => {
    if (newMessage === '' && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [newMessage]);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showAttachmentMenu && !target.closest('.relative')) {
        setShowAttachmentMenu(false);
      }
      if (showProfileMenu && !target.closest('.profile-menu-container')) {
        setShowProfileMenu(false);
      }
      if (showMenu && !target.closest('[data-message-options]')) {
        setShowMenu(null);
      }
      if (showReactions && !target.closest('[data-reactions-picker]')) {
        setShowReactions(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showAttachmentMenu, showProfileMenu, showMenu, showReactions]);

  const loadMessages = async () => {
    const { messages: data, hasMore } = await getMessagesPaginated(50);
    setMessages(data);
    setHasMoreMessages(hasMore);
  };

  const loadOlderMessages = useCallback(async () => {
    if (isLoadingMore || !hasMoreMessages || messages.length === 0) return;
    
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // Marcar que estamos cargando mensajes antiguos para evitar scroll al fondo
    isLoadingOlderRef.current = true;
    setIsLoadingMore(true);
    
    const oldestMessage = messages[0];
    const previousScrollHeight = container.scrollHeight;
    const previousScrollTop = container.scrollTop;
    
    try {
      const { messages: olderMessages, hasMore } = await getMessagesPaginated(
        30,
        oldestMessage.timestamp
      );
      
      if (olderMessages.length > 0) {
        setMessages(prev => [...olderMessages, ...prev]);
        setHasMoreMessages(hasMore);
        
        // Mantener la posición del scroll después de agregar mensajes arriba
        // Usar requestAnimationFrame con múltiples frames para asegurar que el DOM se haya actualizado completamente
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight;
              const heightDiff = newScrollHeight - previousScrollHeight;
              // Ajustar scroll manteniendo la posición visual
              container.scrollTop = previousScrollTop + heightDiff;
            }
            // Esperar un poco más antes de desactivar el flag
            setTimeout(() => {
              isLoadingOlderRef.current = false;
            }, 100);
          });
        });
      } else {
        setHasMoreMessages(false);
        isLoadingOlderRef.current = false;
      }
    } catch (error) {
      console.error('Error loading older messages:', error);
      isLoadingOlderRef.current = false;
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreMessages, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  // Detectar si el usuario está cerca del fondo del chat y cargar más al llegar arriba
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    // Ignorar eventos de scroll mientras se están cargando mensajes antiguos
    if (isLoadingOlderRef.current) {
      return;
    }
    
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    setIsNearBottom(isAtBottom);
    
    // Cargar más mensajes cuando el usuario hace scroll cerca del top (estilo WhatsApp)
    if (element.scrollTop < 150 && !isLoadingMore && hasMoreMessages) {
      loadOlderMessages();
    }
  }, [isLoadingMore, hasMoreMessages, loadOlderMessages]);

  const handleSend = async () => {
    if (!user || (!newMessage.trim() && !selectedFile)) return;

    const messageText = newMessage.trim() || '';
    
    // Handle edit mode
    if (editingMessage) {
      const success = await editMessage(editingMessage.id, messageText);
      
      if (success) {
        setNewMessage('');
        setEditingMessage(null);
        toast.success('Mensaje editado');
        await loadMessages();
      } else {
        toast.error('Error al editar el mensaje');
      }
      return;
    }

    setNewMessage('');
    
    let mediaUrl: string | null = null;
    let mediaType: 'image' | 'video' | 'audio' | undefined;

    // Upload file if present
    if (selectedFile) {
      setUploading(true);
      mediaUrl = await uploadMedia(selectedFile, user.id);
      setUploading(false);
      
      if (!mediaUrl) {
        toast.error('Error al subir el archivo');
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
    };

    setMessages(prev => [...prev, optimisticMessage]);
    
    // Forzar scroll cuando yo envío un mensaje
    setIsNearBottom(true);
    setTimeout(() => scrollToBottom(), 100);

    // Enviar al servidor en segundo plano
    try {
      const sent = await sendMessage(
        user.id, 
        user.username, 
        messageText, 
        mediaUrl || undefined, 
        mediaType,
        replyTo?.id
      );
      
      // Clear reply state
      setReplyTo(null);
      
      // Si falló, remover el mensaje optimista
      if (!sent) {
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        setNewMessage(messageText); // Restaurar el texto
        toast.error('Error al enviar mensaje. Verifica tu conexión.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(messageText); // Restaurar el texto
      toast.error('Error inesperado al enviar mensaje');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Enter sin Shift: enviar mensaje
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Shift + Enter: nueva línea (comportamiento por defecto)
    // Escape: cancelar edición o respuesta
    if (e.key === 'Escape') {
      if (editingMessage) {
        setEditingMessage(null);
        setNewMessage('');
      }
      if (replyTo) {
        setReplyTo(null);
      }
      if (selectedFile) {
        removeSelectedFile();
      }
    }
  };

  // Debounced typing indicator - solo envía cada 2 segundos máximo
  const handleTyping = useCallback(() => {
    const now = Date.now();
    // Solo enviar si pasaron más de 2 segundos desde el último broadcast
    if (user && typingChannelRef.current && now - lastTypingBroadcast.current > 2000) {
      lastTypingBroadcast.current = now;
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user.id }
      });
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
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

  // Swipe right para responder
  const handleTouchStart = (e: React.TouchEvent, msg: Message) => {
    setTouchStart({
      x: e.touches[0].clientX,
      time: Date.now(),
      messageId: msg.id
    });
  };

  const handleTouchEnd = (e: React.TouchEvent, msg: Message) => {
    if (!touchStart || touchStart.messageId !== msg.id) return;

    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchEnd - touchStart.x;
    const timeDiff = Date.now() - touchStart.time;

    // Swipe right (>50px en <300ms) = responder
    if (distance > 50 && timeDiff < 300) {
      setReplyTo({
        id: msg.id,
        message: msg.message,
        sender: msg.senderUsername
      });
    }

    setTouchStart(null);
  };

  // Doble tap para dar "me gusta" rápido
  const handleDoubleTap = async (msg: Message) => {
    const now = Date.now();
    
    if (lastTap && lastTap.messageId === msg.id && (now - lastTap.time) < 300) {
      // Es un doble tap
      await toggleReaction(msg.id, user?.id || '', '❤️');
      setLastTap(null);
    } else {
      // Primer tap
      setLastTap({ messageId: msg.id, time: now });
    }
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
    
    setDeleteMessageData({ id: messageId, mediaUrl });
  };

  const confirmDeleteMessage = async () => {
    if (!deleteMessageData) return;
    
    const success = await deleteMessage(deleteMessageData.id, deleteMessageData.mediaUrl);
    
    if (success) {
      setMessages(prev => prev.filter(m => m.id !== deleteMessageData.id));
      toast.success('Mensaje eliminado');
    } else {
      toast.error('Error al borrar el mensaje');
    }
    
    setDeleteMessageData(null);
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
    
    await toggleReaction(messageId, user.id, emoji);
    setShowReactions(null);
    setShowMenu(null);
    await loadMessages();
  };

  const handleCopyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowMenu(null);
      toast.success('Texto copiado al portapapeles');
    } catch (err) {
      console.error('Error copiando texto:', err);
      toast.error('No se pudo copiar el texto');
    }
  };

  const handleReplyTo = (msg: Message) => {
    setReplyTo({
      id: msg.id,
      message: msg.message || (msg.mediaType === 'image' ? '📷 Imagen' : msg.mediaType === 'video' ? '🎥 Video' : msg.mediaType === 'audio' ? '🎤 Audio' : 'Archivo'),
      sender: msg.senderUsername
    });
    setShowMenu(null);
    setShowReactions(null);
    // Hacer focus en el input y scroll al fondo
    setTimeout(() => {
      textareaRef.current?.focus();
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Detect supported mime types
      const mimeTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      
      const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
      
      if (!supportedMimeType) {
        alert('Tu navegador no soporta grabación de audio');
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: supportedMimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('No se pudo acceder al micrófono');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const sendAudioMessage = async () => {
    if (!user || !audioBlob) return;

    setUploading(true);

    try {
      // Get file extension from blob type
      const mimeType = audioBlob.type || 'audio/webm';
      const extension = mimeType.split('/')[1].split(';')[0]; // e.g., 'webm', 'ogg', 'mp4'
      
      console.log('Uploading audio:', { mimeType, extension, size: audioBlob.size });
      
      // Upload audio to storage
      const audioFile = new File([audioBlob], `audio-${Date.now()}.${extension}`, { type: mimeType });
      const mediaUrl = await uploadMedia(audioFile, user.id);

      setUploading(false);

      if (!mediaUrl) {
        alert('Error al subir el audio. Por favor, intenta de nuevo.');
        return;
      }

      // Send message with audio
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        senderId: user.id,
        senderUsername: user.username,
        message: '',
        timestamp: new Date().toISOString(),
        readBy: [user.id],
        mediaUrl,
        mediaType: 'audio',
        replyToId: replyTo?.id,
      };

      setMessages(prev => [...prev, optimisticMessage]);
      
      // Forzar scroll cuando envío audio
      setIsNearBottom(true);
      setTimeout(() => scrollToBottom(), 100);

      const sent = await sendMessage(
        user.id,
        user.username,
        '',
        mediaUrl,
        'audio',
        replyTo?.id
      );

      setReplyTo(null);
      setAudioBlob(null);
      setRecordingTime(0);

      if (!sent) {
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        alert('Error al enviar el mensaje de audio');
      }
    } catch (error) {
      console.error('Error sending audio message:', error);
      setUploading(false);
      alert('Error al procesar el audio. Por favor, intenta de nuevo.');
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'Hace un momento';
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    
    return date.toLocaleDateString('es-AR', { 
      day: 'numeric', 
      month: 'short'
    });
  };

  const getDateSeparator = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Resetear horas para comparar solo fechas
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    if (messageDate.getTime() === todayDate.getTime()) {
      return 'Hoy';
    } else if (messageDate.getTime() === yesterdayDate.getTime()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-AR', { 
        day: 'numeric', 
        month: 'long',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const shouldShowDateSeparator = (currentMsg: Message, previousMsg: Message | null) => {
    if (!previousMsg) return true;
    
    const currentDate = new Date(currentMsg.timestamp);
    const previousDate = new Date(previousMsg.timestamp);
    
    return currentDate.toDateString() !== previousDate.toDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-3 sticky top-0 z-10">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/calendar')}
              className="dark:border-gray-600 dark:text-gray-200 px-2 h-8"
            >
              ←
            </Button>
            <h1 className="text-lg font-bold dark:text-gray-100">Mensajes</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDarkMode}
                className="px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Cambiar tema"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
          {/* Online status row */}
          <div className="text-center mt-1">
            {otherUserOnline && (
              <div className="text-xs text-green-500 dark:text-green-400 flex items-center justify-center gap-1">
                <span className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse"></span>
                En línea
              </div>
            )}
            {!otherUserOnline && otherUserLastSeen && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatLastSeen(otherUserLastSeen)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        onScroll={handleScroll}
      >
        {/* Button to load older messages (estilo Telegram) */}
        {hasMoreMessages && !isLoadingMore && messages.length > 0 && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadOlderMessages}
              className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-md transition-colors"
            >
              ↑ Cargar mensajes anteriores
            </button>
          </div>
        )}
        {/* Loading indicator for older messages */}
        {isLoadingMore && (
          <div className="flex justify-center py-3">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <span className="text-sm">Cargando mensajes...</span>
            </div>
          </div>
        )}
        {!hasMoreMessages && messages.length > 0 && (
          <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-2">
            📜 Inicio de la conversación
          </div>
        )}
        {messages.map((msg, index) => {
          const previousMsg = index > 0 ? messages[index - 1] : null;
          const showDateSeparator = shouldShowDateSeparator(msg, previousMsg);
          
          return (
            <div key={msg.id}>
              {/* Separador de fecha */}
              {showDateSeparator && (
                <div className="flex justify-center my-3">
                  <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full">
                    {getDateSeparator(msg.timestamp)}
                  </div>
                </div>
              )}
              
              {/* Mensaje */}
              <div
                className={`flex relative items-center gap-1 ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                data-message-options
              >
            {/* Botón de opciones - izquierda para mensajes propios */}
            {!msg.id.startsWith('temp-') && msg.senderId === user?.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(showMenu === msg.id ? null : msg.id);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-full opacity-50 hover:opacity-100 active:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-700 shrink-0"
                aria-label="Opciones"
              >
                <span className="text-base text-gray-600 dark:text-gray-300">⋯</span>
              </button>
            )}
            
            <div
              className={`max-w-[75%] rounded-lg p-3 relative select-none ${
                msg.senderId === user?.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 border dark:border-gray-600 dark:text-gray-100'
              }`}
              onClick={() => !msg.id.startsWith('temp-') && handleDoubleTap(msg)}
            >
              {/* Reply reference */}
              {msg.replyToId && (() => {
                const repliedMsg = messages.find(m => m.id === msg.replyToId);
                if (!repliedMsg) return null;
                return (
                  <div className="bg-black/10 dark:bg-white/10 border-l-2 border-white/50 pl-2 py-1 mb-2 rounded text-xs opacity-80">
                    <div className="font-semibold">{repliedMsg.senderUsername}</div>
                    <div className="truncate">{repliedMsg.message || (repliedMsg.mediaType ? `📎 ${repliedMsg.mediaType}` : 'Mensaje')}</div>
                  </div>
                );
              })()}
              {msg.mediaUrl && (
                <div className="mb-2">
                  {msg.mediaType === 'image' ? (
                    <img 
                      src={msg.mediaUrl}
                      alt="Imagen" 
                      className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ maxHeight: '400px', minHeight: '100px', objectFit: 'contain' }}
                      loading="lazy"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullScreenImage(msg.mediaUrl || null);
                      }}
                      onError={(e) => {
                        console.error('Error loading image:', msg.mediaUrl);
                      }}
                    />
                  ) : msg.mediaType === 'video' ? (
                    <video 
                      src={msg.mediaUrl} 
                      controls 
                      className="max-w-full rounded-lg max-h-80"
                    />
                  ) : msg.mediaType === 'audio' ? (
                    <SmartAudioPlayer 
                      src={msg.mediaUrl} 
                      isOwn={msg.senderId === user?.id}
                    />
                  ) : null}
                </div>
              )}
              {msg.message && <div className="wrap-break-word">{msg.message}</div>}
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
            
            {/* Botón de opciones - derecha para mensajes del otro usuario */}
            {!msg.id.startsWith('temp-') && msg.senderId !== user?.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(showMenu === msg.id ? null : msg.id);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-full opacity-50 hover:opacity-100 active:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-700 shrink-0"
                aria-label="Opciones"
              >
                <span className="text-base text-gray-600 dark:text-gray-300">⋯</span>
              </button>
            )}
            
            {/* Menú contextual */}
            {showMenu === msg.id && (
              <div className={`absolute top-0 ${
                msg.senderId === user?.id ? 'left-8' : 'right-8'
              } bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 py-1 min-w-40 z-50`}>
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
              <div 
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white dark:bg-gray-800 rounded-full shadow-2xl border dark:border-gray-700 px-3 py-2 z-50 flex gap-2"
                data-reactions-picker
              >
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
          </div>
        );
        })}
        <div ref={messagesEndRef} />        
        {/* Indicador de escribiendo */}
        {isOtherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg px-3 py-2">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
      </div>

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

      {/* Input area */}
      <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-3">
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

        {/* Recording UI */}
        {isRecording && (
          <div className="mb-3 bg-red-50 dark:bg-red-950 border-2 border-red-500 dark:border-red-600 rounded-lg p-3 flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-3 h-3 bg-red-500 dark:bg-red-400 rounded-full animate-pulse"></div>
              <span className="text-red-700 dark:text-red-300 font-semibold">Grabando audio</span>
              <span className="text-red-600 dark:text-red-200 font-mono">{formatRecordingTime(recordingTime)}</span>
            </div>
            <button
              onClick={cancelRecording}
              className="text-red-600 hover:text-red-800 dark:text-red-300 dark:hover:text-red-100 font-bold text-lg"
            >
              ✕
            </button>
          </div>
        )}

        {/* Audio preview */}
        {audioBlob && !isRecording && (
          <div className="mb-3 bg-blue-50 dark:bg-blue-950 border-2 border-blue-500 dark:border-blue-600 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-700 dark:text-blue-300 font-semibold">🎤 Audio grabado ({formatRecordingTime(recordingTime)})</span>
              <button
                onClick={cancelRecording}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100 font-bold text-lg"
              >
                ✕
              </button>
            </div>
            <audio src={URL.createObjectURL(audioBlob)} controls crossOrigin="anonymous" className="w-full mb-2" />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={sendAudioMessage}
                disabled={uploading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {uploading ? '📤' : '✅ Enviar'}
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={cancelRecording}
                className="dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-950"
              >
                🗑️ Descartar
              </Button>
            </div>
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
        <div className="flex gap-2 items-end relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Botón principal de adjuntos con menú desplegable */}
          <div className="relative">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              disabled={uploading || isRecording || !!audioBlob}
              className="dark:border-gray-600 dark:text-gray-200"
              title="Adjuntar"
            >
              ➕
            </Button>

            {/* Menú desplegable de opciones */}
            {showAttachmentMenu && !isRecording && !audioBlob && (
              <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-lg p-2 min-w-45 z-50">
                <button
                  onClick={() => {
                    startRecording();
                    setShowAttachmentMenu(false);
                  }}
                  disabled={uploading || !!selectedFile}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-200"
                >
                  🎤 <span>Mensaje de voz</span>
                </button>
                <button
                  onClick={() => {
                    handleCameraCapture();
                    setShowAttachmentMenu(false);
                  }}
                  disabled={uploading}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-200"
                >
                  📷 <span>Cámara</span>
                </button>
                <button
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
                    setShowAttachmentMenu(false);
                  }}
                  disabled={uploading}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-200"
                >
                  📎 <span>Galería</span>
                </button>
              </div>
            )}
          </div>

          {/* Stop recording button cuando está grabando */}
          {isRecording && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={stopRecording}
              className="dark:border-gray-600 dark:text-gray-200 bg-red-100 dark:bg-red-900/30"
              title="Detener grabación"
            >
              ⏹️
            </Button>
          )}

          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
              // Auto-expand
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
              }
            }}
            onKeyPress={handleKeyPress}
            placeholder={
              editingMessage 
                ? "Editar mensaje..." 
                : selectedFile 
                  ? "Mensaje opcional..." 
                  : "Escribe un mensaje..."
            }
            className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 rounded-md border border-gray-300 px-3 py-2 resize-none min-h-10 max-h-30"
            disabled={uploading || isRecording || !!audioBlob}
            rows={1}
          />
          <Button 
            onClick={handleSend} 
            disabled={(!newMessage.trim() && !selectedFile) || uploading || isRecording || !!audioBlob}
            title={editingMessage ? 'Guardar' : 'Enviar'}
          >
            {uploading ? '⏳' : editingMessage ? '💾' : '✈️'}
          </Button>
        </div>
      </div>

      {/* Confirm Dialog para eliminar mensaje */}
      <ConfirmDialog
        isOpen={!!deleteMessageData}
        onClose={() => setDeleteMessageData(null)}
        onConfirm={confirmDeleteMessage}
        title="Eliminar Mensaje"
        message="¿Estás seguro de que quieres eliminar este mensaje? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Visor de imagen en pantalla completa */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setFullScreenImage(null)}
        >
          <button
            onClick={() => setFullScreenImage(null)}
            className="absolute top-4 right-4 text-white text-3xl w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors z-10"
            aria-label="Cerrar"
          >
            ✕
          </button>
          <img
            src={fullScreenImage}
            alt="Imagen en pantalla completa"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
            style={{
              touchAction: 'pinch-zoom',
            }}
          />
        </div>
      )}
    </div>
  );
}
