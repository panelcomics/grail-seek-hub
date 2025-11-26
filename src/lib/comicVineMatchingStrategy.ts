/**
 * ComicVine Multi-Strategy Matching System
 * Provides helpers for scoring and ranking ComicVine search results
 */

export interface MatchInputs {
  title?: string | null;
  issueNumber?: string | null;
  year?: number | null;
  publisher?: string | null;
  comicvineVolumeId?: number | null;
  comicvineIssueId?: number | null;
}

export interface ScoredMatch {
  score: number;
  scoreBreakdown: {
    title: number;
    issue: number;
    year: number;
    publisher: number;
  };
  matchStrategy: 'id_lookup' | 'structured_search' | 'fuzzy_search';
}

/**
 * Normalize string for comparison
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Calculate string similarity (Jaccard index)
 */
function stringSimilarity(a: string, b: string): number {
  const aNorm = normalize(a);
  const bNorm = normalize(b);
  
  if (aNorm === bNorm) return 1.0;
  if (!aNorm || !bNorm) return 0;
  
  const aWords = new Set(aNorm.split(' '));
  const bWords = new Set(bNorm.split(' '));
  
  const intersection = new Set([...aWords].filter(w => bWords.has(w)));
  const union = new Set([...aWords, ...bWords]);
  
  return intersection.size / union.size;
}

/**
 * Score a title match
 */
export function scoreTitleMatch(searchTitle: string, candidateTitle: string): number {
  if (!searchTitle || !candidateTitle) return 0;
  
  const similarity = stringSimilarity(searchTitle, candidateTitle);
  
  // Bonus for exact match
  if (normalize(searchTitle) === normalize(candidateTitle)) {
    return 0.40; // Perfect 40%
  }
  
  // Scale similarity to 0-40%
  return similarity * 0.40;
}

/**
 * Score an issue number match
 */
export function scoreIssueMatch(searchIssue: string | null, candidateIssue: string): number {
  if (!searchIssue || !candidateIssue) return 0;
  
  const searchNorm = normalize(searchIssue);
  const candNorm = normalize(candidateIssue);
  
  // Exact match
  if (searchNorm === candNorm) {
    return 0.25; // Perfect 25%
  }
  
  // Partial match (e.g., "1" matches "001")
  if (candNorm.includes(searchNorm) || searchNorm.includes(candNorm)) {
    return 0.12; // Partial 12%
  }
  
  return 0;
}

/**
 * Score a year match
 */
export function scoreYearMatch(searchYear: number | null, candidateYear: number | null): number {
  if (!searchYear || !candidateYear) return 0;
  
  const diff = Math.abs(searchYear - candidateYear);
  
  if (diff === 0) return 0.10; // Perfect 10%
  if (diff <= 2) return 0.05; // Close 5%
  
  return 0;
}

/**
 * Score a publisher match
 */
export function scorePublisherMatch(searchPublisher: string | null, candidatePublisher: string | null): number {
  if (!searchPublisher || !candidatePublisher) return 0;
  
  const similarity = stringSimilarity(searchPublisher, candidatePublisher);
  
  // Exact match
  if (normalize(searchPublisher) === normalize(candidatePublisher)) {
    return 0.25; // Perfect 25%
  }
  
  // Scale similarity to 0-25%
  return similarity * 0.25;
}

/**
 * Score a ComicVine match against search inputs
 * Returns a score from 0-1 with breakdown
 */
export function scoreMatch(
  candidate: {
    title?: string | null;
    volumeName?: string | null;
    issue?: string | null;
    year?: number | null;
    publisher?: string | null;
  },
  inputs: MatchInputs
): ScoredMatch {
  const scoreBreakdown = {
    title: 0,
    issue: 0,
    year: 0,
    publisher: 0,
  };
  
  // Determine match strategy
  let matchStrategy: ScoredMatch['matchStrategy'] = 'fuzzy_search';
  
  if (inputs.comicvineIssueId && inputs.comicvineVolumeId) {
    matchStrategy = 'id_lookup';
  } else if (inputs.title || inputs.issueNumber || inputs.year) {
    matchStrategy = 'structured_search';
  }
  
  // Score title (40% weight)
  if (inputs.title) {
    const candidateTitle = candidate.volumeName || candidate.title || '';
    scoreBreakdown.title = scoreTitleMatch(inputs.title, candidateTitle);
  }
  
  // Score issue number (25% weight)
  if (inputs.issueNumber && candidate.issue) {
    scoreBreakdown.issue = scoreIssueMatch(inputs.issueNumber, candidate.issue);
  }
  
  // Score year (10% weight)
  if (inputs.year && candidate.year) {
    scoreBreakdown.year = scoreYearMatch(inputs.year, candidate.year);
  }
  
  // Score publisher (25% weight)
  if (inputs.publisher && candidate.publisher) {
    scoreBreakdown.publisher = scorePublisherMatch(inputs.publisher, candidate.publisher);
  }
  
  // Calculate total score
  const totalScore = Object.values(scoreBreakdown).reduce((sum, val) => sum + val, 0);
  
  // Bonus for strong multi-signal matches
  let bonus = 0;
  if (scoreBreakdown.title >= 0.30 && scoreBreakdown.issue >= 0.20 && scoreBreakdown.publisher >= 0.15) {
    bonus = 0.10; // Strong overall match
  }
  
  return {
    score: Math.min(totalScore + bonus, 1.0),
    scoreBreakdown,
    matchStrategy,
  };
}

/**
 * Rank and sort candidates by score
 */
export function rankCandidates<T extends { score: number }>(candidates: T[]): T[] {
  return [...candidates].sort((a, b) => b.score - a.score);
}

/**
 * Get confidence label for a score
 */
export function getConfidenceLabel(score: number): string {
  if (score >= 0.9) return 'Excellent';
  if (score >= 0.75) return 'High';
  if (score >= 0.60) return 'Good';
  if (score >= 0.40) return 'Moderate';
  return 'Low';
}
