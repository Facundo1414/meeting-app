// Service Worker para cachear media en iPhone/Safari
// Cache API es más confiable que IndexedDB en iOS

const CACHE_NAME = 'meeting-app-media-v1';
const MEDIA_CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 días

// Flag: después de la primera descarga, NUNCA más descargar de Supabase
const STRICT_CACHE_MODE = true;

// Instalar service worker
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker instalado');
  self.skipWaiting();
});

// Activar y limpiar caches viejos
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Interceptar requests de media
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Solo cachear GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Detectar requests de media
  const isMediaRequest = 
    url.pathname.startsWith('/api/media') ||
    (url.hostname.includes('supabase.co') && 
     (url.pathname.includes('/storage/v1/object/public/') || 
      url.pathname.includes('/storage/v1/render/')));

  if (!isMediaRequest) {
    return;
  }

  console.log('🔍 SW intercepting:', url.pathname.substring(0, 60));

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        // Buscar en cache primero
        const cachedResponse = await cache.match(event.request);
        
        if (cachedResponse) {
          console.log('📦 Cache HIT:', url.pathname.substring(0, 50));
          
          // Notificar a la app
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'CACHE_HIT',
                url: event.request.url,
                time: new Date().toLocaleTimeString()
              });
            });
          });
          
          // Agregar header para indicar que vino del cache
          const headers = new Headers(cachedResponse.headers);
          headers.set('x-cache-status', 'HIT');
          
          return new Response(cachedResponse.body, {
            status: cachedResponse.status,
            statusText: cachedResponse.statusText,
            headers: headers
          });
        }

        // Si STRICT_CACHE_MODE está activado y ya hay otros archivos en cache,
        // NO descargar de Supabase (segunda vuelta en adelante)
        if (STRICT_CACHE_MODE) {
          const cacheKeys = await cache.keys();
          const mediaFilesInCache = cacheKeys.filter(req => {
            const reqUrl = new URL(req.url);
            return reqUrl.hostname.includes('supabase.co') && 
                   reqUrl.pathname.includes('/storage/v1/');
          });

          // Si ya hay archivos en cache, significa que no es la primera carga
          if (mediaFilesInCache.length > 0) {
            console.log('🚫 STRICT MODE: Cache MISS pero NO descargando de Supabase (hay', mediaFilesInCache.length, 'archivos en cache)');
            
            // Notificar a la app que el archivo no está en cache
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  type: 'CACHE_MISS_BLOCKED',
                  url: event.request.url,
                  time: new Date().toLocaleTimeString()
                });
              });
            });
            
            // Retornar un placeholder o error 404
            return new Response('Archivo no disponible en caché', {
              status: 404,
              statusText: 'Not in cache',
              headers: { 'Content-Type': 'text/plain', 'x-cache-status': 'MISS-BLOCKED' }
            });
          }
        }

        // Primera carga: descargar de Supabase
        console.log('⬇️ Cache MISS (primera carga), downloading:', url.pathname.substring(0, 50));
        
        // Notificar a la app
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'CACHE_MISS',
              url: event.request.url,
              time: new Date().toLocaleTimeString()
            });
          });
        });
        
        const networkResponse = await fetch(event.request);
        
        // Cachear solo respuestas exitosas y solo GET
        if (networkResponse.ok && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          
          // Agregar header con timestamp
          const headers = new Headers(responseToCache.headers);
          headers.set('sw-cached-date', Date.now().toString());
          
          const modifiedResponse = new Response(responseToCache.body, {
            status: responseToCache.status,
            statusText: responseToCache.statusText,
            headers: headers
          });
          
          // Solo cachear si es un request GET
          cache.put(event.request, modifiedResponse).then(() => {
            console.log('💾 Cached:', url.pathname.substring(0, 50));
          }).catch(err => {
            console.error('Error caching:', err);
          });
        }
        
        return networkResponse;
      } catch (error) {
        console.error('❌ Error fetching:', error);
        
        // En STRICT_CACHE_MODE, NO intentar fallback
        if (STRICT_CACHE_MODE) {
          console.log('🚫 STRICT MODE: Network failed, NOT serving stale cache');
          return new Response('Error de red - archivo no disponible', {
            status: 503,
            statusText: 'Network error',
            headers: { 'Content-Type': 'text/plain' }
          });
        }
        
        // Si falla la red, intentar devolver cache aunque esté expirado (solo sin STRICT_MODE)
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          console.log('⚠️ Network failed, serving stale cache');
          return cachedResponse;
        }
        
        throw error;
      }
    })
  );
});

// Endpoint para limpiar cache (llamar desde la app)
self.addEventListener('message', (event) => {
  if (event.data === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log('🗑️ Cache cleared');
        event.ports[0].postMessage({ success: true });
      })
    );
  }
  
  if (event.data === 'CACHE_STATS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        const keys = await cache.keys();
        const sizes = await Promise.all(
          keys.map(async (key) => {
            const response = await cache.match(key);
            if (response) {
              const blob = await response.blob();
              return blob.size;
            }
            return 0;
          })
        );
        const totalSize = sizes.reduce((sum, size) => sum + size, 0);
        
        event.ports[0].postMessage({
          success: true,
          count: keys.length,
          totalSize: totalSize,
          totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
        });
      })
    );
  }
});
