/**
 * Optimizes Supabase Storage image URLs by adding transformation parameters
 * Uses Supabase's built-in image transformation API
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 */
export function getOptimizedImageUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: "webp" | "avif" | "origin";
  } = {}
): string {
  // Only transform Supabase storage URLs
  if (!url || !url.includes("supabase.co/storage")) {
    return url;
  }

  const { width = 400, height, quality = 75, format = "webp" } = options;

  // Supabase transformation URL format:
  // /storage/v1/render/image/public/bucket/path?width=X&height=Y&quality=Q
  try {
    const urlObj = new URL(url);

    // Check if it's already a render URL
    if (urlObj.pathname.includes("/render/image/")) {
      return url;
    }

    // Transform /storage/v1/object/public/... to /storage/v1/render/image/public/...
    const newPath = urlObj.pathname.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    );

    urlObj.pathname = newPath;
    urlObj.searchParams.set("width", width.toString());
    if (height) {
      urlObj.searchParams.set("height", height.toString());
    }
    urlObj.searchParams.set("quality", quality.toString());
    if (format !== "origin") {
      urlObj.searchParams.set("format", format);
    }

    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Get srcSet for responsive images
 */
export function getImageSrcSet(url: string): string {
  if (!url || !url.includes("supabase.co/storage")) {
    return "";
  }

  const sizes = [200, 400, 600];
  return sizes
    .map((w) => `${getOptimizedImageUrl(url, { width: w })} ${w}w`)
    .join(", ");
}
