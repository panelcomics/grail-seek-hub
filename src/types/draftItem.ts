/**
 * DraftItem - Unified model for scanner → inventory → listing flow
 * This is the single source of truth for book data across all forms
 */

export interface DraftItem {
  // Database ID (only set after saving to inventory)
  id?: string;
  userId?: string;

  // ComicVine References
  volumeId?: string;      // "4050-1234" format
  issueId?: string;       // "4000-5678" format
  
  // Core Metadata
  title: string;          // Series/volume name (e.g., "Amazing Spider-Man")
  series: string;         // Optional series name if different from title
  issueNumber: string;
  publisher?: string;
  year?: number;
  coverDate?: string;     // ISO date string
  
  // Creator Credits
  writer?: string;
  artist?: string;
  coverArtist?: string;
  
  // Condition & Grading
  condition?: string;     // Raw condition if not slabbed
  isSlab: boolean;
  gradingCompany?: 'CGC' | 'CBCS' | 'PGX' | string;
  grade?: string;         // "9.8", "9.6", etc. (stored as string for flexibility)
  certificationNumber?: string;
  
  // Key Issue Data
  keyIssue: boolean;
  keyDetails?: string;    // "1st Krang, Bebop, Rocksteady"
  
  // Signature Data
  isSigned: boolean;
  signatureType?: string;  // "CGC Signature Series", "CBCS Signature Verified", etc.
  signedBy?: string;       // "Stan Lee", "Todd McFarlane", etc.
  signatureDate?: string;  // Date of signature
  
  // Images - ALWAYS use this exact structure
  images: {
    primary: string | null;
    others: string[];
  };
  
  // Pricing
  listedPrice?: number | null;
  shippingPrice?: number | null;
  
  // Availability Flags
  isForSale: boolean;
  isForTrade: boolean;
  
  // Private Fields
  storageLocation?: string;
  privateNotes?: string;
  inSearchOf?: string;     // For trades
  tradeNotes?: string;     // For trades
  
  // Variant Details
  variantType?: string;
  variantDetails?: string;
  variantNotes?: string;
  
  // System Fields
  listingStatus?: string;  // 'not_listed' | 'listed' | 'sold'
  comicvineIssueId?: string;
  comicvineVolumeId?: string;
}

/**
 * Helper: Convert database inventory_items row to DraftItem
 */
export function dbToDraftItem(dbRow: any): DraftItem {
  // Handle various image formats from database
  let images = { primary: null as string | null, others: [] as string[] };
  
  if (dbRow.images) {
    if (typeof dbRow.images === 'object' && !Array.isArray(dbRow.images)) {
      // Modern format: { primary, others }
      images = {
        primary: dbRow.images.primary || dbRow.images.front || null,
        others: Array.isArray(dbRow.images.others) ? dbRow.images.others : []
      };
    } else if (Array.isArray(dbRow.images)) {
      // Legacy array format
      images = {
        primary: dbRow.images[0] || null,
        others: dbRow.images.slice(1)
      };
    }
  }

  return {
    id: dbRow.id,
    userId: dbRow.user_id,
    volumeId: dbRow.volume_id || dbRow.comicvine_volume_id,
    issueId: dbRow.issue_id || dbRow.comicvine_issue_id,
    title: dbRow.title || '',
    series: dbRow.series || '',
    issueNumber: dbRow.issue_number || '',
    publisher: dbRow.publisher,
    year: dbRow.year,
    coverDate: dbRow.cover_date,
    writer: dbRow.writer,
    artist: dbRow.artist,
    coverArtist: dbRow.cover_artist,
    condition: dbRow.condition,
    isSlab: dbRow.is_slab || false,
    gradingCompany: dbRow.grading_company,
    grade: dbRow.cgc_grade || dbRow.grade,
    certificationNumber: dbRow.certification_number,
    keyIssue: dbRow.is_key || dbRow.key_issue || false,
    keyDetails: dbRow.key_details || dbRow.details,
    isSigned: dbRow.is_signed || false,
    signatureType: dbRow.signature_type,
    signedBy: dbRow.signed_by,
    signatureDate: dbRow.signature_date,
    images,
    listedPrice: dbRow.listed_price,
    shippingPrice: dbRow.shipping_price,
    isForSale: dbRow.for_sale || dbRow.is_for_sale || false,
    isForTrade: dbRow.is_for_trade || false,
    storageLocation: dbRow.storage_location || dbRow.private_location,
    privateNotes: dbRow.private_notes,
    inSearchOf: dbRow.in_search_of,
    tradeNotes: dbRow.trade_notes,
    variantType: dbRow.variant_type,
    variantDetails: dbRow.variant_details,
    variantNotes: dbRow.variant_notes,
    listingStatus: dbRow.listing_status,
    comicvineIssueId: dbRow.comicvine_issue_id,
    comicvineVolumeId: dbRow.comicvine_volume_id,
  };
}

/**
 * Helper: Convert DraftItem to database update payload
 */
export function draftItemToDb(draft: DraftItem): any {
  return {
    title: draft.title,
    series: draft.series || null,
    issue_number: draft.issueNumber || null,
    publisher: draft.publisher || null,
    year: draft.year || null,
    cover_date: draft.coverDate || null,
    writer: draft.writer || null,
    artist: draft.artist || null,
    cover_artist: draft.coverArtist || null,
    condition: draft.condition || null,
    is_slab: draft.isSlab,
    grading_company: draft.isSlab ? draft.gradingCompany : null,
    cgc_grade: draft.isSlab ? draft.grade : null,
    grade: draft.isSlab ? draft.grade : null,
    certification_number: draft.certificationNumber || null,
    key_issue: draft.keyIssue,
    is_key: draft.keyIssue,
    key_details: draft.keyDetails || null,
    is_signed: draft.isSigned || false,
    signature_type: draft.isSigned ? draft.signatureType : null,
    signed_by: draft.isSigned ? draft.signedBy : null,
    signature_date: draft.isSigned ? draft.signatureDate : null,
    images: draft.images,
    listed_price: draft.listedPrice || null,
    shipping_price: draft.shippingPrice || null,
    for_sale: draft.isForSale,
    is_for_sale: draft.isForSale,
    is_for_trade: draft.isForTrade,
    storage_location: draft.storageLocation || null,
    private_location: draft.storageLocation || null,
    private_notes: draft.privateNotes || null,
    in_search_of: draft.isForTrade ? draft.inSearchOf : null,
    trade_notes: draft.isForTrade ? draft.tradeNotes : null,
    variant_type: draft.variantType || null,
    variant_details: draft.variantDetails || null,
    variant_notes: draft.variantNotes || null,
    listing_status: draft.isForSale ? 'listed' : 'not_listed',
    volume_id: draft.volumeId || null,
    issue_id: draft.issueId || null,
    comicvine_volume_id: draft.volumeId || draft.comicvineVolumeId || null,
    comicvine_issue_id: draft.issueId || draft.comicvineIssueId || null,
  };
}

/**
 * GRADE_OPTIONS - Standard CGC/CBCS grading scale
 * From 10.0 (Gem Mint) down to 0.5 (Poor) in 0.1 increments
 */
export const GRADE_OPTIONS = [
  '10.0', '9.9', '9.8', '9.6', '9.4', '9.2', '9.0',
  '8.5', '8.0', '7.5', '7.0', '6.5', '6.0',
  '5.5', '5.0', '4.5', '4.0', '3.5', '3.0',
  '2.5', '2.0', '1.8', '1.5', '1.0', '0.5'
];
