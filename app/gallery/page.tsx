'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
// import GalleryView from '@/components/gallery-view';

export default function GalleryPage() {
  const router = useRouter();
  
  // GALERÍA TEMPORALMENTE DESACTIVADA
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
          Galería en Mantenimiento
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          La galería está temporalmente desactivada mientras optimizamos el uso de recursos.
          Volverá pronto con mejoras de rendimiento.
        </p>
        <div className="space-y-3">
          <Button 
            onClick={() => router.push('/messages')}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          >
            Ir a Mensajes
          </Button>
          <Button 
            onClick={() => router.back()}
            variant="outline"
            className="w-full"
          >
            Volver
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          Los archivos multimedia siguen disponibles en la sección de mensajes
        </p>
      </div>
    </div>
  );
  
  // Para reactivar, descomentar esta línea y eliminar el código de arriba:
  // return <GalleryView />;
}
