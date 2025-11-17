// ComicVine Result Scoring and Ranking

interface OCRTokens {
  title: string;
  issueNumber: string | null;
  publisher: string | null;
  year: number | null;
}

interface ComicVineIssue {
  id: number;
  name: string;
  issue_number: string;
  volume: {
    name: string;
    publisher?: {
      name?: string;
    };
  };
  cover_date?: string;
  image?: {
    original_url?: string;
    small_url?: string;
  };
}

export interface ScoredCandidate extends ComicVineIssue {
  matchScore: number;
  confidence: 'high' | 'medium' | 'low';
  scoreBreakdown: {
    title: number;
    issue: number;
    publisher: number;
    year: number;
  };
}

/**
 * Calculate Levenshtein distance for fuzzy string matching
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score (0-1) between two strings
 */
function stringSimilarity(a: string, b: string): number {
  const lowerA = a.toLowerCase().trim();
  const lowerB = b.toLowerCase().trim();
  
  // Exact match
  if (lowerA === lowerB) return 1.0;
  
  // One contains the other
  if (lowerA.includes(lowerB) || lowerB.includes(lowerA)) {
    const longer = Math.max(lowerA.length, lowerB.length);
    const shorter = Math.min(lowerA.length, lowerB.length);
    return 0.85 + (shorter / longer) * 0.15;
  }
  
  // Levenshtein distance
  const distance = levenshteinDistance(lowerA, lowerB);
  const maxLength = Math.max(lowerA.length, lowerB.length);
  const similarity = 1 - (distance / maxLength);
  
  return Math.max(0, similarity);
}

/**
 * Score title match (0-1)
 */
function scoreTitleMatch(ocrTitle: string, cvTitle: string): number {
  // Try matching against both issue name and volume name
  const volumeSimilarity = stringSimilarity(ocrTitle, cvTitle);
  
  // Bonus for exact word matches
  const ocrWords = new Set(ocrTitle.toLowerCase().split(/\s+/));
  const cvWords = new Set(cvTitle.toLowerCase().split(/\s+/));
  const intersection = new Set([...ocrWords].filter(w => cvWords.has(w)));
  const wordMatchRatio = intersection.size / Math.max(ocrWords.size, cvWords.size);
  
  // Weighted combination
  return volumeSimilarity * 0.7 + wordMatchRatio * 0.3;
}

/**
 * Score issue number match (0 or 1)
 * CRITICAL: Issue mismatch caps final score at 0.49
 */
function scoreIssueMatch(ocrIssue: string | null, cvIssue: string): number {
  if (!ocrIssue) return 0;
  
  // Normalize both (remove leading zeros, etc.)
  const normalizeIssue = (issue: string) => {
    return parseInt(issue.replace(/^0+/, '')) || issue;
  };
  
  const normalizedOcr = normalizeIssue(ocrIssue);
  const normalizedCv = normalizeIssue(cvIssue);
  
  return normalizedOcr === normalizedCv ? 1.0 : 0;
}

/**
 * Score publisher match (0 or 1)
 */
function scorePublisherMatch(ocrPublisher: string | null, cvPublisher?: string): number {
  if (!ocrPublisher || !cvPublisher) return 0;
  
  const ocrLower = ocrPublisher.toLowerCase();
  const cvLower = cvPublisher.toLowerCase();
  
  // Check if one contains the other (e.g., "DC" vs "DC Comics")
  if (cvLower.includes(ocrLower) || ocrLower.includes(cvLower)) {
    return 1.0;
  }
  
  return 0;
}

/**
 * Score year match (0-1, but low weight)
 */
function scoreYearMatch(ocrYear: number | null, cvCoverDate?: string): number {
  if (!ocrYear || !cvCoverDate) return 0;
  
  // Extract year from cover date (format: "YYYY-MM-DD")
  const yearMatch = cvCoverDate.match(/^(\d{4})/);
  if (!yearMatch) return 0;
  
  const cvYear = parseInt(yearMatch[1]);
  const diff = Math.abs(cvYear - ocrYear);
  
  if (diff === 0) return 1.0;
  if (diff === 1) return 0.8;
  if (diff <= 2) return 0.5;
  if (diff <= 5) return 0.3;
  
  return 0;
}

/**
 * Score a single candidate
 * ENFORCES: Issue mismatch caps score at 0.49
 */
export function scoreCandidate(
  candidate: ComicVineIssue,
  tokens: OCRTokens
): ScoredCandidate {
  const titleScore = scoreTitleMatch(tokens.title, candidate.volume.name);
  const issueScore = scoreIssueMatch(tokens.issueNumber, candidate.issue_number);
  const publisherScore = scorePublisherMatch(
    tokens.publisher,
    candidate.volume.publisher?.name
  );
  const yearScore = scoreYearMatch(tokens.year, candidate.cover_date);
  
  // Weighted total: 45% title, 35% issue, 10% publisher, 10% year
  let matchScore = 
    titleScore * 0.45 +
    issueScore * 0.35 +
    publisherScore * 0.10 +
    yearScore * 0.10;
  
  // CRITICAL RULE: If OCR detected an issue number but it doesn't match, cap score at 0.49
  if (tokens.issueNumber && issueScore === 0) {
    matchScore = Math.min(matchScore, 0.49);
  }
  
  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low';
  if (matchScore >= 0.80) {
    confidence = 'high';
  } else if (matchScore >= 0.50) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }
  
  return {
    ...candidate,
    matchScore,
    confidence,
    scoreBreakdown: {
      title: titleScore,
      issue: issueScore,
      publisher: publisherScore,
      year: yearScore
    }
  };
}

/**
 * Score and rank all candidates
 */
export function rankCandidates(
  candidates: ComicVineIssue[],
  tokens: OCRTokens
): ScoredCandidate[] {
  const scored = candidates.map(candidate => scoreCandidate(candidate, tokens));
  
  // Sort by score (highest first)
  scored.sort((a, b) => b.matchScore - a.matchScore);
  
  return scored;
}

/**
 * Get confidence label for display
 */
export function getConfidenceLabel(score: number): string {
  if (score >= 0.80) return 'Best Match';
  if (score >= 0.50) return 'Possible Match';
  return 'Low Confidence – Likely Not Your Comic';
}
