/**
 * Generate a URL-friendly slug for a seller profile.
 * Prioritizes display_name over username for readability.
 * Handles email addresses and special characters.
 */
export function getSellerSlug(profile: {
  username?: string | null;
  display_name?: string | null;
}): string {
  // Prefer display_name if available (more user-friendly)
  const name = profile.display_name || profile.username || 'seller';
  
  // If it's an email address, use the part before @
  if (name.includes('@')) {
    const emailPrefix = name.split('@')[0];
    return emailPrefix.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  
  // Otherwise slugify the name
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Remove duplicate hyphens
}

/**
 * Optimize image URL with Supabase transformations for faster loading.
 * Adds width=400 and quality=75 for homepage cards to reduce file size.
 */
function optimizeImageUrl(url: string): string {
  // Only apply transformations to Supabase storage URLs
  if (url.includes('supabase.co/storage/v1/object/public/')) {
    // Add transformation parameters: width=400, quality=75
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=400&quality=75`;
  }
  return url;
}

/**
 * Get the primary image URL for a listing with proper fallback priority.
 * Priority: seller-uploaded photo > ComicVine reference > placeholder
 * Optimizes Supabase images with transformation parameters.
 */
export function getListingImageUrl(item: any): string {
  // Handle direct image_url field
  if (item.image_url && typeof item.image_url === 'string') {
    return optimizeImageUrl(item.image_url);
  }
  
  // Handle images object/array
  if (item.images) {
    // Object format: { front: \"url\", comicvine_reference: \"url\" }
    if (typeof item.images === 'object' && !Array.isArray(item.images)) {
      // Priority 1: User-uploaded front image
      if (item.images.front && typeof item.images.front === 'string') {
        return optimizeImageUrl(item.images.front);
      }
      
      // Priority 2: Back image if front not available
      if (item.images.back && typeof item.images.back === 'string') {
        return optimizeImageUrl(item.images.back);
      }
      
      // Priority 3: ComicVine reference
      if (item.images.comicvine_reference && typeof item.images.comicvine_reference === 'string') {
        return optimizeImageUrl(item.images.comicvine_reference);
      }
    }
    
    // Array format: [\"url1\", \"url2\"]
    if (Array.isArray(item.images) && item.images.length > 0) {
      const firstImage = item.images[0];
      if (typeof firstImage === 'string') {
        return optimizeImageUrl(firstImage);
      }
      if (typeof firstImage === 'object' && firstImage.url) {
        return optimizeImageUrl(firstImage.url);
      }
    }
  }
  
  // Fallback to comicvine_cover_url if present
  if (item.comicvine_cover_url && typeof item.comicvine_cover_url === 'string') {
    return optimizeImageUrl(item.comicvine_cover_url);
  }
  
  // Final fallback
  return "/placeholder.svg";
}
