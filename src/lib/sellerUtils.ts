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
 * Get the primary image URL for a listing with proper fallback priority.
 * Priority: seller-uploaded photo > ComicVine reference > placeholder
 */
export function getListingImageUrl(item: any): string {
  // Handle direct image_url field
  if (item.image_url && typeof item.image_url === "string") {
    return item.image_url;
  }
  
  // Handle normalized JSONB structure: { primary: string | null, others: string[] }
  if (item.images && typeof item.images === "object" && !Array.isArray(item.images)) {
    // Priority 1: primary image (new inventory JSONB format)
    if (item.images.primary && typeof item.images.primary === "string") {
      return item.images.primary;
    }

    // Priority 2: first image in others array
    if (Array.isArray(item.images.others) && item.images.others.length > 0) {
      const firstOther = item.images.others[0];
      if (typeof firstOther === "string") {
        return firstOther;
      }
    }

    // Legacy object format: { front: "url", back: "url", comicvine_reference: "url" }
    if (item.images.front && typeof item.images.front === "string") {
      return item.images.front;
    }

    if (item.images.back && typeof item.images.back === "string") {
      return item.images.back;
    }

    if (item.images.comicvine_reference && typeof item.images.comicvine_reference === "string") {
      return item.images.comicvine_reference;
    }
  }
  
  // Handle legacy array format: ["url1", "url2"]
  if (item.images && Array.isArray(item.images) && item.images.length > 0) {
    const firstImage = item.images[0];
    if (typeof firstImage === "string") {
      return firstImage;
    }
    if (typeof firstImage === "object" && firstImage.url) {
      return firstImage.url;
    }
  }
  
  // Fallback to comicvine_cover_url if present
  if (item.comicvine_cover_url && typeof item.comicvine_cover_url === "string") {
    return item.comicvine_cover_url;
  }
  
  // Final fallback
  return "/placeholder.svg";
}
