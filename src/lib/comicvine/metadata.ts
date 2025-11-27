/**
 * ComicVine Metadata Extraction
 * Extracts writer, artist, key issue data from ComicVine API responses
 */

export interface PersonCredit {
  name: string;
  role: string;
}

export interface ComicVineIssue {
  id: number;
  name?: string;
  issue_number?: string;
  volume?: {
    id: number;
    name: string;
    publisher?: { name: string };
  };
  cover_date?: string;
  image?: {
    small_url?: string;
    original_url?: string;
  };
  person_credits?: PersonCredit[];
  character_credits?: Array<{ name: string }>;
  deck?: string;
  description?: string;
}

/**
 * Extract writer from person_credits
 */
export function extractWriter(personCredits: PersonCredit[] | undefined): string | null {
  if (!personCredits || !Array.isArray(personCredits)) {
    return null;
  }

  const writerCredit = personCredits.find((credit) => {
    const role = credit.role?.toLowerCase() || '';
    return role.includes('writer') || role.includes('script');
  });

  return writerCredit?.name || null;
}

/**
 * Extract artist from person_credits
 * Prefers penciler/interior artist over cover artist
 */
export function extractArtist(personCredits: PersonCredit[] | undefined): string | null {
  if (!personCredits || !Array.isArray(personCredits)) {
    return null;
  }

  // Try to find penciler or interior artist first
  const interiorArtist = personCredits.find((credit) => {
    const role = credit.role?.toLowerCase() || '';
    return (
      role.includes('penciler') ||
      role.includes('pencils') ||
      role.includes('inker') ||
      role.includes('illustrator') ||
      (role.includes('artist') && !role.includes('cover'))
    );
  });

  if (interiorArtist) {
    return interiorArtist.name;
  }

  // Fallback to cover artist if no interior artist found
  const coverArtist = personCredits.find((credit) =>
    credit.role?.toLowerCase().includes('cover')
  );

  return coverArtist?.name || null;
}

/**
 * Extract cover artist from person_credits
 */
export function extractCoverArtist(personCredits: PersonCredit[] | undefined): string | null {
  if (!personCredits || !Array.isArray(personCredits)) {
    return null;
  }

  const coverCredit = personCredits.find((credit) =>
    credit.role?.toLowerCase().includes('cover')
  );

  return coverCredit?.name || null;
}

/**
 * Extract key issue notes from description, deck, and character credits
 * Looks for patterns like "1st appearance", "first app", "origin of", etc.
 */
export function extractKeyNotes(issue: ComicVineIssue): string | null {
  const keyPatterns = [
    /1st\s+(?:appearance|app\.?)\s+(?:of\s+)?(.+?)(?:\.|,|$)/gi,
    /first\s+appearance\s+(?:of\s+)?(.+?)(?:\.|,|$)/gi,
    /origin\s+(?:of\s+)?(.+?)(?:\.|,|$)/gi,
    /debut\s+(?:of\s+)?(.+?)(?:\.|,|$)/gi,
    /introduces?\s+(.+?)(?:\.|,|$)/gi,
  ];

  const keyNotes: string[] = [];
  const text = [
    issue.deck || '',
    issue.description || '',
    (issue.character_credits || []).map((c) => c.name).join(', '),
  ].join(' ');

  for (const pattern of keyPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        // Clean up the matched text
        const note = match[1]
          .trim()
          .replace(/<[^>]+>/g, '') // Remove HTML tags
          .replace(/\s+/g, ' ')
          .substring(0, 100); // Limit length
        
        if (note && !keyNotes.includes(note)) {
          keyNotes.push(note);
        }
      }
    }
  }

  return keyNotes.length > 0 ? keyNotes.join('; ') : null;
}

/**
 * Map ComicVine issue to partial DraftItem
 */
export function mapComicVineIssueToDraft(issue: ComicVineIssue): any {
  const writer = extractWriter(issue.person_credits);
  const artist = extractArtist(issue.person_credits);
  const coverArtist = extractCoverArtist(issue.person_credits);
  const keyNotes = extractKeyNotes(issue);

  return {
    volumeId: issue.volume?.id ? String(issue.volume.id) : undefined,
    issueId: String(issue.id),
    title: issue.volume?.name || issue.name || '',
    series: issue.volume?.name || '',
    issueNumber: issue.issue_number || '',
    publisher: issue.volume?.publisher?.name,
    year: issue.cover_date ? new Date(issue.cover_date).getFullYear() : undefined,
    coverDate: issue.cover_date,
    writer,
    artist,
    coverArtist,
    keyIssue: !!keyNotes,
    keyDetails: keyNotes || undefined,
  };
}
