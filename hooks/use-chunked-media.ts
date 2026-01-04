"use client";

import { useEffect, useState } from "react";
import { downloadChunkedFile } from "@/lib/storage-supabase";

/**
 * Hook para manejar archivos fragmentados (chunked files)
 * Descarga y ensambla automáticamente archivos grandes
 */
export function useChunkedMedia(mediaUrl: string | undefined) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaUrl) return;

    // Si no es un archivo fragmentado, devolver la URL directamente
    if (!mediaUrl.startsWith("chunked://")) {
      setBlobUrl(mediaUrl);
      return;
    }

    // Extraer el file ID
    const fileId = mediaUrl.replace("chunked://", "");

    const loadChunkedFile = async () => {
      setLoading(true);
      setError(null);

      try {
        const blob = await downloadChunkedFile(fileId);

        if (!blob) {
          setError("Error al cargar el archivo");
          return;
        }

        // Crear una URL temporal para el blob
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
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
      if (blobUrl && blobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [mediaUrl]);

  return { blobUrl, loading, error };
}
