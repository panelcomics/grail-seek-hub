// ComicVine Query Builder with Multiple Strategies

interface OCRTokens {
  title: string;
  titleTokens: string[];
  issueNumber: string | null;
  publisher: string | null;
  year: number | null;
}

export interface ComicVineQuery {
  query: string;
  strategy: 'primary' | 'variant' | 'loose' | 'fallback';
  priority: number;
}

/**
 * Build multiple ComicVine search queries with fallbacks
 */
export function buildComicVineQueries(tokens: OCRTokens): ComicVineQuery[] {
  const queries: ComicVineQuery[] = [];
  
  if (!tokens.title) {
    return queries;
  }
  
  // Strategy 1: Title + Issue Number (highest priority)
  if (tokens.issueNumber) {
    queries.push({
      query: `${tokens.title} ${tokens.issueNumber}`,
      strategy: 'primary',
      priority: 100
    });
    
    // Variant: Title + #Issue
    queries.push({
      query: `${tokens.title} #${tokens.issueNumber}`,
      strategy: 'variant',
      priority: 95
    });
    
    // If we have publisher, add it
    if (tokens.publisher) {
      queries.push({
        query: `${tokens.title} ${tokens.issueNumber} ${tokens.publisher}`,
        strategy: 'variant',
        priority: 90
      });
    }
    
    // If we have year, add it (but lower priority since OCR year is unreliable)
    if (tokens.year) {
      queries.push({
        query: `${tokens.title} (${tokens.year}) ${tokens.issueNumber}`,
        strategy: 'variant',
        priority: 85
      });
    }
  }
  
  // Strategy 2: Title only (when issue number missing or low confidence)
  queries.push({
    query: tokens.title,
    strategy: 'loose',
    priority: 70
  });
  
  // Strategy 3: Title + Publisher (if available)
  if (tokens.publisher) {
    queries.push({
      query: `${tokens.title} ${tokens.publisher}`,
      strategy: 'loose',
      priority: 75
    });
  }
  
  // Strategy 4: Individual tokens (last resort)
  if (tokens.titleTokens.length > 0) {
    // Use the longest token as fallback
    const longestToken = tokens.titleTokens.reduce((a, b) => 
      a.length > b.length ? a : b
    );
    
    if (longestToken.length >= 4) {
      queries.push({
        query: longestToken,
        strategy: 'fallback',
        priority: 50
      });
    }
  }
  
  // Sort by priority (highest first)
  queries.sort((a, b) => b.priority - a.priority);
  
  return queries;
}

/**
 * Build a manual search query (simpler logic for user input)
 */
export function buildManualSearchQuery(searchText: string): ComicVineQuery {
  return {
    query: searchText.trim(),
    strategy: 'primary',
    priority: 100
  };
}
