import { supabase } from "@/integrations/supabase/client";
import { ComicVinePick } from "@/types/comicvine";

/**
 * Extract key issue notes from ComicVine description
 * Looks for phrases like "1st appearance", "origin of", "death of"
 */
export function extractKeyNotes(description: string | null | undefined): string {
  if (!description) return "";
  
  // Strip HTML tags
  const plainText = description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  const keyPhrases = [
    '1st appearance',
    'first appearance',
    'origin of',
    'death of',
    'introduction of',
    'debut of',
    'last appearance',
    'key issue',
    'cameo'
  ];
  
  const sentences = plainText.split(/[.!?]+/);
  const keyNotes: string[] = [];
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (keyPhrases.some(phrase => lowerSentence.includes(phrase))) {
      keyNotes.push(sentence.trim());
    }
  }
  
  return keyNotes.slice(0, 3).join('. ');
}

/**
 * Save a scan to the database
 */
export async function saveScanToHistory(
  userId: string,
  imageUrl: string,
  pick: ComicVinePick,
  keyNotes?: string
) {
  try {
    const { error } = await supabase
      .from('user_scan_history')
      .insert({
        user_id: userId,
        image_url: imageUrl,
        comicvine_issue_id: pick.id,
        comicvine_cover_url: pick.coverUrl,
        title: pick.volumeName || pick.title,
        issue_number: pick.issue,
        publisher: pick.publisher,
        year: pick.year,
        writer: pick.writer,
        artist: pick.artist,
        key_notes: keyNotes
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to save scan to history:', error);
    return false;
  }
}

/**
 * Load recent scans from database
 */
export async function loadScanHistory(userId: string, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('user_scan_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    // Convert to ComicVinePick format
    return (data || []).map((item): ComicVinePick => ({
      id: item.comicvine_issue_id || 0,
      resource: 'issue',
      title: item.title,
      issue: item.issue_number,
      year: item.year,
      publisher: item.publisher,
      volumeName: item.title,
      thumbUrl: item.image_url,
      coverUrl: item.comicvine_cover_url || item.image_url,
      writer: item.writer,
      artist: item.artist,
      score: 1,
      isReprint: false
    }));
  } catch (error) {
    console.error('Failed to load scan history:', error);
    return [];
  }
}

/**
 * Delete a scan from history
 */
export async function deleteScanFromHistory(historyId: string) {
  try {
    const { error } = await supabase
      .from('user_scan_history')
      .delete()
      .eq('id', historyId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to delete scan from history:', error);
    return false;
  }
}
