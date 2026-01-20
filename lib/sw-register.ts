/**
 * Registrar Service Worker para cachear media en iPhone/Safari
 * Cache API es más confiable que IndexedDB en iOS
 */

export async function registerServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.log("⚠️ Service Worker no disponible");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("✅ Service Worker registrado:", registration.scope);

    // Esperar a que esté activo
    if (registration.active) {
      console.log("✅ Service Worker activo");
    } else {
      await navigator.serviceWorker.ready;
      console.log("✅ Service Worker listo");
    }

    return true;
  } catch (error) {
    console.error("❌ Error registrando Service Worker:", error);
    return false;
  }
}

/**
 * Forzar actualización del Service Worker
 * Desregistra y vuelve a registrar para Safari mobile
 */
export async function forceUpdateServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    // Obtener todas las registraciones
    const registrations = await navigator.serviceWorker.getRegistrations();

    // Desregistrar todas
    for (const registration of registrations) {
      await registration.unregister();
      console.log("🗑️ Service Worker desregistrado");
    }

    // Limpiar el cache manualmente
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log("🗑️ Cache eliminado:", cacheName);
      }
    }

    // Esperar un momento antes de re-registrar
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Registrar de nuevo
    const success = await registerServiceWorker();

    if (success) {
      console.log("🔄 Service Worker actualizado exitosamente");
    }

    return success;
  } catch (error) {
    console.error("❌ Error forzando actualización del SW:", error);
    return false;
  }
}

/**
 * Limpiar cache del Service Worker
 */
export async function clearServiceWorkerCache(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) {
      return false;
    }

    const messageChannel = new MessageChannel();

    return new Promise((resolve) => {
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success);
      };

      registration.active!.postMessage("CLEAR_CACHE", [messageChannel.port2]);
    });
  } catch (error) {
    console.error("Error clearing SW cache:", error);
    return false;
  }
}

/**
 * Obtener estadísticas del cache del Service Worker
 */
export async function getServiceWorkerCacheStats(): Promise<{
  count: number;
  totalSize: number;
  totalSizeMB: string;
} | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) {
      return null;
    }

    const messageChannel = new MessageChannel();

    return new Promise((resolve) => {
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve({
            count: event.data.count,
            totalSize: event.data.totalSize,
            totalSizeMB: event.data.totalSizeMB,
          });
        } else {
          resolve(null);
        }
      };

      registration.active!.postMessage("CACHE_STATS", [messageChannel.port2]);
    });
  } catch (error) {
    console.error("Error getting SW cache stats:", error);
    return null;
  }
}

/**
 * Verificar si el Service Worker está activo
 */
export function isServiceWorkerActive(): boolean {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }
  return !!navigator.serviceWorker.controller;
}
