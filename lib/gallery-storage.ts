/**
 * Nueva lógica de galería que lee directamente desde el bucket de Supabase
 * Sin depender de la tabla messages_meeting_app
 */

import { supabase } from "./supabase";

export interface GalleryItem {
  id: string;
  name: string;
  url: string;
  type: "image" | "video" | "audio";
  size?: number;
  createdAt: string;
  isChunked: boolean; // Si el archivo está dividido en chunks
  userId?: string; // Extraído del path
}

/**
 * Lista archivos del bucket con paginación
 */
export async function getGalleryItems(
  limit: number = 20,
  offset: number = 0,
): Promise<{ items: GalleryItem[]; hasMore: boolean }> {
  try {
    const items: GalleryItem[] = [];

    // 1. Obtener carpetas de usuarios (sin paginación, son pocas)
    const { data: folders, error: foldersError } = await supabase.storage
      .from("meeting-app-media")
      .list("", {
        limit: 10,
        offset: 0,
      });

    if (foldersError) {
      console.error("Error listing folders:", foldersError);
    }

    // 2. Obtener archivos de cada carpeta con límite
    if (folders) {
      const userFolders = folders.filter((f) => !f.name.includes("."));

      for (const folder of userFolders) {
        const folderItems = await getUserFolderItems(
          folder.name,
          limit,
          offset,
        );
        items.push(...folderItems);

        // Si ya tenemos suficientes items, parar
        if (items.length >= limit) {
          break;
        }
      }
    }

    // 3. Obtener archivos chunked con límite
    const { data: chunkedFiles, error: chunkedError } = await supabase
      .from("file_chunks_meeting_app")
      .select("file_id, file_name, file_type, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (chunkedError) {
      console.error("Error fetching chunked files:", chunkedError);
    }

    if (chunkedFiles) {
      const uniqueChunked = new Map<string, (typeof chunkedFiles)[0]>();
      chunkedFiles.forEach((chunk) => {
        if (!uniqueChunked.has(chunk.file_id)) {
          uniqueChunked.set(chunk.file_id, chunk);
        }
      });

      uniqueChunked.forEach((chunk) => {
        const type = getMediaType(chunk.file_type);
        if (type) {
          items.push({
            id: chunk.file_id,
            name: chunk.file_name,
            url: `chunked://${chunk.file_id}`,
            type,
            createdAt: chunk.created_at || new Date().toISOString(),
            isChunked: true,
          });
        }
      });
    }

    // Ordenar por fecha (más recientes primero)
    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Limitar a la cantidad solicitada
    const limitedItems = items.slice(0, limit);

    console.log(
      `📸 Loaded ${limitedItems.length} gallery items (page ${offset / limit + 1})`,
    );

    return {
      items: limitedItems,
      hasMore:
        items.length > limit ||
        (chunkedFiles ? chunkedFiles.length >= limit : false),
    };
  } catch (error) {
    console.error("Error in getGalleryItems:", error);
    return { items: [], hasMore: false };
  }
}

/**
 * Obtener items de una carpeta de usuario específica
 */
async function getUserFolderItems(
  userId: string,
  limit: number,
  offset: number,
): Promise<GalleryItem[]> {
  const items: GalleryItem[] = [];

  try {
    const { data: userFiles, error } = await supabase.storage
      .from("meeting-app-media")
      .list(userId, {
        limit: limit,
        offset: offset,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      console.error(`Error listing user folder ${userId}:`, error);
      return items;
    }

    if (!userFiles) return items;

    for (const file of userFiles) {
      if (file.name === "chunks") continue;

      const type = getMediaTypeFromFileName(file.name);
      if (!type) continue;

      const { data: urlData } = supabase.storage
        .from("meeting-app-media")
        .getPublicUrl(`${userId}/${file.name}`);

      items.push({
        id: `${userId}/${file.name}`,
        name: file.name,
        url: urlData.publicUrl,
        type,
        size: file.metadata?.size,
        createdAt: file.created_at || new Date().toISOString(),
        isChunked: false,
        userId,
      });
    }
  } catch (error) {
    console.error(`Error processing folder ${userId}:`, error);
  }

  return items;
}

/**
 * @deprecated Use getGalleryItems instead
 */
export async function getAllGalleryItems(): Promise<GalleryItem[]> {
  try {
    const items: GalleryItem[] = [];

    // 1. Obtener archivos normales (no chunks) del bucket
    const { data: files, error: filesError } = await supabase.storage
      .from("meeting-app-media")
      .list("", {
        limit: 1000,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (filesError) {
      console.error("Error listing files:", filesError);
    }

    // Procesar archivos normales (recursivamente por carpetas de usuarios)
    if (files) {
      // Listar carpetas de usuarios
      for (const folder of files.filter((f) => !f.name.includes("."))) {
        await processUserFolder(folder.name, items);
      }
    }

    // 2. Obtener archivos chunked desde la base de datos
    const { data: chunkedFiles, error: chunkedError } = await supabase
      .from("file_chunks_meeting_app")
      .select("file_id, file_name, file_type, created_at")
      .order("created_at", { ascending: false });

    if (chunkedError) {
      console.error("Error fetching chunked files:", chunkedError);
    }

    if (chunkedFiles) {
      // Agrupar por file_id para evitar duplicados
      const uniqueChunked = new Map<string, (typeof chunkedFiles)[0]>();
      chunkedFiles.forEach((chunk) => {
        if (!uniqueChunked.has(chunk.file_id)) {
          uniqueChunked.set(chunk.file_id, chunk);
        }
      });

      // Agregar archivos chunked a la galería
      uniqueChunked.forEach((chunk) => {
        const type = getMediaType(chunk.file_type);
        if (type) {
          items.push({
            id: chunk.file_id,
            name: chunk.file_name,
            url: `chunked://${chunk.file_id}`, // URL especial para archivos chunked
            type,
            createdAt: chunk.created_at || new Date().toISOString(),
            isChunked: true,
          });
        }
      });
    }

    // Ordenar por fecha (más recientes primero)
    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    console.log(
      `📸 Found ${items.length} gallery items (${items.filter((i) => i.isChunked).length} chunked) [DEPRECATED - use getGalleryItems]`,
    );
    return items;
  } catch (error) {
    console.error("Error in getAllGalleryItems:", error);
    return [];
  }
}

/**
 * Procesa una carpeta de usuario para extraer archivos multimedia
 */
async function processUserFolder(
  userId: string,
  items: GalleryItem[],
): Promise<void> {
  try {
    // Listar archivos en la carpeta del usuario (excluyendo carpeta chunks)
    const { data: userFiles, error } = await supabase.storage
      .from("meeting-app-media")
      .list(userId, {
        limit: 1000,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      console.error(`Error listing user folder ${userId}:`, error);
      return;
    }

    if (!userFiles) return;

    // Filtrar y procesar archivos multimedia (no carpetas, no chunks)
    for (const file of userFiles) {
      // Ignorar carpeta "chunks"
      if (file.name === "chunks") continue;

      // Solo archivos con extensión válida
      const type = getMediaTypeFromFileName(file.name);
      if (!type) continue;

      // Obtener URL pública del archivo
      const { data: urlData } = supabase.storage
        .from("meeting-app-media")
        .getPublicUrl(`${userId}/${file.name}`);

      items.push({
        id: `${userId}/${file.name}`,
        name: file.name,
        url: urlData.publicUrl,
        type,
        size: file.metadata?.size,
        createdAt: file.created_at || new Date().toISOString(),
        isChunked: false,
        userId,
      });
    }
  } catch (error) {
    console.error(`Error processing folder ${userId}:`, error);
  }
}

/**
 * Determina el tipo de media basado en el MIME type
 */
function getMediaType(mimeType: string): "image" | "video" | "audio" | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return null;
}

/**
 * Determina el tipo de media basado en la extensión del archivo
 */
function getMediaTypeFromFileName(
  fileName: string,
): "image" | "video" | "audio" | null {
  const ext = fileName.toLowerCase().split(".").pop();
  if (!ext) return null;

  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"];
  const videoExts = ["mp4", "mov", "avi", "mkv", "webm"];
  const audioExts = ["mp3", "wav", "ogg", "m4a", "aac"];

  if (imageExts.includes(ext)) return "image";
  if (videoExts.includes(ext)) return "video";
  if (audioExts.includes(ext)) return "audio";

  return null;
}

/**
 * Filtra items por tipo de media
 */
export function filterByType(
  items: GalleryItem[],
  type: "all" | "image" | "video" | "audio",
): GalleryItem[] {
  if (type === "all") return items;
  return items.filter((item) => item.type === type);
}
