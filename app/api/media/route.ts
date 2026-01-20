import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Caché en memoria del servidor (persiste entre requests)
const serverCache = new Map<
  string,
  { data: Blob; timestamp: number; contentType: string }
>();
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 días

/**
 * API Route para servir archivos media con caché del servidor
 * Reduce drasticamente el Cached Egress de Supabase
 *
 * Uso: /api/media?url=https://supabase.co/storage/...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mediaUrl = searchParams.get("url");

    if (!mediaUrl) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Verificar si es una URL de Supabase válida
    if (!mediaUrl.includes("supabase.co")) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Check server cache first
    const cached = serverCache.get(mediaUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(
        `✅ Serving from server cache: ${mediaUrl.substring(0, 50)}...`,
      );

      return new NextResponse(cached.data, {
        status: 200,
        headers: {
          "Content-Type": cached.contentType,
          "Cache-Control": "public, max-age=604800, immutable", // 7 días en navegador
          "X-Cache-Status": "HIT",
        },
      });
    }

    // Si no está en caché, descargar de Supabase
    console.log(
      `⬇️ Downloading from Supabase: ${mediaUrl.substring(0, 50)}...`,
    );

    const response = await fetch(mediaUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch media" },
        { status: response.status },
      );
    }

    const blob = await response.blob();
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";

    // Guardar en caché del servidor
    serverCache.set(mediaUrl, {
      data: blob,
      timestamp: Date.now(),
      contentType,
    });

    console.log(
      `💾 Cached in server: ${mediaUrl.substring(0, 50)}... (${Math.round(blob.size / 1024)} KB)`,
    );

    // Limpiar caché antiguo (opcional, para no consumir mucha RAM)
    if (serverCache.size > 100) {
      // Máximo 100 archivos en caché
      const oldestKey = Array.from(serverCache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp,
      )[0][0];
      serverCache.delete(oldestKey);
      console.log(`🗑️ Removed oldest cache entry to free memory`);
    }

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable", // 7 días en navegador
        "X-Cache-Status": "MISS",
      },
    });
  } catch (error) {
    console.error("Error in media proxy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Endpoint para limpiar el caché del servidor (opcional, para admin)
 */
export async function DELETE() {
  serverCache.clear();
  return NextResponse.json({ message: "Cache cleared", size: 0 });
}

/**
 * Endpoint para ver estadísticas del caché
 */
export async function POST(request: NextRequest) {
  const stats = {
    cacheSize: serverCache.size,
    totalBytes: Array.from(serverCache.values()).reduce(
      (sum, item) => sum + item.data.size,
      0,
    ),
    oldestEntry: Math.min(
      ...Array.from(serverCache.values()).map((item) => item.timestamp),
    ),
    newestEntry: Math.max(
      ...Array.from(serverCache.values()).map((item) => item.timestamp),
    ),
  };

  return NextResponse.json(stats);
}
