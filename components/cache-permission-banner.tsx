'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { forceUpdateServiceWorker } from '@/lib/sw-register';

const PERMISSION_KEY = 'cache-permission-granted';

export function CachePermissionBanner() {
  const [show, setShow] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    // Verificar si ya se otorgaron permisos
    const granted = localStorage.getItem(PERMISSION_KEY);
    if (granted !== 'true') {
      // Mostrar inmediatamente si no hay permisos
      setShow(true);
    }
  }, []);

  const handleAccept = async () => {
    setAccepting(true);
    
    try {
      // Registrar/actualizar Service Worker
      const success = await forceUpdateServiceWorker();
      
      if (success) {
        // Guardar permiso
        localStorage.setItem(PERMISSION_KEY, 'true');
        setShow(false);
        
        // Mostrar mensaje
        setTimeout(() => {
          alert('✅ Caché activado. Los archivos se guardarán en tu navegador para reducir el consumo de datos.');
        }, 300);
      } else {
        alert('⚠️ No se pudo activar el caché. Los archivos se descargarán normalmente.');
        setShow(false);
      }
    } catch (error) {
      console.error('Error activating cache:', error);
      alert('⚠️ Error al activar el caché');
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = () => {
    // Guardar rechazo
    localStorage.setItem(PERMISSION_KEY, 'false');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/95">
      {/* Banner centrado */}
      <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl max-w-md mx-4 animate-slide-up border-t-4 border-blue-500">
        <div className="p-6">
          {/* Icono y título */}
          <div className="flex items-start gap-3 mb-4">
            <div className="text-4xl">💾</div>
            <div className="flex-1">
              <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-white">
                Guardar archivos en tu dispositivo
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Para <span className="font-semibold text-blue-600">reducir el consumo de datos</span> y 
                mejorar la velocidad, queremos guardar las fotos y videos en el almacenamiento 
                de tu navegador (caché).
              </p>
            </div>
          </div>

          {/* Beneficios */}
          <div className="mb-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Los archivos se descargan solo una vez</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>No se guardan en la galería de fotos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Carga instantánea al volver a verlos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600">ℹ</span>
              <span>Puedes limpiar el caché en cualquier momento</span>
            </div>
          </div>

          {/* Botones */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 text-base"
            >
              {accepting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Activando...
                </>
              ) : (
                '✓ Aceptar y activar caché'
              )}
            </Button>
            <Button
              onClick={handleReject}
              disabled={accepting}
              variant="outline"
              className="w-full h-12 text-base text-gray-600 dark:text-gray-300"
            >
              No, gracias
            </Button>
          </div>

          {/* Nota legal */}
          <p className="text-xs text-gray-400 mt-4 text-center">
            Los archivos se almacenan de forma segura en tu navegador y solo tú tienes acceso a ellos.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * Hook para verificar si se otorgaron permisos de caché
 */
export function useCachePermission() {
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    const permission = localStorage.getItem(PERMISSION_KEY);
    setGranted(permission === 'true');
  }, []);

  return granted;
}
