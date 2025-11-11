// CGC/CBCS slab text parsing utilities

interface SlabData {
  title: string;
  issueNumber: string;
  publisher: string;
  year: string;
  grade: string;
  certNumber: string;
  gradingCompany: 'CGC' | 'CBCS' | null;
}

/**
 * Parse OCR text from CGC/CBCS slab labels
 * Prioritizes label text over cover text for better accuracy
 */
export function parseSlabText(ocrText: string): Partial<SlabData> {
  const result: Partial<SlabData> = {};
  
  // Detect grading company
  if (/\bCGC\b/i.test(ocrText)) {
    result.gradingCompany = 'CGC';
  } else if (/\bCBCS\b/i.test(ocrText)) {
    result.gradingCompany = 'CBCS';
  }
  
  // Extract certification number (CGC: 10-digit, CBCS: similar patterns)
  const certMatch = ocrText.match(/\b\d{10,12}\b/);
  if (certMatch) {
    result.certNumber = certMatch[0];
  }
  
  // Extract grade (formats: "9.8", "NM/M 9.8", "CGC 9.8", etc.)
  const gradeMatch = ocrText.match(/\b(\d+\.\d+)\b/) || 
                     ocrText.match(/\b(NM\/M|NM|VF\/NM|VF|FN|GD|PR)\b/i);
  if (gradeMatch) {
    result.grade = gradeMatch[0];
  }
  
  // Extract title (usually appears before issue number or after publisher)
  // Look for patterns like "BATMAN", "AMAZING SPIDER-MAN", etc.
  const titlePatterns = [
    // Pattern: "DC Comics BATMAN #232"
    /(?:DC|Marvel|Image|Dark Horse|IDW)\s+(?:Comics?\s+)?([A-Z][A-Z\s\-']+?)(?:\s+#|\s+\d+)/i,
    // Pattern: "BATMAN #232 DC"
    /([A-Z][A-Z\s\-']+?)(?:\s+#\d+|\s+\d+)/,
    // Pattern: Multi-word titles with proper nouns
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})\b/
  ];
  
  for (const pattern of titlePatterns) {
    const match = ocrText.match(pattern);
    if (match && match[1] && match[1].length > 3) {
      result.title = match[1].trim();
      break;
    }
  }
  
  // Extract issue number
  const issueMatch = ocrText.match(/#\s*(\d+)/) || 
                     ocrText.match(/\b(?:No\.|Issue)\s*(\d+)/i) ||
                     ocrText.match(/\b(\d{1,4})\b/); // Fallback to any 1-4 digit number
  if (issueMatch) {
    result.issueNumber = issueMatch[1];
  }
  
  // Extract publisher (common publishers)
  const publisherMatch = ocrText.match(/\b(DC|Marvel|Image|Dark Horse|IDW|Vertigo|Wildstorm)(?:\s+Comics?)?\b/i);
  if (publisherMatch) {
    result.publisher = publisherMatch[1];
  }
  
  // Extract year (4-digit year, typically in label or cover date)
  const yearMatch = ocrText.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    result.year = yearMatch[1];
  }
  
  return result;
}

/**
 * Build optimized ComicVine search query from slab data
 * Prioritizes most reliable fields
 */
export function buildSlabQuery(slabData: Partial<SlabData>, fallbackText: string): string {
  const parts: string[] = [];
  
  // Priority 1: Title (most important)
  if (slabData.title) {
    parts.push(slabData.title);
  }
  
  // Priority 2: Issue number
  if (slabData.issueNumber) {
    parts.push(`#${slabData.issueNumber}`);
  }
  
  // Priority 3: Publisher (helps narrow results)
  if (slabData.publisher) {
    parts.push(slabData.publisher);
  }
  
  // Priority 4: Year (if no title, use year to narrow)
  if (!slabData.title && slabData.year) {
    parts.push(slabData.year);
  }
  
  // If we got good data from label, use it
  if (parts.length >= 2) {
    return parts.join(' ');
  }
  
  // Fallback to cleaned OCR text if label parsing failed
  const cleanFallback = fallbackText
    .replace(/\n/g, ' ')
    .replace(/[^a-zA-Z0-9#\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60); // Limit length
  
  return cleanFallback || parts.join(' ');
}
