'use client';

import GalleryView from '@/components/gallery-view';
import { CachePermissionBanner, useCachePermission } from '@/components/cache-permission-banner';

export default function GalleryPage() {
  const cachePermission = useCachePermission();

  // Mostrar banner si no hay permiso
  if (cachePermission === null) {
    // Cargando estado inicial
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (cachePermission === false) {
    // No ha aceptado, mostrar banner
    return <CachePermissionBanner />;
  }

  // Ya aceptó, mostrar galería
  return <GalleryView />;
}
