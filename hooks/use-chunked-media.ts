"use client";

import { useEffect, useState, useRef } from "react";
import { downloadChunkedFile } from "@/lib/storage-supabase";

// Cache in-memory para evitar múltiples descargas en la misma sesión
const memoryCache = new Map<string, string>();

// IndexedDB para caché persistente (sin límite de tiempo)
const DB_NAME = "media-cache";
const STORE_NAME = "files";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });

  return dbPromise;
}

async function getCachedBlob(fileId: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(fileId);

      request.onsuccess = () => {
        const data = request.result;
        if (!data) {
          resolve(null);
          return;
        }

        // Retornar el blob directamente (sin verificar expiración)
        resolve(data.blob);
      };

      request.onerror = () => resolve(null);
    });
  } catch (error) {
    console.error("Error reading from IndexedDB:", error);
    return null;
  }
}

async function setCachedBlob(fileId: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({
        id: fileId,
        blob: blob,
        timestamp: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => resolve(); // Don't fail if cache write fails
    });
  } catch (error) {
    console.error("Error writing to IndexedDB:", error);
  }
}

/**
 * Hook para manejar archivos fragmentados (chunked files)
 * Descarga y ensambla archivos grandes con caché inteligente permanente
 *
 * @param mediaUrl - URL del archivo (puede ser "chunked://" o URL normal)
 * @param autoLoad - Si false, no descarga automáticamente (útil para miniaturas)
 */
export function useChunkedMedia(
  mediaUrl: string | undefined,
  autoLoad: boolean = true
) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!mediaUrl || !autoLoad) return;

    // Determinar si es chunked o URL normal
    const isChunked = mediaUrl.startsWith("chunked://");
    const fileId = isChunked ? mediaUrl.replace("chunked://", "") : mediaUrl;

    // Check memory cache first
    if (memoryCache.has(fileId)) {
      setBlobUrl(memoryCache.get(fileId)!);
      return;
    }

    const loadChunkedFile = async () => {
      if (hasLoadedRef.current) return;
      hasLoadedRef.current = true;

      setLoading(true);
      setError(null);

      try {
        // Check IndexedDB cache first
        const cachedBlob = await getCachedBlob(fileId);

        let blob: Blob | null;
        if (cachedBlob) {
          console.log(`✅ Using cached file: ${isChunked ? fileId : 'URL'}`);
          blob = cachedBlob;
        } else {
          if (isChunked) {
            // Archivo fragmentado - descargar y ensamblar chunks
            console.log(`⬇️ Downloading chunked file: ${fileId}`);
            blob = await downloadChunkedFile(fileId);
          } else {
            // URL normal - descargar directamente
            console.log(`⬇️ Downloading file from URL: ${mediaUrl}`);
            const response = await fetch(mediaUrl);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            blob = await response.blob();
          }

          if (blob) {
            // Cache the blob for future use
            console.log(`💾 Caching file: ${isChunked ? fileId : 'URL'} (${Math.round(blob.size / 1024)} KB)`);
            await setCachedBlob(fileId, blob);
          }
        }

        if (!blob) {
          setError("Error al cargar el archivo");
          return;
        }

        // Crear una URL temporal para el blob
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);

        // Store in memory cache
        memoryCache.set(fileId, url);
      } catch (err) {
        console.error("Error loading file:", err);
        setError("Error al cargar el archivo");
      } finally {
        setLoading(false);
      }
    };

    loadChunkedFile();

    // Cleanup: revocar la URL cuando el componente se desmonte
    return () => {
      if (blobUrl && blobUrl.startsWith("blob:") && !memoryCache.has(fileId)) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [mediaUrl, autoLoad]);

  // Función para cargar manualmente (útil cuando autoLoad es false)
  const load = async () => {
    if (!mediaUrl) return;

    const isChunked = mediaUrl.startsWith("chunked://");
    const fileId = isChunked ? mediaUrl.replace("chunked://", "") : mediaUrl;

    if (memoryCache.has(fileId)) {
      setBlobUrl(memoryCache.get(fileId)!);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cachedBlob = await getCachedBlob(fileId);
      let blob: Blob | null;

      if (cachedBlob) {
        blob = cachedBlob;
      } else {
        if (isChunked) {
          blob = await downloadChunkedFile(fileId);
        } else {
          const response = await fetch(mediaUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          blob = await response.blob();
        }
        
        if (blob) {
          await setCachedBlob(fileId, blob);
        }
      }

      if (blob) {
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        memoryCache.set(fileId, url);
      }
    } catch (err) {
      setError("Error al cargar el archivo");
    } finally {
      setLoading(false);
    }
  };

  return { blobUrl, loading, error, load };
}
