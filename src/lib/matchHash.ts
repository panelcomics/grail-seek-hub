/**
 * Generate a normalized hash for comic matching
 * Used for verified match cache lookups
 */

export interface MatchData {
  title: string;
  issue?: string | null;
  publisher?: string | null;
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[^\w\s]/g, '');
}

export async function matchHash(data: MatchData): Promise<string> {
  const { title, issue, publisher } = data;
  
  // Normalize and combine key fields
  const parts = [
    normalize(title),
    issue ? normalize(issue) : '',
    publisher ? normalize(publisher) : ''
  ];
  
  const combined = parts.join('|');
  
  // Generate SHA-1 hash
  const encoder = new TextEncoder();
  const data_buf = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data_buf);
  
  // Convert to hex and take first 12 chars
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex.substring(0, 12);
}
