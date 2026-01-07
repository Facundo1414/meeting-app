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

    // Si no es un archivo fragmentado, devolver la URL directamente
    if (!mediaUrl.startsWith("chunked://")) {
      setBlobUrl(mediaUrl);
      return;
    }

    // Extraer el file ID
    const fileId = mediaUrl.replace("chunked://", "");

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
          console.log(`Using cached file: ${fileId}`);
          blob = cachedBlob;
        } else {
          console.log(`Downloading file: ${fileId}`);
          blob = await downloadChunkedFile(fileId);

          if (blob) {
            // Cache the blob for future use
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
        console.error("Error loading chunked file:", err);
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
    if (!mediaUrl || !mediaUrl.startsWith("chunked://")) return;

    const fileId = mediaUrl.replace("chunked://", "");

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
        blob = await downloadChunkedFile(fileId);
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
