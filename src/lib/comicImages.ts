import { supabase } from "@/integrations/supabase/client";

export interface ComicImage {
  id: string;
  comic_id: string;
  storage_path: string;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
  created_by: string | null;
}

/**
 * Upload image to storage and insert record in user_comic_images
 */
export async function uploadComicImage(
  comicId: string,
  file: File,
  isCover: boolean = false,
  sortOrder: number = 0
) {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("User not authenticated");

  // Generate unique filename
  const fileExt = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const storagePath = `${userId}/${comicId}/${fileName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("comic-photos")
    .upload(storagePath, file);

  if (uploadError) throw uploadError;

  // Insert record
  const { data, error: insertError } = await supabase
    .from("user_comic_images")
    .insert({
      comic_id: comicId,
      storage_path: storagePath,
      sort_order: sortOrder,
      is_cover: isCover,
      created_by: userId,
    })
    .select()
    .single();

  if (insertError) {
    // Rollback storage upload if DB insert fails
    await supabase.storage.from("comic-photos").remove([storagePath]);
    throw insertError;
  }

  return data as ComicImage;
}

/**
 * List all images for a comic, ordered by sort_order ASC, created_at ASC
 */
export async function listComicImages(comicId: string) {
  const { data, error } = await supabase
    .from("user_comic_images")
    .select("*")
    .eq("comic_id", comicId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as ComicImage[];
}

/**
 * Get public URL for a comic image
 */
export function getComicImageUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from("comic-photos")
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Update sort order for drag-drop reordering
 */
export async function updateImageSortOrder(imageId: string, newSortOrder: number) {
  const { error } = await supabase
    .from("user_comic_images")
    .update({ sort_order: newSortOrder })
    .eq("id", imageId);

  if (error) throw error;
}

/**
 * Update multiple images' sort order (for bulk reordering)
 */
export async function bulkUpdateSortOrder(updates: { id: string; sort_order: number }[]) {
  const promises = updates.map(({ id, sort_order }) =>
    supabase
      .from("user_comic_images")
      .update({ sort_order })
      .eq("id", id)
  );

  const results = await Promise.all(promises);
  const errors = results.filter((r) => r.error).map((r) => r.error);
  if (errors.length > 0) throw errors[0];
}

/**
 * Set cover image (ensures only one cover per comic)
 */
export async function setComicCover(comicId: string, imageId: string) {
  // First, unset all covers for this comic
  const { error: unsetError } = await supabase
    .from("user_comic_images")
    .update({ is_cover: false })
    .eq("comic_id", comicId);

  if (unsetError) throw unsetError;

  // Then set the new cover
  const { error: setError } = await supabase
    .from("user_comic_images")
    .update({ is_cover: true })
    .eq("id", imageId);

  if (setError) throw setError;
}

/**
 * Delete image record and remove file from storage
 */
export async function deleteComicImage(imageId: string, storagePath: string) {
  // Delete from database first
  const { error: dbError } = await supabase
    .from("user_comic_images")
    .delete()
    .eq("id", imageId);

  if (dbError) throw dbError;

  // Then remove from storage
  const { error: storageError } = await supabase.storage
    .from("comic-photos")
    .remove([storagePath]);

  if (storageError) {
    console.error("Failed to remove file from storage:", storageError);
    // Don't throw - DB deletion succeeded, storage cleanup is secondary
  }
}

/**
 * Get the cover image for a comic (or first image if no cover set)
 */
export async function getComicCoverImage(comicId: string) {
  const { data, error } = await supabase
    .from("user_comic_images")
    .select("*")
    .eq("comic_id", comicId)
    .order("is_cover", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as ComicImage | null;
}

/**
 * Get all images for a comic ordered for display (cover first)
 */
export async function getComicImagesOrdered(comicId: string) {
  const { data, error } = await supabase
    .from("user_comic_images")
    .select("*")
    .eq("comic_id", comicId)
    .order("is_cover", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as ComicImage[];
}
