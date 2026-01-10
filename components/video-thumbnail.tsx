"use client";

import { useEffect, useRef, useState } from 'react';
import { useChunkedMedia } from '@/hooks/use-chunked-media';

interface VideoThumbnailProps {
  src?: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Componente que genera y muestra un thumbnail del primer frame de un video
 */
export function VideoThumbnail({ src, alt, className, onClick }: VideoThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { blobUrl, loading } = useChunkedMedia(src);

  useEffect(() => {
    if (!blobUrl || error) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const handleLoadedData = () => {
      try {
        // Esperar un momento para asegurar que el primer frame esté listo
        setTimeout(() => {
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Ajustar canvas al tamaño del video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Dibujar el frame actual (primero) en el canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convertir canvas a blob y crear URL
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              setThumbnailUrl(url);
            }
          }, 'image/jpeg', 0.8);
        }, 100);
      } catch (err) {
        console.error('Error generating video thumbnail:', err);
        setError(true);
      }
    };

    const handleError = () => {
      setError(true);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);

    // Cargar el video
    video.load();

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [blobUrl, error]);

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-black ${className}`}>
        <span className="text-2xl">🎥</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-800 ${className}`}>
        <div className="w-6 h-6 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-800 ${className}`}>
        <span className="text-3xl">🎥</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} onClick={onClick}>
      {/* Video oculto para generar thumbnail */}
      <video
        ref={videoRef}
        src={blobUrl}
        className="hidden"
        preload="metadata"
        muted
        playsInline
      />
      
      {/* Canvas oculto para capturar frame */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Mostrar thumbnail o placeholder */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={alt || 'Video thumbnail'}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <span className="text-3xl">🎥</span>
        </div>
      )}
      
      {/* Icono de play superpuesto */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-10 h-10 bg-black/70 rounded-full flex items-center justify-center">
          <span className="text-white text-xl">▶</span>
        </div>
      </div>
    </div>
  );
}
