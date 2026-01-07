"use client";

import { useEffect, useState } from 'react';

interface BandwidthStats {
  totalDownloaded: number;
  cacheHits: number;
  cacheMisses: number;
  savedBandwidth: number;
}

const STATS_KEY = 'bandwidth-stats';

/**
 * Hook para trackear estadísticas de ancho de banda
 */
export function useBandwidthStats() {
  const [stats, setStats] = useState<BandwidthStats>({
    totalDownloaded: 0,
    cacheHits: 0,
    cacheMisses: 0,
    savedBandwidth: 0
  });

  useEffect(() => {
    // Cargar stats desde localStorage
    try {
      const stored = localStorage.getItem(STATS_KEY);
      if (stored) {
        setStats(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading bandwidth stats:', error);
    }
  }, []);

  const recordDownload = (bytes: number, fromCache: boolean) => {
    const newStats = {
      ...stats,
      totalDownloaded: stats.totalDownloaded + (fromCache ? 0 : bytes),
      cacheHits: stats.cacheHits + (fromCache ? 1 : 0),
      cacheMisses: stats.cacheMisses + (fromCache ? 0 : 1),
      savedBandwidth: stats.savedBandwidth + (fromCache ? bytes : 0)
    };
    
    setStats(newStats);
    localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
  };

  const resetStats = () => {
    const newStats: BandwidthStats = {
      totalDownloaded: 0,
      cacheHits: 0,
      cacheMisses: 0,
      savedBandwidth: 0
    };
    setStats(newStats);
    localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
  };

  return { stats, recordDownload, resetStats };
}

/**
 * Componente para mostrar estadísticas de ancho de banda
 */
export function BandwidthStatsDisplay() {
  const { stats, resetStats } = useBandwidthStats();

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const totalRequests = stats.cacheHits + stats.cacheMisses;
  const cacheHitRate = totalRequests > 0 ? (stats.cacheHits / totalRequests * 100).toFixed(1) : '0';

  if (totalRequests === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p>📊 Aún no hay estadísticas de uso</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Descargado</p>
          <p className="font-bold text-blue-600 dark:text-blue-400">{formatBytes(stats.totalDownloaded)}</p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Ahorrado</p>
          <p className="font-bold text-green-600 dark:text-green-400">{formatBytes(stats.savedBandwidth)}</p>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Caché Hit Rate</p>
          <p className="font-bold text-purple-600 dark:text-purple-400">{cacheHitRate}%</p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Total Peticiones</p>
          <p className="font-bold text-gray-700 dark:text-gray-300">{totalRequests}</p>
        </div>
      </div>
      
      <button
        onClick={resetStats}
        className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline"
      >
        Resetear estadísticas
      </button>
      
      <p className="text-xs text-gray-500 dark:text-gray-400">
        💡 Un cache hit rate alto indica que el sistema está funcionando correctamente y ahorrando ancho de banda.
      </p>
    </div>
  );
}
