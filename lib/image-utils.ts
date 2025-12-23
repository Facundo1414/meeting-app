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
  // Return original URL if invalid or not a Supabase URL
  if (!url || typeof url !== "string") {
    return url || "";
  }

  // Only transform Supabase storage URLs
  if (!url.includes("supabase.co/storage")) {
    return url;
  }

  const { width = 400, height, quality = 75, format = "origin" } = options;

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

    // If the path didn't change, the URL might already be correct or in a different format
    if (newPath === urlObj.pathname) {
      console.warn("Image URL path not transformed:", url);
      return url;
    }

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
  } catch (error) {
    console.error("Error optimizing image URL:", error);
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
