"use client";

import { useChunkedMedia } from '@/hooks/use-chunked-media';

interface ChunkedImageProps {
  src?: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  onLoad?: () => void;
  loading?: 'lazy' | 'eager';
}

export function ChunkedImage({ 
  src, 
  alt, 
  className, 
  onClick, 
  onLoad,
  loading = 'lazy' 
}: ChunkedImageProps) {
  const { blobUrl, loading: isLoading, error } = useChunkedMedia(src);

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 ${className}`}>
        <span className="text-sm text-gray-500">Sin imagen</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className} border-2 border-dashed border-gray-300 dark:border-gray-600`}>
        <div className="text-center p-4">
          <span className="text-3xl">📦</span>
          <p className="text-xs text-gray-500 mt-2">No disponible en caché</p>
        </div>
      </div>
    );
  }

  if (isLoading || !blobUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 ${className}`}>
        <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      onClick={onClick}
      onLoad={onLoad}
      loading={loading}
    />
  );
}

interface ChunkedVideoProps {
  src?: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  onClick?: () => void;
}

export function ChunkedVideo({ 
  src, 
  className, 
  controls = false,
  autoPlay = false,
  muted = false,
  playsInline = false,
  preload = 'metadata',
  onClick
}: ChunkedVideoProps) {
  const { blobUrl, loading, error } = useChunkedMedia(src);

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-black ${className}`}>
        <span className="text-sm text-white">Sin video</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 ${className} border-2 border-dashed border-gray-600`}>
        <div className="text-center p-4">
          <span className="text-4xl">🎬</span>
          <p className="text-xs text-gray-400 mt-2">Video no disponible en caché</p>
        </div>
      </div>
    );
  }

  if (loading || !blobUrl) {
    return (
      <div className={`flex items-center justify-center bg-black ${className}`}>
        <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <video
      src={blobUrl}
      className={className}
      controls={controls}
      autoPlay={autoPlay}
      muted={muted}
      playsInline={playsInline}
      preload={preload}
      onClick={onClick}
    />
  );
}

interface ChunkedAudioProps {
  src?: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
}

export function ChunkedAudio({ 
  src, 
  className, 
  controls = true,
  autoPlay = false 
}: ChunkedAudioProps) {
  const { blobUrl, loading, error } = useChunkedMedia(src);

  if (!src) {
    return (
      <div className={`${className} p-2 bg-gray-100 dark:bg-gray-800 rounded`}>
        <span className="text-sm text-gray-500">Sin audio</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} p-2 bg-gray-100 dark:bg-gray-800 rounded`}>
        <span className="text-sm text-red-500">Error al cargar audio</span>
      </div>
    );
  }

  if (loading || !blobUrl) {
    return (
      <div className={`${className} flex items-center justify-center p-2`}>
        <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        <span className="ml-2 text-sm text-gray-500">Cargando audio...</span>
      </div>
    );
  }

  return (
    <audio
      src={blobUrl}
      className={className}
      controls={controls}
      autoPlay={autoPlay}
    />
  );
}
