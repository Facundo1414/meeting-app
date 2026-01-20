import { NextRequest, NextResponse } from "next/server";

/**
 * API Route proxy optimizado para Vercel FREE
 * 
 * No usa caché en memoria (se pierde en serverless)
 * Confía en:
 * 1. Vercel Edge Cache (automático con headers correctos)
 * 2. IndexedDB del navegador (caché permanente)
 * 
 * Beneficio: Reduce egress de Supabase aprovechando Edge Cache de Vercel
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

    console.log(`⬇️ Proxying media: ${mediaUrl.substring(0, 50)}...`);

    // Descargar de Supabase
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

    console.log(
      `✅ Proxied successfully: ${Math.round(blob.size / 1024)} KB`,
    );

    // Headers optimizados para Vercel Edge Cache + Browser Cache
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Cache en navegador: 30 días
        "Cache-Control": "public, max-age=2592000, immutable",
        // Vercel Edge Cache: 1 año (automático si hay Cache-Control)
        "CDN-Cache-Control": "public, max-age=31536000, immutable",
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
