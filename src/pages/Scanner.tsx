import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Search, AlertCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast as sonnerToast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Types
import { ComicVinePick } from "@/types/comicvine";
import { 
  ScannerState, 
  determineScannerState, 
  CONFIDENCE_THRESHOLDS,
  SCAN_AUTO_CONFIRM_THRESHOLD
} from "@/types/scannerState";

// Screen Components
import { ScannerIdleScreen } from "@/components/scanner/ScannerIdleScreen";
import { ScannerScanningScreen } from "@/components/scanner/ScannerScanningScreen";
import { ScannerTransitionScreen } from "@/components/scanner/ScannerTransitionScreen";
import { ScanResultSummaryCard } from "@/components/scanner/ScanResultSummaryCard";
import { ScannerMatchHighScreen } from "@/components/scanner/ScannerMatchHighScreen";
import { ScannerMatchMediumScreen } from "@/components/scanner/ScannerMatchMediumScreen";
import { ScannerMatchLowScreen } from "@/components/scanner/ScannerMatchLowScreen";
import { ScannerMultiMatchScreen } from "@/components/scanner/ScannerMultiMatchScreen";
import { ScannerConfirmScreen } from "@/components/scanner/ScannerConfirmScreen";
import { ScannerSuccessScreen } from "@/components/scanner/ScannerSuccessScreen";
import { ScannerErrorScreen } from "@/components/scanner/ScannerErrorScreen";
import { ScannerAssistChips, ScanContext, applyPublisherBias } from "@/components/scanner/ScannerAssistChips";
import { VariantInfo } from "@/components/scanner/VariantBadge";
import { TopMatchesChooser, TopMatch } from "@/components/scanner/TopMatchesChooser";

// Other Components
import { ScannerListingForm } from "@/components/ScannerListingForm";
import { VolumeGroupedResults } from "@/components/scanner/VolumeGroupedResults";
import { RecentScans } from "@/components/scanner/RecentScans";
import { DebugPanel } from "@/components/scanner/DebugPanel";
import { CoverZoomModal } from "@/components/scanner/CoverZoomModal";
import { QuickFilterChips } from "@/components/scanner/QuickFilterChips";
import { ScannerActions } from "@/components/scanner/ScannerActions";
import { ManualConfirmPanel, checkForStoredCorrection } from "@/components/scanner/ManualConfirmPanel";
import { AdminScannerDebugPanel } from "@/components/scanner/AdminScannerDebugPanel";
import { VolumeIssuePicker } from "@/components/scanner/VolumeIssuePicker";
import { ScannerCorrectionSheet, CorrectionCandidate } from "@/components/scanner/ScannerCorrectionSheet";
import { useAdminCheck } from "@/hooks/useAdminCheck";

// Vision Match Hook
import { useVisionMatch, applyVisionOverride } from "@/hooks/useVisionMatch";

// Utils
import { compressImageDataUrl, createThumbnail } from "@/lib/imageCompression";
import { 
  groupResultsByVolume, 
  saveToRecentScans, 
  loadRecentScans,
  buildPrefilledQuery,
  filterReprints,
  isDebugMode
} from "@/lib/scannerUtils";
import { saveScanToHistory, loadScanHistory } from "@/lib/scanHistoryUtils";

interface PrefillData {
  title?: string;
  series?: string;
  issueNumber?: string;
  publisher?: string;
  year?: string | number;
  comicvineId?: string | number;
  comicvineCoverUrl?: string;
  description?: string;
}

/**
 * Extract key issue notes from raw OCR text (especially CGC/CBCS labels)
 * This is more reliable than ComicVine API for slabbed books
 */
function extractKeyNotesFromOCR(ocrText: string): string | null {
  if (!ocrText) return null;
  
  const keyPatterns = [
    // "1st appearance of [character]" - most common format on CGC labels
    /1st\s+appearance\s+of\s+([^.,;!\n]+)/gi,
    /first\s+appearance\s+of\s+([^.,;!\n]+)/gi,
    // "Origin of [character]"
    /origin\s+of\s+([^.,;!\n]+)/gi,
    // "Death of [character]"
    /death\s+of\s+([^.,;!\n]+)/gi,
    // "1st [character]" - shorter format
    /1st\s+([A-Z][a-zA-Z\s]+?)(?:\s+appearance|\.|,|;|$)/g,
  ];
  
  const keyNotes: string[] = [];
  
  for (const pattern of keyPatterns) {
    let match;
    while ((match = pattern.exec(ocrText)) !== null) {
      if (match[0] && match[0].trim().length > 3) {
        // Clean up the match - remove HTML, extra spaces
        const note = match[0]
          .trim()
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .substring(0, 100);
        
        // Avoid duplicates (case-insensitive)
        if (note && !keyNotes.some(n => n.toLowerCase() === note.toLowerCase())) {
          keyNotes.push(note);
        }
      }
    }
  }
  
  return keyNotes.length > 0 ? keyNotes.join('; ') : null;
}

export default function Scanner() {
  const { user } = useAuth();
  const { isAdmin } = useAdminCheck();
  const { toast } = useToast();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Vision match hook for cover image similarity with auto-learning
  const { 
    runVisionMatch, 
    shouldTriggerVision, 
    saveVisionResultToCache,
    isLoading: visionLoading 
  } = useVisionMatch();
  
  // CRITICAL FIX: Store uploaded URL in ref to avoid React state timing issues
  const uploadedImageUrlRef = useRef<string | null>(null);
  // Store compressed image for vision matching
  const compressedImageRef = useRef<string | null>(null);
  // Store OCR text for auto-learning cache
  const ocrTextRef = useRef<string | null>(null);

  // New UX state machine
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [loading, setLoading] = useState(false);
  const [errorType, setErrorType] = useState<'camera' | 'image' | 'network' | null>(null);
  
  // Image state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  
  // Search state
  const [manualSearchQuery, setManualSearchQuery] = useState("");
  const [manualSearchIssue, setManualSearchIssue] = useState("");
  const [manualSearchYear, setManualSearchYear] = useState("");
  const [manualSearchLoading, setManualSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ComicVinePick[]>([]);
  const [volumeResults, setVolumeResults] = useState<any[]>([]);
  const [searchSource, setSearchSource] = useState<'local' | 'live' | null>(null);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 20,
    totalResults: 0,
    hasMore: false
  });
  
  // Selected state
  const [selectedPick, setSelectedPick] = useState<ComicVinePick | null>(null);
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  
  // Filter state
  const [filterNotReprint, setFilterNotReprint] = useState(false);
  const [filterWrongYear, setFilterWrongYear] = useState(false);
  const [filterSlabbed, setFilterSlabbed] = useState(false);
  
  // UI state
  const [recentScans, setRecentScans] = useState<ComicVinePick[]>([]);
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false); // Track if user entered manually
  const [variantInfo, setVariantInfo] = useState<VariantInfo | null>(null); // Track detected variant
  const [topMatches, setTopMatches] = useState<TopMatch[]>([]); // Top matches from volume-first fallback
  const [needsUserConfirmation, setNeedsUserConfirmation] = useState(false); // Show chooser when low confidence
  const [showManualConfirm, setShowManualConfirm] = useState(false); // Show manual confirm panel
  const [showCorrectionSheet, setShowCorrectionSheet] = useState(false); // New mobile-first correction sheet
  const [isReportMode, setIsReportMode] = useState(false); // "Wrong match?" correction mode
  const [isLowConfidenceMode, setIsLowConfidenceMode] = useState(false); // Auto-triggered low confidence mode
  const [scanSource, setScanSource] = useState<string | undefined>(undefined); // Track if result is from correction_override
  
  // Debug state - enhanced for admin panel
  const [debugData, setDebugData] = useState({
    status: "idle",
    raw_ocr: "",
    extracted: null as any,
    confidence: null as number | null,
    queryParams: null as any,
    comicvineQuery: "",
    strategy: "" as string,
    candidates: [] as any[],
    timings: {} as { total?: number; vision?: number; comicvine?: number; fallback?: number }
  });

  // Scanner assist context (publisher/format filters)
  const [scanContext, setScanContext] = useState<ScanContext>({
    publisherFilter: null,
    format: 'raw'
  });

  // Load recent scans on mount
  useEffect(() => {
    const loadRecent = async () => {
      if (user?.id) {
        const dbHistory = await loadScanHistory(user.id, 10);
        if (dbHistory.length > 0) {
          setRecentScans(dbHistory);
          return;
        }
      }
      const recent = loadRecentScans();
      setRecentScans(recent);
    };
    
    loadRecent();
    setShowDebug(isDebugMode());
  }, [user]);

  // Auto-fill manual search from OCR extraction
  useEffect(() => {
    if (debugData.extracted && confidence && confidence < CONFIDENCE_THRESHOLDS.MEDIUM) {
      const query = buildPrefilledQuery(debugData.extracted);
      if (query && !manualSearchQuery) {
        setManualSearchQuery(query);
      }
    }
  }, [debugData.extracted, confidence]);

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error("Camera error:", error);
      setScannerState("error_camera");
      setErrorType("camera");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    stopCamera();
    setPreviewImage(imageData);
    processImage(imageData);
  };

  // Upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setPreviewImage(imageData);
      processImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  // Main image processing
  const processImage = async (imageData: string) => {
    setScannerState("scanning");
    setLoading(true);
    setErrorType(null);
    
    try {
      const compressed = await compressImageDataUrl(imageData, 1200, 0.85);
      
      // Store compressed image for potential vision matching
      compressedImageRef.current = compressed;
      
      // Upload to storage
      const blob = await fetch(compressed).then(r => r.blob());
      const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      const { uploadViaProxy } = await import("@/lib/uploadImage");
      const { publicUrl } = await uploadViaProxy(file);
      
      uploadedImageUrlRef.current = publicUrl;
      setImageUrl(publicUrl);
      setPreviewImage(compressed);
      
      // Call scan-item edge function
      const { data, error } = await supabase.functions.invoke('scan-item', {
        body: { imageData: compressed }
      });

      if (error) throw error;

      if (data.ok && data.picks && data.picks.length > 0) {
        // Apply publisher bias if filter is set
        const rawPicks = data.picks as ComicVinePick[];
        let picks = applyPublisherBias(rawPicks, scanContext.publisherFilter) as ComicVinePick[];
        let topPick = picks[0];
        let pickConfidence = topPick.score || 0;
        let matchSource = data.source || undefined;
        
        // Store OCR text for auto-learning
        ocrTextRef.current = data.ocr || null;
        
        // Check if we have a cache hit from scan_corrections (already verified match)
        const hasCacheHit = data.source === 'correction_override';
        
        // VISION-FIRST MATCHING: Check if we should trigger cover image comparison
        // Pass OCR extracted title/issue for sanity checks AND cache hit status
        const visionCheck = shouldTriggerVision(
          pickConfidence, 
          picks, 
          false,
          data.extracted?.title,
          data.extracted?.issueNumber,
          hasCacheHit // Skip vision if we have a cached result
        );
        
        if (visionCheck.should && visionCheck.reason && compressedImageRef.current) {
          console.log(`[SCANNER] VISION-FIRST: Triggering vision match (${visionCheck.reason})`);
          
          try {
            const visionResult = await runVisionMatch(
              compressedImageRef.current,
              picks,
              visionCheck.reason,
              data.requestId
            );
            
            if (visionResult && visionResult.visionOverrideApplied && visionResult.bestMatchComicId) {
              // Apply vision override - update the selected pick
              const updatedPick = applyVisionOverride(topPick, picks, visionResult);
              
              if (updatedPick) {
                console.log(`[SCANNER] Vision matched: ${updatedPick.volumeName || updatedPick.title} #${updatedPick.issue}`);
                
                // Move the vision-matched pick to the top
                if (updatedPick.id !== topPick.id) {
                  picks = [updatedPick, ...picks.filter(p => p.id !== updatedPick.id)];
                }
                topPick = updatedPick;
                pickConfidence = visionResult.similarityScore;
                matchSource = 'vision';
                
                // AUTO-LEARN: Save vision result to cache for future scans
                // This makes future scans of similar covers instant (no vision call needed)
                if (ocrTextRef.current && visionResult.similarityScore >= 0.70) {
                  console.log(`[SCANNER] AUTO-LEARNING: Saving vision result to cache`);
                  saveVisionResultToCache(
                    ocrTextRef.current,
                    updatedPick,
                    visionResult.similarityScore
                  );
                }
              }
            }
          } catch (visionError) {
            console.error('[SCANNER] Vision match failed:', visionError);
            // Continue with OCR result
          }
        } else if (hasCacheHit) {
          console.log(`[SCANNER] CACHE HIT: Using learned match (skipped vision)`);
        }
        
        setConfidence(pickConfidence);
        setSearchResults(picks);
        
        // Store top matches for manual confirm if needed
        if (data.topMatches) {
          setTopMatches(data.topMatches);
        }
        
        // Check if manual confirm is needed (low confidence or multiple matches)
        const needsConfirm = data.needsUserConfirmation || pickConfidence < CONFIDENCE_THRESHOLDS.MEDIUM;
        setNeedsUserConfirmation(needsConfirm);
        setShowManualConfirm(needsConfirm && picks.length > 1);
        
        setDebugData({
          status: "success",
          raw_ocr: data.ocr || "",
          extracted: data.extracted || null,
          confidence: pickConfidence,
          queryParams: null,
          comicvineQuery: "",
          strategy: matchSource === 'vision' ? 'vision-match' : (data.fallbackPath || "issue-search"),
          candidates: picks.map((p: any) => ({
            id: p.id,
            series: p.volumeName || p.title,
            issue: p.issue,
            year: p.year,
            publisher: p.publisher,
            confidence: Math.round((p.score || 0) * 100),
            fallbackPath: data.fallbackPath,
            hasExactYear: p._hasExactYear,
            hasExactIssue: p._hasExactIssue,
            coverUrl: p.coverUrl || p.thumbUrl || null, // Preserve cover URL!
            comicvine_issue_id: p.id,
            comicvine_volume_id: p.volumeId
          })),
          timings: data.timings || {}
        });
        
        // Track source (e.g. 'correction_override', 'vision')
        setScanSource(matchSource);
        
        // Extract variant info from response
        if (data.extracted?.isVariant) {
          setVariantInfo({
            isVariant: true,
            variantType: data.extracted.variantType || null,
            variantDetails: data.extracted.variantDetails || null,
            ratioVariant: data.extracted.ratioVariant || null,
            variantArtist: data.extracted.variantArtist || null
          });
        } else {
          setVariantInfo(null);
        }
        
        // Determine state based on confidence and matches
        // Now we go to 'transition' first for the magic feel, then to result card
        
        setSelectedPick(topPick);
        setPrefillData({
          title: topPick.volumeName || topPick.title,
          issueNumber: topPick.issue || undefined,
          publisher: topPick.publisher || undefined,
          year: topPick.year || undefined,
          comicvineId: topPick.id,
          comicvineCoverUrl: topPick.coverUrl
        });
        
        // Go to transition state for magic feel
        setScannerState("transition");
        
        // CRITICAL: Scroll to top after scan completes so user sees results
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // CRITICAL: Preserve OCR-extracted key issue info BEFORE fetching API details
        // CGC/CBCS labels often contain accurate "1st appearance of..." text that ComicVine API may miss
        const ocrKeyNotes = extractKeyNotesFromOCR(data.ocr || '');
        const extractedKeyIndicator = data.extracted?.keyIssueIndicator;
        
        // Fetch detailed issue info in background
        const issueDetails = await fetchIssueDetails(topPick);
        if (issueDetails) {
          topPick.title = issueDetails.title || topPick.title;
          topPick.coverUrl = issueDetails.cover_url || topPick.coverUrl;
          topPick.writer = issueDetails.writer;
          topPick.artist = issueDetails.artist;
          topPick.coverArtist = issueDetails.coverArtist;
          topPick.description = issueDetails.description;
          topPick.deck = issueDetails.deck;
          topPick.characters = issueDetails.characters;
          
          // PRIORITY for keyNotes: OCR-extracted > API-extracted > fallback
          // OCR is more reliable for slabbed books since CGC labels have accurate key info
          if (ocrKeyNotes) {
            topPick.keyNotes = ocrKeyNotes;
            console.log('[SCANNER] Using OCR-extracted keyNotes:', ocrKeyNotes);
          } else if (issueDetails.keyNotes && !issueDetails.keyNotes.includes('changes to the character')) {
            // Only use API keyNotes if it's actually meaningful
            topPick.keyNotes = issueDetails.keyNotes;
          } else if (extractedKeyIndicator) {
            // Fallback to the indicator type (e.g., "1st Appearance")
            topPick.keyNotes = extractedKeyIndicator;
          }
          
          setSelectedPick({ ...topPick });
          setPrefillData({
            title: issueDetails.volume_name || topPick.volumeName || topPick.title,
            issueNumber: topPick.issue || undefined,
            publisher: topPick.publisher || issueDetails.publisher,
            year: topPick.year || undefined,
            comicvineId: topPick.id,
            comicvineCoverUrl: issueDetails.cover_url || topPick.coverUrl,
            description: issueDetails.description
          });
        }

        saveToRecentScans(topPick);
        
        if (user?.id && uploadedImageUrlRef.current) {
          await saveScanToHistory(user.id, uploadedImageUrlRef.current, topPick);
          const dbHistory = await loadScanHistory(user.id, 10);
          if (dbHistory.length > 0) {
            setRecentScans(dbHistory);
          }
        } else {
          setRecentScans(loadRecentScans());
        }
      } else {
        // No matches found
        setScannerState("match_low");
        setSearchResults([]);
        setShowManualConfirm(false);
        setNeedsUserConfirmation(false);
        
        // Scroll to top for low confidence too
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        const searchText = buildPrefilledQuery(data.extracted) || data.extracted?.title || "";
        if (searchText) {
          setManualSearchQuery(searchText);
        }
        
        // Check if OCR returned empty or nearly empty text (virgin cover / no text)
        const ocrText = data.ocr || "";
        const hasMinimalText = ocrText.trim().length < 10;
        
        if (hasMinimalText) {
          // Auto-open correction sheet for covers that couldn't be read
          setIsLowConfidenceMode(true);
          setShowCorrectionSheet(true);
          sonnerToast.info("This cover has minimal text", {
            description: "Use manual search to find your comic.",
            duration: 4000
          });
        }
        
        setDebugData({
          status: "no_match",
          raw_ocr: ocrText,
          extracted: data.extracted || null,
          confidence: 0,
          queryParams: null,
          comicvineQuery: searchText,
          strategy: "none",
          candidates: [],
          timings: data.timings || {}
        });
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setScannerState("error_network");
      setErrorType("network");
      
      setDebugData(prev => ({ ...prev, status: "error" }));
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed issue info from ComicVine
  const fetchIssueDetails = async (pick: any) => {
    try {
      // Pass issue_id only if it's a valid ID (not 0 or null)
      const issueId = pick.id && pick.id !== 0 ? pick.id : null;
      
      const { data, error } = await supabase.functions.invoke('fetch-comicvine-issue', {
        body: {
          issue_id: issueId,
          volume_id: pick.volumeId,
          issue_number: pick.issue
        }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Failed to fetch issue details:', err);
      return null;
    }
  };

  // Manual search handler
  const handleManualSearch = async (appendResults = false) => {
    if (!manualSearchQuery.trim()) {
      toast({
        title: "Enter a search term",
        description: "Try something like 'Amazing Spider-Man 129'",
        variant: "destructive"
      });
      return;
    }

    setManualSearchLoading(true);
    
    if (!appendResults) {
      setVolumeResults([]);
      setSearchResults([]);
      setPagination({ offset: 0, limit: 20, totalResults: 0, hasMore: false });
    }

    try {
      const currentOffset = appendResults ? pagination.offset + pagination.limit : 0;
      const searchYear = manualSearchYear ? parseInt(manualSearchYear) : undefined;
      
      // Try local volume cache first
      const { data: localData, error: localError } = await supabase.functions.invoke('volumes-suggest', {
        body: {
          q: manualSearchQuery,
          publisher: debugData.extracted?.publisher,
          year: searchYear || debugData.extracted?.year,
          limit: 20,
          offset: currentOffset
        }
      });

      if (!localError && localData?.results && localData.results.length > 0) {
        const existingIds = new Set(volumeResults.map((v: any) => v.id));
        const newItems = localData.results.filter((v: any) => !existingIds.has(v.id));
        
        const newResults = appendResults 
          ? [...volumeResults, ...newItems]
          : localData.results;
        
        setVolumeResults(newResults);
        setSearchSource('local');
        setScannerState("multi_match");
        
        setPagination({
          offset: currentOffset,
          limit: 20,
          totalResults: localData.totalResults || newResults.length,
          hasMore: localData.hasMore || false
        });
        
        return;
      }

      // Fallback to live ComicVine search
      const { data, error } = await supabase.functions.invoke('manual-comicvine-search', {
        body: {
          searchText: manualSearchQuery,
          issueNumber: manualSearchIssue || undefined,
          year: searchYear,
          publisher: debugData.extracted?.publisher,
          offset: currentOffset,
          limit: 20,
          filters: {
            notReprint: filterNotReprint,
            wrongYear: filterWrongYear,
            slabbed: filterSlabbed
          }
        }
      });

      if (error) throw error;
      if (!data || !data.ok) throw new Error(data?.error || 'Search failed');

      let results = data.results || [];
      
      if (filterNotReprint) {
        results = filterReprints(results);
      }

      const existingIds = new Set(searchResults.map((r: any) => r.id));
      const newItems = results.filter((r: any) => !existingIds.has(r.id));

      const newResults = appendResults 
        ? [...searchResults, ...newItems]
        : results;

      setSearchResults(newResults);
      setSearchSource('live');
      
      if (newResults.length > 0) {
        setScannerState("multi_match");
      }
      
      setPagination({
        offset: currentOffset,
        limit: 20,
        totalResults: data.totalResults || newResults.length,
        hasMore: data.hasMore || false
      });
      
    } catch (err: any) {
      console.error('Manual search error:', err);
      toast({
        title: "Search unavailable",
        description: "Please try again or enter details manually",
        variant: "destructive"
      });
    } finally {
      setManualSearchLoading(false);
    }
  };

  // Extract issue number from search query
  const extractIssueNumber = (query: string): string => {
    const match = query.match(/#?\s*(\d+(?:\.\d+)?)\s*$/);
    return match ? match[1] : "";
  };

  // Filter chip handlers
  const handleFilterToggle = (filter: 'reprint' | 'year' | 'slabbed') => {
    switch (filter) {
      case 'reprint':
        setFilterNotReprint(!filterNotReprint);
        break;
      case 'year':
        setFilterWrongYear(!filterWrongYear);
        break;
      case 'slabbed':
        setFilterSlabbed(!filterSlabbed);
        break;
    }
  };

  const applyFilters = () => {
    if (manualSearchQuery.trim()) {
      handleManualSearch();
    }
  };

  // Select comic from volume/issue picker
  const handleSelectIssue = async (issue: any, volume: any) => {
    const year = issue.cover_date ? new Date(issue.cover_date).getFullYear() : volume.start_year;
    
    const pick: ComicVinePick = {
      id: issue.id,
      resource: 'issue' as const,
      title: volume.name,
      issue: issue.issue_number,
      year: year || null,
      publisher: volume.publisher || null,
      volumeName: volume.name,
      volumeId: volume.id,
      variantDescription: issue.name || null,
      thumbUrl: issue.image_url || '',
      coverUrl: issue.image_url || '',
      writer: issue.writer || null,
      artist: issue.artist || null,
      score: 1.0,
      isReprint: false,
      source: 'cache' as const
    };
    
    setSelectedPick(pick);
    setPrefillData({
      title: volume.name,
      issueNumber: issue.issue_number || undefined,
      publisher: volume.publisher || undefined,
      year: year || undefined,
      comicvineId: issue.id,
      comicvineCoverUrl: issue.image_url,
      description: issue.key_notes || undefined
    });
    
    const issueDetails = await fetchIssueDetails(pick);
    if (issueDetails) {
      pick.title = issueDetails.title || pick.title;
      pick.coverUrl = issueDetails.cover_url || pick.coverUrl;
      pick.writer = issueDetails.writer;
      pick.artist = issueDetails.artist;
      pick.coverArtist = issueDetails.coverArtist;
      pick.description = issueDetails.description;
      pick.deck = issueDetails.deck;
      pick.keyNotes = issueDetails.keyNotes;
      pick.characters = issueDetails.characters;
      setSelectedPick({ ...pick });
    }
    
    setScannerState("confirm");
    saveToRecentScans(pick);
    
    if (user?.id && imageUrl) {
      await saveScanToHistory(user.id, imageUrl, pick);
      const dbHistory = await loadScanHistory(user.id, 10);
      if (dbHistory.length > 0) {
        setRecentScans(dbHistory);
      }
    } else {
      setRecentScans(loadRecentScans());
    }
  };

  // Select comic from multi-match screen
  const handleSelectFromMultiMatch = async (pick: ComicVinePick) => {
    setSelectedPick(pick);
    setPrefillData({
      title: pick.volumeName || pick.title,
      issueNumber: pick.issue || undefined,
      publisher: pick.publisher || undefined,
      year: pick.year || undefined,
      comicvineId: pick.id,
      comicvineCoverUrl: pick.coverUrl
    });
    
    const issueDetails = await fetchIssueDetails(pick);
    if (issueDetails) {
      pick.writer = issueDetails.writer;
      pick.artist = issueDetails.artist;
      pick.coverArtist = issueDetails.coverArtist;
      pick.description = issueDetails.description;
      pick.deck = issueDetails.deck;
      pick.keyNotes = issueDetails.keyNotes;
      pick.characters = issueDetails.characters;
      setSelectedPick({ ...pick });
    }
    
    setScannerState("confirm");
    saveToRecentScans(pick);
    
    if (user?.id && imageUrl) {
      await saveScanToHistory(user.id, imageUrl, pick);
      const dbHistory = await loadScanHistory(user.id, 10);
      if (dbHistory.length > 0) {
        setRecentScans(dbHistory);
      }
    } else {
      setRecentScans(loadRecentScans());
    }
  };

  // Recent scan selection
  const handleRecentScanSelect = async (scan: ComicVinePick) => {
    setSelectedPick(scan);
    setPreviewImage(scan.thumbUrl);
    setImageUrl(scan.thumbUrl);
    
    setPrefillData({
      title: scan.volumeName || scan.title,
      issueNumber: scan.issue || undefined,
      publisher: scan.publisher || undefined,
      year: scan.year || undefined,
      comicvineId: scan.id,
      comicvineCoverUrl: scan.coverUrl
    });
    
    const issueDetails = await fetchIssueDetails(scan);
    if (issueDetails) {
      scan.writer = issueDetails.writer;
      scan.artist = issueDetails.artist;
      scan.coverArtist = issueDetails.coverArtist;
      scan.description = issueDetails.description;
      scan.deck = issueDetails.deck;
      scan.keyNotes = issueDetails.keyNotes;
      scan.characters = issueDetails.characters;
      setSelectedPick({ ...scan });
    }
    
    setScannerState("confirm");
    sonnerToast.success("Recent scan restored!");
  };

  // Reset scanner
  const resetScanner = () => {
    setScannerState("idle");
    setPreviewImage(null);
    setImageUrl(null);
    setSelectedPick(null);
    setPrefillData(null);
    setSearchResults([]);
    setVolumeResults([]);
    setConfidence(null);
    setErrorType(null);
    setManualSearchQuery("");
    setManualSearchIssue("");
    setManualSearchYear("");
    setFilterNotReprint(false);
    setFilterWrongYear(false);
    setFilterSlabbed(false);
    setShowManualSearch(false);
    setIsManualEntry(false);
    setVariantInfo(null);
    setTopMatches([]);
    setNeedsUserConfirmation(false);
    setShowManualConfirm(false);
    setShowCorrectionSheet(false);
    setIsReportMode(false);
    setIsLowConfidenceMode(false);
    setScanSource(undefined);
    setDebugData({
      status: "idle",
      raw_ocr: "",
      extracted: null,
      confidence: null,
      queryParams: null,
      comicvineQuery: "",
      strategy: "",
      candidates: [],
      timings: {}
    });
  };

  // Confirm screen save handler
  const handleConfirmSave = async (data: any) => {
    // Update prefill data with confirmed values
    setPrefillData(prev => ({
      ...prev,
      title: data.title,
      issueNumber: data.issueNumber,
      year: data.year,
      publisher: data.publisher,
    }));
    
    if (selectedPick) {
      selectedPick.volumeName = data.title;
      selectedPick.issue = data.issueNumber;
      selectedPick.year = data.year ? parseInt(data.year) : null;
      selectedPick.publisher = data.publisher;
      selectedPick.variantDescription = data.variant;
      setSelectedPick({ ...selectedPick });
    }
    
    setScannerState("success");
  };

  // Success screen handlers
  const handleSetPrice = async () => {
    if (!selectedPick || !user) {
      sonnerToast.error("Please select a comic and sign in");
      return;
    }

    setLoading(true);
    try {
      const finalImageUrl = uploadedImageUrlRef.current || imageUrl;
      
      // CRITICAL: Include key issue info that was extracted during scanning
      const hasKeyNotes = selectedPick.keyNotes && selectedPick.keyNotes.trim().length > 0;
      
      const inventoryData: any = {
        user_id: user.id,
        title: selectedPick.volumeName || selectedPick.title,
        series: selectedPick.volumeName || null,
        issue_number: selectedPick.issue || null,
        publisher: selectedPick.publisher || null,
        year: selectedPick.year || null,
        condition: "NM",
        comicvine_issue_id: selectedPick.id ? selectedPick.id.toString() : null,
        comicvine_volume_id: selectedPick.volumeId ? selectedPick.volumeId.toString() : null,
        variant_description: selectedPick.variantDescription || null,
        writer: selectedPick.writer || null,
        artist: selectedPick.artist || null,
        cover_artist: selectedPick.coverArtist || null,
        scanner_confidence: confidence || null,
        scanner_last_scanned_at: new Date().toISOString(),
        images: {
          primary: finalImageUrl,
          others: [],
          comicvine_reference: selectedPick.coverUrl || null,
        },
        listing_status: "not_listed",
        // KEY ISSUE FIELDS - preserve the extracted key notes through the flow
        key_issue: hasKeyNotes,
        key_details: hasKeyNotes ? selectedPick.keyNotes : null,
      };
      
      console.log('[SCANNER] Saving inventory with keyNotes:', selectedPick.keyNotes);

      const { data: inventoryItem, error } = await supabase
        .from("inventory_items")
        .insert(inventoryData)
        .select()
        .single();

      if (error) throw error;

      navigate(`/sell/${inventoryItem.id}`);
    } catch (error: any) {
      console.error("Error saving comic:", error);
      sonnerToast.error("Failed to save comic");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToListings = () => {
    navigate("/my-inventory");
  };

  // High confidence confirm handler - now goes to result card
  const handleHighConfidenceConfirm = () => {
    setScannerState("confirm");
  };

  // Transition complete - show result card
  // If confidence < SCAN_AUTO_CONFIRM_THRESHOLD, auto-open ManualConfirmPanel for user confirmation
  const handleTransitionComplete = () => {
    setScannerState("result");
    
    // Auto-trigger low confidence confirmation if below threshold
    // Don't trigger if it's a correction override (already user-verified)
    if (confidence !== null && confidence < SCAN_AUTO_CONFIRM_THRESHOLD && scanSource !== 'correction_override' && topMatches.length > 0) {
      setIsLowConfidenceMode(true);
      setShowManualConfirm(true);
    }
  };

  // Result card confirm - go to confirm/edit screen
  const handleResultConfirm = () => {
    setScannerState("confirm");
  };

  // Result card edit - go to confirm screen in edit mode
  const handleResultEdit = () => {
    setScannerState("confirm");
  };

  // Enter manually handler
  const handleEnterManually = () => {
    setIsManualEntry(true);
    setSelectedPick({
      id: 0,
      resource: 'issue',
      title: '',
      issue: '',
      year: null,
      publisher: '',
      volumeName: '',
      thumbUrl: '',
      coverUrl: '',
      score: 0,
      isReprint: false
    });
    setScannerState("confirm");
  };

  // Handle selection from TopMatchesChooser
  const handleSelectTopMatch = async (match: TopMatch) => {
    const pick: ComicVinePick = {
      id: match.comicvine_issue_id,
      resource: 'issue' as const,
      title: match.series,
      issue: match.issue,
      year: match.year,
      publisher: match.publisher,
      volumeName: match.series,
      volumeId: match.comicvine_volume_id,
      thumbUrl: match.coverUrl || '',
      coverUrl: match.coverUrl || '',
      score: match.confidence / 100,
      isReprint: false,
      source: 'comicvine' as const
    };
    
    setSelectedPick(pick);
    setPrefillData({
      title: match.series,
      issueNumber: match.issue || undefined,
      publisher: match.publisher || undefined,
      year: match.year || undefined,
      comicvineId: match.comicvine_issue_id,
      comicvineCoverUrl: match.coverUrl || undefined
    });
    
    // Fetch detailed issue info
    const issueDetails = await fetchIssueDetails(pick);
    if (issueDetails) {
      pick.writer = issueDetails.writer;
      pick.artist = issueDetails.artist;
      pick.description = issueDetails.description;
      setSelectedPick({ ...pick });
      setPrefillData(prev => ({
        ...prev,
        description: issueDetails.description
      }));
    }
    
    setScannerState("confirm");
    setNeedsUserConfirmation(false);
    saveToRecentScans(pick);
    
    if (user?.id && imageUrl) {
      await saveScanToHistory(user.id, imageUrl, pick);
      const dbHistory = await loadScanHistory(user.id, 10);
      if (dbHistory.length > 0) {
        setRecentScans(dbHistory);
      }
    } else {
      setRecentScans(loadRecentScans());
    }
  };

  // Handle "Wrong match?" report button - Opens the new correction sheet
  const handleReportWrongMatch = () => {
    setIsReportMode(true);
    setShowCorrectionSheet(true);
  };

  // Search handler for correction sheet
  const handleCorrectionSearch = async (
    title: string,
    issue?: string,
    publisher?: string,
    year?: string
  ): Promise<CorrectionCandidate[]> => {
    try {
      // Don't include year in searchText - pass it separately to avoid parsing confusion
      const searchQuery = title + (issue ? ` #${issue}` : '');
      
      console.log('[CORRECTION_SEARCH] Searching:', { searchQuery, publisher, issue, year });
      
      const { data, error } = await supabase.functions.invoke('manual-comicvine-search', {
        body: { 
          searchText: searchQuery,
          publisher: publisher || undefined,
          issueNumber: issue || null,
          year: year ? parseInt(year) : null
        }
      });

      if (error) throw error;
      
      console.log('[CORRECTION_SEARCH] Response:', { 
        ok: data?.ok, 
        resultsCount: data?.results?.length,
        hasVolumes: !!data?.volumes
      });
      
      // The edge function returns "results", not "volumes"
      if (data?.ok && data.results && data.results.length > 0) {
        // Convert to CorrectionCandidate format
        // IMPORTANT: Check if result is a volume or issue - only set issue_id if it's an issue
        const candidates: CorrectionCandidate[] = data.results.slice(0, 20).map((result: any) => {
          const isIssue = result.resource === 'issue';
          return {
            // Only set issue_id if this is actually an issue, not a volume
            comicvine_issue_id: isIssue ? result.id : null,
            comicvine_volume_id: result.volumeId || result.id,
            series: result.volumeName || result.title,
            issue: result.issue || issue || '',
            year: result.year || null,
            publisher: result.publisher || null,
            coverUrl: result.coverUrl || result.thumbUrl || null,
            confidence: Math.round((result.score || 0.7) * 100)
          };
        });
        
        console.log('[CORRECTION_SEARCH] Returning candidates:', candidates.length, 'first is issue:', candidates[0]?.comicvine_issue_id != null);
        return candidates;
      }
      
      console.log('[CORRECTION_SEARCH] No results found');
      return [];
    } catch (error) {
      console.error('Correction search error:', error);
      return [];
    }
  };

  // Handle selection from correction sheet
  const handleCorrectionSelect = async (candidate: CorrectionCandidate) => {
    // When comicvine_issue_id is null, this is a volume-level selection
    // We'll need to fetch the actual issue using volume_id + issue_number
    const hasIssueId = candidate.comicvine_issue_id != null;
    
    const pick: ComicVinePick = {
      // Use 0 as placeholder when we don't have an issue ID yet
      id: hasIssueId ? candidate.comicvine_issue_id : 0,
      resource: hasIssueId ? 'issue' as const : 'volume' as const,
      title: candidate.series,
      issue: candidate.issue,
      year: candidate.year,
      publisher: candidate.publisher,
      volumeName: candidate.series,
      volumeId: candidate.comicvine_volume_id,
      thumbUrl: candidate.coverUrl || '',
      coverUrl: candidate.coverUrl || '',
      score: candidate.confidence / 100,
      isReprint: false,
      source: 'comicvine' as const
    };
    
    setSelectedPick(pick);
    setPrefillData({
      title: candidate.series,
      issueNumber: candidate.issue || undefined,
      publisher: candidate.publisher || undefined,
      year: candidate.year || undefined,
      comicvineId: candidate.comicvine_issue_id || undefined,
      comicvineCoverUrl: candidate.coverUrl || undefined
    });
    
    // If we have volume_id + issue but no issue_id, fetch the actual issue details
    // This will use the fallback path in fetch-comicvine-issue
    if (candidate.issue && (candidate.comicvine_volume_id || candidate.comicvine_issue_id)) {
      const issueDetails = await fetchIssueDetails({
        id: candidate.comicvine_issue_id || null,
        volumeId: candidate.comicvine_volume_id,
        issue: candidate.issue
      });
      
      if (issueDetails) {
        // Update pick with the actual issue ID and details
        pick.id = issueDetails.id || pick.id;
        pick.writer = issueDetails.writer;
        pick.artist = issueDetails.artist;
        pick.coverArtist = issueDetails.coverArtist;
        pick.description = issueDetails.description;
        pick.deck = issueDetails.deck;
        pick.keyNotes = issueDetails.keyNotes;
        pick.coverUrl = issueDetails.cover_url || pick.coverUrl;
        
        setSelectedPick({ ...pick });
        setPrefillData(prev => ({
          ...prev,
          comicvineId: issueDetails.id || candidate.comicvine_issue_id,
          comicvineCoverUrl: issueDetails.cover_url || candidate.coverUrl,
          description: issueDetails.description
        }));
      }
    }
    
    setShowCorrectionSheet(false);
    setIsReportMode(false);
    setScannerState("confirm");
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Comic Scanner</h1>
        <p className="text-muted-foreground mb-1">
          Snap a photo or upload an image to identify your comic
        </p>
      </div>

      {/* Recent Scans - only on idle */}
      {recentScans.length > 0 && scannerState === "idle" && (
        <RecentScans 
          recentScans={recentScans}
          onSelectScan={handleRecentScanSelect}
        />
      )}

      {/* Scanner Assist Chips - show on idle */}
      {scannerState === "idle" && (
        <ScannerAssistChips onChange={setScanContext} />
      )}

      {/* Idle Screen */}
      {scannerState === "idle" && (
        <ScannerIdleScreen
          cameraActive={cameraActive}
          videoRef={videoRef}
          onStartCamera={startCamera}
          onStopCamera={stopCamera}
          onCapturePhoto={capturePhoto}
          onFileUpload={handleFileUpload}
          format={scanContext.format}
        />
      )}

      {/* Scanning Screen */}
      {scannerState === "scanning" && (
        <ScannerScanningScreen />
      )}

      {/* Transition Screen - Brief "Identifying match..." */}
      {scannerState === "transition" && (
        <ScannerTransitionScreen
          onComplete={handleTransitionComplete}
          previewImage={previewImage}
        />
      )}

      {/* 
        SCAN RESULT SUMMARY CARD (Hero at top of all result states)
        Additive Summary Card layer — do not refactor scanner pipeline
        Shows for: result, match_high, match_medium, match_low, multi_match, confirm, success, error_*
      */}
      {scannerState !== "idle" && 
       scannerState !== "scanning" && 
       scannerState !== "transition" && (
        <ScanResultSummaryCard
          match={selectedPick || (searchResults.length > 0 ? searchResults[0] : null)}
          previewImage={previewImage}
          confidence={confidence}
          scannerState={scannerState}
          onConfirm={() => {
            if (scannerState === "success") {
              handleSetPrice();
            } else if (scannerState.startsWith("error_")) {
              if (scannerState === "error_camera") {
                startCamera();
              } else {
                resetScanner();
                // Trigger re-scan after reset
                setTimeout(() => {
                  if (previewImage) processImage(previewImage);
                }, 100);
              }
            } else {
              setScannerState("confirm");
            }
          }}
          onEdit={() => setScannerState("confirm")}
          onScanAgain={resetScanner}
          onManualSearch={() => setShowManualSearch(true)}
          onReportWrongMatch={handleReportWrongMatch}
          isManualEntry={isManualEntry}
          variantInfo={variantInfo}
          source={scanSource}
          topMatches={topMatches.length > 0 ? topMatches.map(m => ({
            id: m.comicvine_issue_id,
            comicvine_issue_id: m.comicvine_issue_id,
            comicvine_volume_id: m.comicvine_volume_id,
            title: m.series,
            issue: m.issue,
            year: m.year,
            publisher: m.publisher,
            coverUrl: m.coverUrl,
            confidence: m.confidence
          })) : (debugData.candidates || []).slice(0, 6).map((c: any) => ({
            id: c.id || c.comicvine_issue_id,
            comicvine_issue_id: c.comicvine_issue_id || c.id,
            comicvine_volume_id: c.comicvine_volume_id,
            title: c.series,
            issue: c.issue,
            year: c.year,
            publisher: c.publisher,
            coverUrl: c.coverUrl || null, // Now correctly mapped!
            confidence: c.confidence
          }))}
          onSelectMatch={(match) => {
            console.log('[SCANNER] Inline candidate selected:', match);
            const pick: ComicVinePick = {
              id: match.comicvine_issue_id || match.id,
              resource: 'issue' as const,
              title: match.title,
              issue: match.issue,
              year: match.year || null,
              publisher: match.publisher || null,
              volumeName: match.title,
              volumeId: match.comicvine_volume_id || 0,
              thumbUrl: match.coverUrl || '',
              coverUrl: match.coverUrl || '',
              score: match.confidence / 100,
              isReprint: false,
              source: 'comicvine' as const
            };
            
            setSelectedPick(pick);
            setPrefillData({
              title: match.title,
              issueNumber: match.issue || undefined,
              publisher: match.publisher || undefined,
              year: match.year || undefined,
              comicvineId: match.comicvine_issue_id || match.id,
              comicvineCoverUrl: match.coverUrl || undefined
            });
            
            setScannerState("confirm");
          }}
        />
      )}

      {/* Manual Confirm Panel - Show when confidence is low OR when user clicks "Wrong match?" */}
      {/* Allow showing even with empty topMatches - user can search manually */}
      {showManualConfirm && scannerState !== "confirm" && scannerState !== "success" && (
        <ManualConfirmPanel
          candidates={topMatches.length > 0 ? topMatches : (
            // Fallback: convert debugData.candidates to TopCandidate format
            (debugData.candidates || []).map((c, idx) => ({
              comicvine_issue_id: idx, // Placeholder - won't have real ID
              comicvine_volume_id: 0,
              series: c.series,
              issue: c.issue,
              year: c.year,
              publisher: c.publisher,
              coverUrl: null,
              confidence: c.confidence
            }))
          )}
          inputText={manualSearchQuery || debugData.comicvineQuery || debugData.extracted?.title || ""}
          ocrText={debugData.raw_ocr}
          originalConfidence={confidence || 0}
          returnedComicVineId={isReportMode && selectedPick ? selectedPick.id : undefined}
          isReportMode={isReportMode}
          isLowConfidenceMode={isLowConfidenceMode}
          onSelect={(candidate) => {
            const pick: ComicVinePick = {
              id: candidate.comicvine_issue_id,
              resource: 'issue' as const,
              title: candidate.series,
              issue: candidate.issue,
              year: candidate.year,
              publisher: candidate.publisher,
              volumeName: candidate.series,
              volumeId: candidate.comicvine_volume_id,
              thumbUrl: candidate.coverUrl || '',
              coverUrl: candidate.coverUrl || '',
              score: candidate.confidence / 100,
              isReprint: false,
              source: 'comicvine' as const
            };
            setSelectedPick(pick);
            setPrefillData({
              title: candidate.series,
              issueNumber: candidate.issue || undefined,
              publisher: candidate.publisher || undefined,
              year: candidate.year || undefined,
              comicvineId: candidate.comicvine_issue_id,
              comicvineCoverUrl: candidate.coverUrl || undefined
            });
            setShowManualConfirm(false);
            setIsReportMode(false);
            setIsLowConfidenceMode(false);
            setScannerState("confirm");
          }}
          onEnterManually={() => {
            setShowManualConfirm(false);
            setIsReportMode(false);
            setIsLowConfidenceMode(false);
            handleEnterManually();
          }}
          onSearchAgain={(query) => {
            setShowManualConfirm(false);
            setIsReportMode(false);
            setIsLowConfidenceMode(false);
            if (query) {
              setManualSearchQuery(query);
            }
            setShowManualSearch(true);
          }}
          onCancel={() => {
            setShowManualConfirm(false);
            setIsReportMode(false);
            setIsLowConfidenceMode(false);
          }}
        />
      )}

      {/* Multi-Match Selection - Shows BELOW Summary Card */}
      {scannerState === "multi_match" && searchResults.length > 0 && !showManualConfirm && (
        <ScannerMultiMatchScreen
          matches={searchResults}
          onSelectMatch={handleSelectFromMultiMatch}
          onEnterManually={handleEnterManually}
        />
      )}

      {/* Confirm Screen - Shows BELOW Summary Card */}
      {scannerState === "confirm" && (
        <ScannerConfirmScreen
          match={selectedPick}
          previewImage={previewImage}
          onSave={handleConfirmSave}
          onBack={resetScanner}
        />
      )}

      {/* Success Screen - Shows BELOW Summary Card */}
      {scannerState === "success" && (
        <ScannerSuccessScreen
          match={selectedPick}
          previewImage={previewImage}
          onSetPrice={handleSetPrice}
          onScanAnother={resetScanner}
          onGoToListings={handleGoToListings}
        />
      )}

      {/* Manual Search Section - shows when user clicks "Not the right book?" or "Search Manually" */}
      {showManualSearch && scannerState !== "idle" && scannerState !== "scanning" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search Manually</CardTitle>
            <CardDescription>
              Enter series title, issue number, and optional year
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-2">
              <div className="md:col-span-2">
                <Input
                  placeholder="Series title (e.g., Amazing Spider-Man)"
                  value={manualSearchQuery}
                  onChange={(e) => setManualSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSearch(false)}
                  disabled={manualSearchLoading}
                />
              </div>
              <Input
                placeholder="Issue # (e.g., 300)"
                value={manualSearchIssue}
                onChange={(e) => setManualSearchIssue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch(false)}
                disabled={manualSearchLoading}
              />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Year (optional)"
                value={manualSearchYear}
                onChange={(e) => setManualSearchYear(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch(false)}
                disabled={manualSearchLoading}
                type="number"
                min="1930"
                max={new Date().getFullYear() + 1}
                className="max-w-[200px]"
              />
              <Button
                onClick={() => handleManualSearch(false)}
                disabled={manualSearchLoading || !manualSearchQuery.trim()}
              >
                {manualSearchLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Volume/Issue Picker for local cache results */}
      {volumeResults.length > 0 && searchSource === 'local' && showManualSearch && (
        <VolumeIssuePicker
          volumes={volumeResults}
          loading={manualSearchLoading}
          onSelectIssue={handleSelectIssue}
          onClose={() => setVolumeResults([])}
          initialIssueNumber={extractIssueNumber(manualSearchQuery)}
        />
      )}

      {/* Debug Panel - User debug mode */}
      {showDebug && (
        <DebugPanel debugData={debugData} />
      )}

      {/* Admin Scanner Debug Panel - Shows detailed diagnostics for admins OR when ?debug=1 */}
      {(isAdmin || showDebug) && (
        <AdminScannerDebugPanel
          isVisible={scannerState !== "idle" && scannerState !== "scanning"}
          parsedQuery={debugData.extracted ? {
            title: debugData.extracted.title || "",
            issue: debugData.extracted.issueNumber || null,
            year: debugData.extracted.year || null,
            publisher: debugData.extracted.publisher || null
          } : undefined}
          strategy={debugData.strategy}
          candidates={debugData.candidates}
          rawOcr={debugData.raw_ocr}
          timings={debugData.timings}
          confidence={confidence || undefined}
          onSelectCandidate={(candidate) => {
            // Create a ComicVinePick from the debug candidate data
            // This allows admins to tap a candidate directly from the debug panel
            const pick: ComicVinePick = {
              id: 0, // Will be looked up or not critical for this flow
              resource: 'issue' as const,
              title: candidate.series,
              issue: candidate.issue,
              year: candidate.year,
              publisher: candidate.publisher,
              volumeName: candidate.series,
              volumeId: 0,
              thumbUrl: '',
              coverUrl: '',
              score: candidate.confidence / 100,
              isReprint: false,
              source: 'comicvine' as const
            };
            setSelectedPick(pick);
            setPrefillData({
              title: candidate.series,
              issueNumber: candidate.issue || undefined,
              publisher: candidate.publisher || undefined,
              year: candidate.year || undefined,
            });
            setScannerState("confirm");
          }}
        />
      )}

      {/* New Mobile-First Correction Sheet */}
      <ScannerCorrectionSheet
        open={showCorrectionSheet}
        onOpenChange={(open) => {
          setShowCorrectionSheet(open);
          if (!open) {
            setIsReportMode(false);
          }
        }}
        candidates={topMatches.length > 0 ? topMatches.map(m => ({
          comicvine_issue_id: m.comicvine_issue_id,
          comicvine_volume_id: m.comicvine_volume_id,
          series: m.series,
          issue: m.issue,
          year: m.year,
          publisher: m.publisher,
          coverUrl: m.coverUrl,
          confidence: m.confidence
        })) : (debugData.candidates || []).map((c, idx) => ({
          comicvine_issue_id: idx,
          comicvine_volume_id: 0,
          series: c.series,
          issue: c.issue,
          year: c.year,
          publisher: c.publisher,
          coverUrl: null,
          confidence: c.confidence
        }))}
        ocrText={debugData.raw_ocr || debugData.extracted?.title || ""}
        ocrConfidence={(confidence || 0) * 100}
        inputText={manualSearchQuery || debugData.comicvineQuery || ""}
        onSelect={handleCorrectionSelect}
        onEnterManually={() => {
          setShowCorrectionSheet(false);
          setIsReportMode(false);
          handleEnterManually();
        }}
        onSearch={handleCorrectionSearch}
      />

      {/* Cover Zoom Modal */}
      {zoomImage && (
        <CoverZoomModal
          isOpen={!!zoomImage}
          onClose={() => setZoomImage(null)}
          imageUrl={zoomImage.url}
          title={zoomImage.title}
        />
      )}
    </div>
  );
}
