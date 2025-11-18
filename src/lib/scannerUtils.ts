import { ComicVinePick, GroupedResults } from "@/types/comicvine";

const RECENT_SCANS_KEY = 'grailseeker_recent_scans';
const MAX_RECENT_SCANS = 10;

/**
 * Group ComicVine picks by volume
 */
export function groupResultsByVolume(picks: ComicVinePick[]): GroupedResults[] {
  const grouped = new Map<number, GroupedResults>();

  for (const pick of picks) {
    const volumeId = pick.volumeId || pick.id;
    
    if (!grouped.has(volumeId)) {
      const minYear = pick.year || 0;
      const maxYear = pick.year || 0;
      
      grouped.set(volumeId, {
        volume: {
          id: volumeId,
          name: pick.volumeName || pick.title,
          publisher: pick.publisher || 'Unknown',
          yearRange: pick.year ? `${pick.year}` : 'Unknown'
        },
        issues: []
      });
    }

    const group = grouped.get(volumeId)!;
    group.issues.push(pick);
    
    // Update year range
    if (pick.year) {
      const years = group.volume.yearRange.split('–').map(y => parseInt(y) || 0);
      const minYear = Math.min(years[0], pick.year);
      const maxYear = Math.max(years[years.length - 1], pick.year);
      
      if (minYear === maxYear) {
        group.volume.yearRange = `${minYear}`;
      } else {
        group.volume.yearRange = `${minYear}–${maxYear}`;
      }
    }
  }

  // Sort issues within each group by issue number
  const results = Array.from(grouped.values());
  results.forEach(group => {
    group.issues.sort((a, b) => {
      const aNum = parseFloat(a.issue || '0');
      const bNum = parseFloat(b.issue || '0');
      return aNum - bNum;
    });
  });

  return results;
}

/**
 * Save a scan to recent scans in local storage
 */
export function saveToRecentScans(pick: ComicVinePick): void {
  try {
    const stored = localStorage.getItem(RECENT_SCANS_KEY);
    const recent: ComicVinePick[] = stored ? JSON.parse(stored) : [];
    
    // Remove duplicates
    const filtered = recent.filter(r => r.id !== pick.id);
    
    // Add to front
    filtered.unshift(pick);
    
    // Keep only the most recent
    const trimmed = filtered.slice(0, MAX_RECENT_SCANS);
    
    localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save to recent scans:', error);
  }
}

/**
 * Load recent scans from local storage
 */
export function loadRecentScans(): ComicVinePick[] {
  try {
    const stored = localStorage.getItem(RECENT_SCANS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load recent scans:', error);
    return [];
  }
}

/**
 * Build a pre-filled query from extracted tokens
 */
export function buildPrefilledQuery(tokens: {
  title?: string;
  issueNumber?: string;
  publisher?: string;
  year?: number;
} | null): string {
  if (!tokens) return '';
  
  const parts: string[] = [];
  
  if (tokens.title) {
    parts.push(tokens.title);
  }
  
  if (tokens.issueNumber) {
    parts.push(`#${tokens.issueNumber}`);
  }
  
  if (tokens.year) {
    parts.push(`(${tokens.year})`);
  }
  
  if (tokens.publisher) {
    parts.push(tokens.publisher);
  }
  
  return parts.join(' ').trim();
}

/**
 * Filter results based on reprint keywords
 */
export function filterReprints(picks: ComicVinePick[]): ComicVinePick[] {
  const reprintKeywords = [
    'facsimile',
    'true believers',
    'marvel tales',
    'omnibus',
    'tpb',
    'trade paperback',
    'reprint',
    'galerie',
    'panini',
    'collected',
    'essential',
    'masterworks',
    'epic collection'
  ];
  
  return picks.filter(pick => {
    const searchText = `${pick.title} ${pick.variantDescription || ''}`.toLowerCase();
    return !reprintKeywords.some(keyword => searchText.includes(keyword));
  });
}

/**
 * Check if debug mode is enabled via URL
 */
export function isDebugMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === '1' || params.get('debug') === 'true';
}
