'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface SignalingMessage {
  id: string;
  session_id: string;
  from_user_id: string;
  to_user_id: string;
  type: 'offer' | 'answer' | 'ice-candidate' | 'hangup' | 'call-request' | 'call-accept' | 'call-reject';
  payload: any;
  created_at: string;
}

// Servidores STUN gratuitos para NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
};

interface VoiceChatContextType {
  // Estado
  isInCall: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  error: string | null;
  remoteUserId: string | null;
  remoteUsername: string | null;
  incomingCall: { fromUserId: string; fromUsername: string } | null;
  
  // Acciones
  startCall: (remoteUserId: string, remoteUsername: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  hangUp: () => void;
  toggleMute: () => void;
}

const VoiceChatContext = createContext<VoiceChatContextType | null>(null);

export function useVoiceChatGlobal() {
  const context = useContext(VoiceChatContext);
  if (!context) {
    throw new Error('useVoiceChatGlobal must be used within VoiceChatProvider');
  }
  return context;
}

interface VoiceChatProviderProps {
  children: ReactNode;
  userId: string | null;
}

export function VoiceChatProvider({ children, userId }: VoiceChatProviderProps) {
  const [isInCall, setIsInCall] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [remoteUsername, setRemoteUsername] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ fromUserId: string; fromUsername: string } | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const isInitiatorRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callIdRef = useRef<string | null>(null);

  // Generar ID único para la llamada
  const generateCallId = useCallback((user1: string, user2: string) => {
    return [user1, user2].sort().join('-');
  }, []);

  // Enviar mensaje de señalización
  const sendSignal = useCallback(async (
    toUserId: string,
    type: SignalingMessage['type'],
    payload: any
  ) => {
    if (!userId) return;

    const callId = callIdRef.current || generateCallId(userId, toUserId);

    try {
      await supabase.from('webrtc_signaling_meeting_app').insert({
        session_id: callId,
        from_user_id: userId,
        to_user_id: toUserId,
        type,
        payload,
      });
    } catch (err) {
      console.error('Error sending signal:', err);
    }
  }, [userId, generateCallId]);

  // Crear conexión peer
  const createPeerConnection = useCallback((targetUserId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(targetUserId, 'ice-candidate', event.candidate.toJSON());
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setIsInCall(true);
        setIsConnecting(false);
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        // Intentar reconectar o colgar
        if (pc.iceConnectionState === 'failed') {
          hangUp();
        }
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track');
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }
      if (event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(console.error);
      }
    };

    return pc;
  }, [sendSignal]);

  // Obtener stream de audio
  const getAudioStream = async () => {
    return await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false 
    });
  };

  // Cargar nombre de usuario
  const loadUsername = async (id: string): Promise<string> => {
    try {
      const { data } = await supabase
        .from('users_meeting_app')
        .select('username')
        .eq('id', id)
        .single();
      return data?.username || 'Usuario';
    } catch {
      return 'Usuario';
    }
  };

  // Iniciar llamada
  const startCall = useCallback(async (targetUserId: string, targetUsername: string) => {
    if (!userId || isInCall || isConnecting) return;

    setIsConnecting(true);
    setError(null);
    setRemoteUserId(targetUserId);
    setRemoteUsername(targetUsername);
    isInitiatorRef.current = true;
    callIdRef.current = generateCallId(userId, targetUserId);

    try {
      // Enviar solicitud de llamada primero
      await sendSignal(targetUserId, 'call-request', { 
        fromUsername: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).username : 'Usuario'
      });

    } catch (err: any) {
      console.error('Error starting call:', err);
      setError(err.message || 'Error al iniciar llamada');
      setIsConnecting(false);
      setRemoteUserId(null);
      setRemoteUsername(null);
    }
  }, [userId, isInCall, isConnecting, generateCallId, sendSignal]);

  // Aceptar llamada entrante
  const acceptCall = useCallback(async () => {
    if (!incomingCall || !userId) return;

    setIsConnecting(true);
    setError(null);
    setRemoteUserId(incomingCall.fromUserId);
    setRemoteUsername(incomingCall.fromUsername);
    callIdRef.current = generateCallId(userId, incomingCall.fromUserId);
    isInitiatorRef.current = false;

    try {
      // Notificar que aceptamos
      await sendSignal(incomingCall.fromUserId, 'call-accept', {});
      setIncomingCall(null);

    } catch (err: any) {
      console.error('Error accepting call:', err);
      setError(err.message || 'Error al aceptar llamada');
      setIsConnecting(false);
    }
  }, [incomingCall, userId, generateCallId, sendSignal]);

  // Rechazar llamada
  const rejectCall = useCallback(() => {
    if (!incomingCall || !userId) return;
    
    sendSignal(incomingCall.fromUserId, 'call-reject', {});
    setIncomingCall(null);
  }, [incomingCall, userId, sendSignal]);

  // Colgar
  const hangUp = useCallback(() => {
    if (remoteUserId) {
      sendSignal(remoteUserId, 'hangup', {});
    }
    
    // Cerrar conexión
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Detener stream local
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Detener audio remoto
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    setIsInCall(false);
    setIsConnecting(false);
    setRemoteUserId(null);
    setRemoteUsername(null);
    setIsMuted(false);
    callIdRef.current = null;
    isInitiatorRef.current = false;
  }, [remoteUserId, sendSignal]);

  // Silenciar/Desilenciar
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Establecer conexión WebRTC
  const establishConnection = useCallback(async (targetUserId: string, isInitiator: boolean) => {
    try {
      const stream = await getAudioStream();
      localStreamRef.current = stream;

      const pc = createPeerConnection(targetUserId);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal(targetUserId, 'offer', offer);
      }

    } catch (err: any) {
      console.error('Error establishing connection:', err);
      setError(err.message || 'Error de conexión');
      hangUp();
    }
  }, [createPeerConnection, sendSignal, hangUp]);

  // Manejar mensajes de señalización
  const handleSignalingMessage = useCallback(async (message: SignalingMessage) => {
    if (!userId || message.from_user_id === userId) return;

    console.log('Received signaling message:', message.type, 'from:', message.from_user_id);

    switch (message.type) {
      case 'call-request':
        // Llamada entrante
        if (!isInCall && !isConnecting && !incomingCall) {
          const username = message.payload?.fromUsername || await loadUsername(message.from_user_id);
          setIncomingCall({
            fromUserId: message.from_user_id,
            fromUsername: username,
          });
          
          // Reproducir sonido de llamada
          try {
            const audio = new Audio('/ringtone.mp3');
            audio.volume = 0.5;
            audio.loop = true;
            audio.play().catch(() => {});
            // Detener después de 30 segundos
            setTimeout(() => audio.pause(), 30000);
          } catch {}
        }
        break;

      case 'call-accept':
        // El otro usuario aceptó, establecer conexión
        if (isInitiatorRef.current && remoteUserId) {
          await establishConnection(remoteUserId, true);
        }
        break;

      case 'call-reject':
        // Llamada rechazada
        setIsConnecting(false);
        setRemoteUserId(null);
        setRemoteUsername(null);
        setError('Llamada rechazada');
        setTimeout(() => setError(null), 3000);
        break;

      case 'offer':
        // Recibimos offer, crear answer
        if (!peerConnectionRef.current && remoteUserId) {
          const stream = await getAudioStream();
          localStreamRef.current = stream;

          const pc = createPeerConnection(message.from_user_id);
          peerConnectionRef.current = pc;

          stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
          });

          await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal(message.from_user_id, 'answer', answer);
        }
        break;

      case 'answer':
        if (peerConnectionRef.current && isInitiatorRef.current) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(message.payload)
          );
        }
        break;

      case 'ice-candidate':
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(message.payload)
            );
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        }
        break;

      case 'hangup':
        hangUp();
        break;
    }
  }, [userId, isInCall, isConnecting, incomingCall, remoteUserId, establishConnection, createPeerConnection, sendSignal, hangUp]);

  // Suscribirse a señales
  useEffect(() => {
    if (!userId) return;

    // Suscribirse a señales dirigidas a este usuario
    const channel = supabase
      .channel(`webrtc-global-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signaling_meeting_app',
          filter: `to_user_id=eq.${userId}`,
        },
        (payload) => {
          handleSignalingMessage(payload.new as SignalingMessage);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [userId, handleSignalingMessage]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const value: VoiceChatContextType = {
    isInCall,
    isConnecting,
    isMuted,
    error,
    remoteUserId,
    remoteUsername,
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    hangUp,
    toggleMute,
  };

  return (
    <VoiceChatContext.Provider value={value}>
      {children}
    </VoiceChatContext.Provider>
  );
}
