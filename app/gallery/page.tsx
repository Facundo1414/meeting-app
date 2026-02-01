'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GalleryView from '@/components/gallery-view';
import { CachePermissionBanner, useCachePermission } from '@/components/cache-permission-banner';
import { GalleryPasswordGate, isGalleryUnlocked } from '@/components/gallery-password-gate';

export default function GalleryPage() {
  const router = useRouter();
  const cachePermission = useCachePermission();
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);

  // Verificar estado de desbloqueo al cargar
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    setIsUnlocked(isGalleryUnlocked());
  }, [router]);

  const handleUnlock = useCallback(() => {
    setIsUnlocked(true);
  }, []);

  // Cargando estado inicial
  if (isUnlocked === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Mostrar pantalla de contraseña si no está desbloqueada
  if (!isUnlocked) {
    return <GalleryPasswordGate onUnlock={handleUnlock} />;
  }

  // Mostrar banner de permisos de caché si no hay permiso
  if (cachePermission === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (cachePermission === false) {
    return <CachePermissionBanner />;
  }

  // Ya está desbloqueada y tiene permisos, mostrar galería
  return <GalleryView />;
}
