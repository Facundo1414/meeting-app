"use client";

import { useState } from 'react';
import { useChunkedMedia } from '@/hooks/use-chunked-media';

interface ThumbnailImageProps {
  src?: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  onLoad?: () => void;
}

/**
 * Componente de miniatura optimizado que solo carga cuando es necesario
 * Usa una imagen de baja calidad como placeholder
 */
export function ThumbnailImage({ 
  src, 
  alt, 
  className, 
  onClick, 
  onLoad
}: ThumbnailImageProps) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const { blobUrl, loading, error, load } = useChunkedMedia(src, shouldLoad);

  // Cargar cuando el componente entra en el viewport
  const handleIntersection = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !shouldLoad) {
        setShouldLoad(true);
        if (!blobUrl) {
          load();
        }
      }
    });
  };

  // Observar el elemento
  const ref = (element: HTMLDivElement | null) => {
    if (!element) return;
    
    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: '100px' // Cargar cuando esté a 100px de ser visible
    });
    
    observer.observe(element);
    
    return () => observer.disconnect();
  };

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 ${className}`}>
        <span className="text-sm text-gray-500">Sin imagen</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className} border border-dashed border-gray-300 dark:border-gray-600`}>
        <div className="text-center">
          <span className="text-2xl">📦</span>
          <p className="text-[10px] text-gray-400 mt-1">No en caché</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      {loading || !blobUrl ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
          {shouldLoad ? (
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          ) : (
            <span className="text-xs text-gray-500">📷</span>
          )}
        </div>
      ) : (
        <img
          src={blobUrl}
          alt={alt}
          className="w-full h-full object-cover"
          onClick={onClick}
          onLoad={onLoad}
          loading="lazy"
        />
      )}
    </div>
  );
}
