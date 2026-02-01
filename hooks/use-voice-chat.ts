"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface UseVoiceChatProps {
  sessionId: string | null;
  currentUserId: string;
  remoteUserId: string;
  enabled: boolean;
}

interface SignalingMessage {
  id: string;
  session_id: string;
  from_user_id: string;
  to_user_id: string;
  type: "offer" | "answer" | "ice-candidate" | "hangup";
  payload: any;
  created_at: string;
}

// Servidores STUN gratuitos para NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
};

export function useVoiceChat({
  sessionId,
  currentUserId,
  remoteUserId,
  enabled,
}: UseVoiceChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteIsMuted, setRemoteIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const isInitiatorRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Enviar mensaje de señalización
  const sendSignal = useCallback(
    async (
      type: "offer" | "answer" | "ice-candidate" | "hangup",
      payload: any,
    ) => {
      if (!sessionId) return;

      try {
        await supabase.from("webrtc_signaling_meeting_app").insert({
          session_id: sessionId,
          from_user_id: currentUserId,
          to_user_id: remoteUserId,
          type,
          payload,
        });
      } catch (err) {
        console.error("Error sending signal:", err);
      }
    },
    [sessionId, currentUserId, remoteUserId],
  );

  // Crear conexión peer
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("ice-candidate", event.candidate.toJSON());
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
      if (
        pc.iceConnectionState === "connected" ||
        pc.iceConnectionState === "completed"
      ) {
        setIsConnected(true);
        setIsConnecting(false);
      } else if (
        pc.iceConnectionState === "disconnected" ||
        pc.iceConnectionState === "failed"
      ) {
        setIsConnected(false);
        setIsConnecting(false);
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote track");
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(console.error);
      }
    };

    return pc;
  }, [sendSignal]);

  // Iniciar llamada
  const startCall = useCallback(async () => {
    if (!sessionId || !enabled) return;

    setIsConnecting(true);
    setError(null);
    isInitiatorRef.current = true;

    try {
      // Solicitar acceso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStreamRef.current = stream;
      setHasPermission(true);

      // Crear peer connection
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Agregar tracks de audio
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Crear y enviar offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal("offer", offer);
    } catch (err: any) {
      console.error("Error starting call:", err);
      setError(err.message || "Error al iniciar llamada");
      setIsConnecting(false);
      setHasPermission(false);
    }
  }, [sessionId, enabled, createPeerConnection, sendSignal]);

  // Responder a llamada
  const answerCall = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      if (!sessionId || !enabled) return;

      setIsConnecting(true);
      setError(null);

      try {
        // Solicitar acceso al micrófono
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        localStreamRef.current = stream;
        setHasPermission(true);

        // Crear peer connection
        const pc = createPeerConnection();
        peerConnectionRef.current = pc;

        // Agregar tracks de audio
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Establecer remote description y crear answer
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal("answer", answer);
      } catch (err: any) {
        console.error("Error answering call:", err);
        setError(err.message || "Error al responder llamada");
        setIsConnecting(false);
        setHasPermission(false);
      }
    },
    [sessionId, enabled, createPeerConnection, sendSignal],
  );

  // Colgar
  const hangUp = useCallback(() => {
    sendSignal("hangup", {});

    // Cerrar conexión
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Detener stream local
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, [sendSignal]);

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

  // Manejar mensajes de señalización
  const handleSignalingMessage = useCallback(
    async (message: SignalingMessage) => {
      if (message.from_user_id === currentUserId) return; // Ignorar propios mensajes

      console.log("Received signaling message:", message.type);

      switch (message.type) {
        case "offer":
          if (!peerConnectionRef.current) {
            await answerCall(message.payload);
          }
          break;

        case "answer":
          if (peerConnectionRef.current && isInitiatorRef.current) {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(message.payload),
            );
          }
          break;

        case "ice-candidate":
          if (peerConnectionRef.current) {
            try {
              await peerConnectionRef.current.addIceCandidate(
                new RTCIceCandidate(message.payload),
              );
            } catch (err) {
              console.error("Error adding ICE candidate:", err);
            }
          }
          break;

        case "hangup":
          hangUp();
          break;
      }
    },
    [currentUserId, answerCall, hangUp],
  );

  // Suscribirse a señales
  useEffect(() => {
    if (!sessionId || !enabled) return;

    // Crear elemento de audio para el remoto
    if (!remoteAudioRef.current) {
      remoteAudioRef.current = new Audio();
      remoteAudioRef.current.autoplay = true;
    }

    // Cargar señales existentes (por si hay una oferta pendiente)
    const loadExistingSignals = async () => {
      const { data } = await supabase
        .from("webrtc_signaling_meeting_app")
        .select("*")
        .eq("session_id", sessionId)
        .eq("to_user_id", currentUserId)
        .order("created_at", { ascending: true });

      if (data) {
        for (const signal of data) {
          await handleSignalingMessage(signal);
        }
      }
    };

    loadExistingSignals();

    // Suscribirse a nuevas señales
    const channel = supabase
      .channel(`webrtc-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "webrtc_signaling_meeting_app",
          filter: `to_user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const signal = payload.new as SignalingMessage;
          if (signal.session_id === sessionId) {
            handleSignalingMessage(signal);
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      hangUp();
    };
  }, [sessionId, currentUserId, enabled, handleSignalingMessage, hangUp]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    isMuted,
    remoteIsMuted,
    error,
    hasPermission,
    startCall,
    hangUp,
    toggleMute,
  };
}
