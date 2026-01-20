'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getServiceWorkerCacheStats, isServiceWorkerActive, clearServiceWorkerCache, forceUpdateServiceWorker } from '@/lib/sw-register';

/**
 * Monitor de caché unificado - reemplaza CacheClearButton y BandwidthStatsDisplay
 */
export function CacheMonitor({ onClose }: { onClose?: () => void }) {
  const [isOpen, setIsOpen] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [stats, setStats] = useState<{
    swActive: boolean;
    cacheCount: number;
    cacheSizeMB: string;
    storageUsage: number;
    storageQuota: number;
  } | null>(null);
  const [downloadEvents, setDownloadEvents] = useState<{
    url: string;
    isCache: boolean;
    time: string;
  }[]>([]);

  useEffect(() => {
    // Escuchar eventos de descarga del Service Worker
    const handleLog = (event: any) => {
      if (event.detail) {
        setDownloadEvents(prev => [event.detail, ...prev].slice(0, 15));
      }
    };

    window.addEventListener('media-download', handleLog as any);
    return () => window.removeEventListener('media-download', handleLog as any);
  }, []);

  const updateStats = async () => {
    try {
      const swActive = isServiceWorkerActive();
      const swStats = await getServiceWorkerCacheStats();
      const estimate = await navigator.storage.estimate();

      setStats({
        swActive,
        cacheCount: swStats?.count || 0,
        cacheSizeMB: swStats?.totalSizeMB || '0',
        storageUsage: Math.round((estimate.usage || 0) / (1024 * 1024)),
        storageQuota: Math.round((estimate.quota || 0) / (1024 * 1024)),
      });
    } catch (error) {
      console.error('Error getting stats:', error);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('¿Limpiar caché? Los archivos se descargarán de nuevo la próxima vez.')) {
      return;
    }

    setClearing(true);
    try {
      await clearServiceWorkerCache();
      await indexedDB.deleteDatabase('media-cache');
      
      alert('Caché limpiado. La página se recargará.');
      window.location.reload();
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Error al limpiar el caché');
      setClearing(false);
    }
  };

  const handleForceUpdate = async () => {
    if (!confirm('¿Forzar actualización del Service Worker? Esto limpiará el caché y recargará la página.')) {
      return;
    }

    setClearing(true);
    try {
      const success = await forceUpdateServiceWorker();
      
      if (success) {
        alert('✅ Service Worker actualizado. La página se recargará.');
        window.location.reload();
      } else {
        alert('❌ Error al actualizar Service Worker');
        setClearing(false);
      }
    } catch (error) {
      console.error('Error forcing update:', error);
      alert('Error al actualizar');
      setClearing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateStats();
      const interval = setInterval(updateStats, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) {
    return null;
  }

  const cacheHits = downloadEvents.filter(e => e.isCache).length;
  const cacheMisses = downloadEvents.filter(e => !e.isCache).length;
  const efficiency = downloadEvents.length > 0 
    ? Math.round((cacheHits / downloadEvents.length) * 100) 
    : 0;

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl p-4 w-[380px] max-w-[calc(100vw-2rem)] z-50 max-h-[85vh] overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-base">📊 Monitor de Caché</h3>
        <button
          onClick={handleClose}
          className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Estado */}
      <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Service Worker:</span>
          <span className={`text-sm font-bold ${stats?.swActive ? 'text-green-600' : 'text-red-600'}`}>
            {stats?.swActive ? '✅ ACTIVO' : '❌ INACTIVO'}
          </span>
        </div>
        
        {stats && stats.swActive && (
          <>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Archivos:</span>
                <span className="font-mono font-semibold">{stats.cacheCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tamaño:</span>
                <span className="font-mono font-semibold">{stats.cacheSizeMB} MB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Almacenamiento:</span>
                <span className="font-mono font-semibold">
                  {stats.storageUsage} / {stats.storageQuota} MB
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Eficiencia */}
      {downloadEvents.length > 0 && (
        <div className="mb-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{efficiency}%</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Eficiencia de caché</div>
            <div className="text-xs text-gray-500 mt-1">
              {cacheHits} caché / {cacheMisses} descargados
            </div>
          </div>
        </div>
      )}

      {/* Actividad */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm">Actividad Reciente</h4>
          <Button
            onClick={updateStats}
            size="sm"
            variant="outline"
            className="text-xs h-7"
          >
            🔄
          </Button>
        </div>

        {downloadEvents.length === 0 ? (
          <p className="text-xs text-gray-500 italic text-center py-4">
            Ve a la galería para ver la actividad
          </p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {downloadEvents.map((event, i) => (
              <div
                key={i}
                className={`text-xs p-2 rounded ${
                  event.isCache
                    ? 'bg-green-50 dark:bg-green-900/20 border-l-2 border-green-500'
                    : 'bg-orange-50 dark:bg-orange-900/20 border-l-2 border-orange-500'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold">
                    {event.isCache ? '📦 CACHÉ' : '⬇️ DESCARGA'}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">{event.time}</span>
                </div>
                <div className="text-gray-600 dark:text-gray-400 truncate text-[10px]">
                  {decodeURIComponent(event.url.split('/').pop() || '')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            onClick={handleClearCache}
            disabled={clearing}
            variant="outline"
            size="sm"
            className="flex-1 text-red-600 hover:bg-red-50"
          >
            {clearing ? '🔄 Limpiando...' : '🗑️ Limpiar'}
          </Button>
        </div>
        
        {/* Botón forzar actualización - para Safari mobile */}
        <Button
          onClick={handleForceUpdate}
          disabled={clearing}
          size="sm"
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium"
        >
          {clearing ? '🔄 Actualizando...' : '🔄 Forzar actualización SW'}
        </Button>
        <p className="text-[10px] text-gray-500 text-center">
          Usar si el caché no funciona en Safari
        </p>
      </div>

      {/* Info */}
      <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600 text-[10px] text-gray-500 dark:text-gray-400 space-y-1">
        <p><span className="font-bold text-green-600">📦 CACHÉ:</span> Archivo del navegador (0 bytes de Supabase)</p>
        <p><span className="font-bold text-orange-600">⬇️ DESCARGA:</span> Nueva descarga de Supabase</p>
        <p className="italic mt-2">💡 El caché es permanente en iPhone. Solo límpialo si hay problemas.</p>
      </div>
    </div>
  );
}
