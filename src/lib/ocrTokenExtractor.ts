// OCR Token Extraction for Comic Scanner
// Handles both raw and slabbed comics

interface OCRTokens {
  titleTokens: string[];
  title: string;
  issueNumber: string | null;
  publisher: string | null;
  year: number | null;
  confidence: {
    title: number;
    issue: number;
    publisher: number;
    year: number;
  };
}

// Words to exclude from title detection
const EXCLUDED_WORDS = new Set([
  'comics', 'comic', 'presents', 'special', 'annual', 'giant',
  'featuring', 'starring', 'adventures', 'tales', 'stories',
  'magazine', 'collection', 'edition', 'volume', 'series'
]);

// Slab-related terms to ignore
const SLAB_TERMS = new Set([
  'cgc', 'cbcs', 'universal', 'grade', 'certification', 'serial',
  'white', 'pages', 'off-white', 'newton', 'rings', 'label',
  'witnessed', 'authentic', 'slab', 'signature', 'restored',
  'graded', 'certified', 'encapsulated'
]);

// Known publishers
const PUBLISHERS = [
  'DC', 'Marvel', 'Image', 'Dark Horse', 'IDW', 'Boom', 'Vertigo',
  'Wildstorm', 'Archie', 'Valiant', 'Dynamite', 'Top Cow'
];

/**
 * Check if text is likely from slab label area
 */
function isSlabText(text: string): boolean {
  const lower = text.toLowerCase();
  
  // Check for slab terms
  for (const term of SLAB_TERMS) {
    if (lower.includes(term)) return true;
  }
  
  // Check for grade pattern (0.5 - 10.0)
  if (/\b([0-9]|10)\.([0-9])\b/.test(text)) return true;
  
  // Check for long numeric sequences (cert numbers)
  if (/\b\d{6,}\b/.test(text)) return true;
  
  return false;
}

/**
 * Extract issue number from text
 */
function extractIssueNumber(text: string): { number: string | null; confidence: number } {
  // Remove slab text first
  const lines = text.split('\n').filter(line => !isSlabText(line));
  const cleanText = lines.join(' ');
  
  // Pattern 1: #123
  let match = cleanText.match(/#\s*(\d{1,4})\b/);
  if (match) return { number: match[1], confidence: 0.95 };
  
  // Pattern 2: No. 123 or No 123
  match = cleanText.match(/\bNo\.?\s*(\d{1,4})\b/i);
  if (match) return { number: match[1], confidence: 0.90 };
  
  // Pattern 3: Issue 123
  match = cleanText.match(/\bIssue\s*(\d{1,4})\b/i);
  if (match) return { number: match[1], confidence: 0.85 };
  
  // Pattern 4: Isolated 1-4 digit number (lower confidence)
  const numbers = cleanText.match(/\b(\d{1,4})\b/g);
  if (numbers && numbers.length > 0) {
    // Prefer numbers that appear early in text
    const firstNumber = numbers[0];
    const num = parseInt(firstNumber);
    // Reasonable issue number range
    if (num >= 1 && num <= 9999) {
      return { number: firstNumber, confidence: 0.60 };
    }
  }
  
  return { number: null, confidence: 0 };
}

/**
 * Extract publisher from text
 */
function extractPublisher(text: string): { publisher: string | null; confidence: number } {
  const upper = text.toUpperCase();
  
  for (const pub of PUBLISHERS) {
    const pattern = new RegExp(`\\b${pub}(?:\\s+COMICS?)?\\b`, 'i');
    if (pattern.test(text)) {
      return { publisher: pub, confidence: 0.85 };
    }
  }
  
  return { publisher: null, confidence: 0 };
}

/**
 * Extract year from text
 */
function extractYear(text: string): { year: number | null; confidence: number } {
  // Match 4-digit years (1930-2030)
  const match = text.match(/\b(19[3-9]\d|20[0-3]\d)\b/);
  if (match) {
    return { year: parseInt(match[1]), confidence: 0.70 };
  }
  return { year: null, confidence: 0 };
}

/**
 * Extract title tokens from text
 */
function extractTitle(text: string): { title: string; tokens: string[]; confidence: number } {
  // Remove slab text and filter lines
  const lines = text.split('\n')
    .filter(line => !isSlabText(line))
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  if (lines.length === 0) {
    return { title: '', tokens: [], confidence: 0 };
  }
  
  // Usually the title is in the first few lines, and often the longest/boldest
  // Look for lines with 2-5 words that aren't excluded
  const candidates: Array<{ text: string; score: number }> = [];
  
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    const words = line.split(/\s+/).filter(w => w.length > 0);
    
    // Skip single words or very long lines
    if (words.length < 1 || words.length > 6) continue;
    
    // Skip if mostly excluded words
    const validWords = words.filter(w => 
      !EXCLUDED_WORDS.has(w.toLowerCase()) && 
      !/^\d+$/.test(w) && // not just numbers
      w.length > 1
    );
    
    if (validWords.length === 0) continue;
    
    // Score based on position (earlier = better), word count, and length
    const positionScore = (5 - i) / 5;
    const wordScore = Math.min(validWords.length / 3, 1);
    const lengthScore = Math.min(line.length / 20, 1);
    
    const score = positionScore * 0.5 + wordScore * 0.3 + lengthScore * 0.2;
    
    candidates.push({
      text: validWords.join(' '),
      score
    });
  }
  
  // Sort by score and take the best
  candidates.sort((a, b) => b.score - a.score);
  
  if (candidates.length > 0) {
    const best = candidates[0];
    const tokens = best.text.split(/\s+/);
    return {
      title: best.text,
      tokens,
      confidence: Math.min(best.score + 0.3, 0.95)
    };
  }
  
  // Fallback: take first non-slab line
  const fallback = lines[0];
  const tokens = fallback.split(/\s+/).filter(w => 
    !EXCLUDED_WORDS.has(w.toLowerCase()) && w.length > 1
  );
  
  return {
    title: tokens.join(' '),
    tokens,
    confidence: 0.50
  };
}

/**
 * Main extraction function
 */
export function extractTokensFromOcr(ocrText: string): OCRTokens {
  if (!ocrText || ocrText.trim().length === 0) {
    return {
      titleTokens: [],
      title: '',
      issueNumber: null,
      publisher: null,
      year: null,
      confidence: { title: 0, issue: 0, publisher: 0, year: 0 }
    };
  }
  
  const titleData = extractTitle(ocrText);
  const issueData = extractIssueNumber(ocrText);
  const publisherData = extractPublisher(ocrText);
  const yearData = extractYear(ocrText);
  
  return {
    titleTokens: titleData.tokens,
    title: titleData.title,
    issueNumber: issueData.number,
    publisher: publisherData.publisher,
    year: yearData.year,
    confidence: {
      title: titleData.confidence,
      issue: issueData.confidence,
      publisher: publisherData.confidence,
      year: yearData.confidence
    }
  };
}
