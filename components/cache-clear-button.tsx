"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { clearServiceWorkerCache, getServiceWorkerCacheStats } from '@/lib/sw-register';

/**
 * Utilidad para limpiar el caché de archivos multimedia (Service Worker + IndexedDB)
 * Útil para desarrollo o si el usuario tiene problemas
 */
export function CacheClearButton() {
  const [clearing, setClearing] = useState(false);
  const [stats, setStats] = useState<{ 
    quota: number; 
    usage: number;
    swCache?: { count: number; totalSizeMB: string };
  } | null>(null);

  const checkStorage = async () => {
    try {
      // Storage API (total del navegador)
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      
      // Service Worker cache stats
      const swStats = await getServiceWorkerCacheStats();
      
      setStats({
        quota: Math.round(quota / (1024 * 1024)), // MB
        usage: Math.round(usage / (1024 * 1024)),  // MB
        swCache: swStats || undefined
      });
    } catch (error) {
      console.error('Error checking storage:', error);
    }
  };

  const clearCache = async () => {
    if (!confirm('¿Estás seguro de que quieres limpiar el caché? Los archivos se volverán a descargar cuando los veas.')) {
      return;
    }

    setClearing(true);
    try {
      // Limpiar Service Worker cache
      await clearServiceWorkerCache();
      
      // Limpiar IndexedDB (legacy)
      await indexedDB.deleteDatabase('media-cache');
      
      alert('Caché limpiado exitosamente. La página se recargará.');
      window.location.reload();
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Error al limpiar el caché');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button 
          onClick={checkStorage}
          variant="outline"
          size="sm"
        >
          📊 Ver Uso de Almacenamiento
        </Button>
        
        <Button 
          onClick={clearCache}
          disabled={clearing}
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          {clearing ? '🔄 Limpiando...' : '🗑️ Limpiar Caché'}
        </Button>
      </div>
      
      {stats && (
        <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg space-y-2">
          <div>
            <p>💾 Almacenamiento total del navegador:</p>
            <p className="font-mono mt-1">
              {stats.usage} MB / {stats.quota} MB 
              ({Math.round((stats.usage / stats.quota) * 100)}% usado)
            </p>
          </div>
          
          {stats.swCache && (
            <div className="border-t border-gray-300 dark:border-gray-600 pt-2">
              <p>📦 Cache de archivos multimedia:</p>
              <p className="font-mono mt-1">
                {stats.swCache.count} archivos ({stats.swCache.totalSizeMB} MB)
              </p>
            </div>
          )}
        </div>
      )}
      
      <p className="text-xs text-gray-500">
        ℹ️ El caché es permanente (especialmente en iPhone) y mejora la velocidad. Solo límpialo si tienes problemas.
      </p>
    </div>
  );
}
