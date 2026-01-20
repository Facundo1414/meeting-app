'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/sw-register';

/**
 * Componente para registrar Service Worker automáticamente
 * y escuchar eventos de cache
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    // Registrar Service Worker
    const timer = setTimeout(() => {
      registerServiceWorker().then((success) => {
        if (success) {
          console.log('🎉 Service Worker activo - Cache persistente habilitado (iPhone compatible)');
        }
      });
    }, 1000);

    // Escuchar mensajes del Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'CACHE_HIT') {
          // Dispatch custom event para el monitor
          window.dispatchEvent(new CustomEvent('media-download', {
            detail: {
              url: event.data.url,
              isCache: true,
              time: event.data.time
            }
          }));
        } else if (event.data.type === 'CACHE_MISS') {
          window.dispatchEvent(new CustomEvent('media-download', {
            detail: {
              url: event.data.url,
              isCache: false,
              time: event.data.time
            }
          }));
        }
      });
    }

    return () => clearTimeout(timer);
  }, []);

  return null; // No renderiza nada
}
