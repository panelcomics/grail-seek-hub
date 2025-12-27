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
  CONFIDENCE_THRESHOLDS 
} from "@/types/scannerState";

// Screen Components
import { ScannerIdleScreen } from "@/components/scanner/ScannerIdleScreen";
import { ScannerScanningScreen } from "@/components/scanner/ScannerScanningScreen";
import { ScannerMatchHighScreen } from "@/components/scanner/ScannerMatchHighScreen";
import { ScannerMatchMediumScreen } from "@/components/scanner/ScannerMatchMediumScreen";
import { ScannerMatchLowScreen } from "@/components/scanner/ScannerMatchLowScreen";
import { ScannerMultiMatchScreen } from "@/components/scanner/ScannerMultiMatchScreen";
import { ScannerConfirmScreen } from "@/components/scanner/ScannerConfirmScreen";
import { ScannerSuccessScreen } from "@/components/scanner/ScannerSuccessScreen";
import { ScannerErrorScreen } from "@/components/scanner/ScannerErrorScreen";
import { ScannerAssistChips, ScanContext, applyPublisherBias } from "@/components/scanner/ScannerAssistChips";

// Other Components
import { ScannerListingForm } from "@/components/ScannerListingForm";
import { VolumeGroupedResults } from "@/components/scanner/VolumeGroupedResults";
import { RecentScans } from "@/components/scanner/RecentScans";
import { DebugPanel } from "@/components/scanner/DebugPanel";
import { CoverZoomModal } from "@/components/scanner/CoverZoomModal";
import { QuickFilterChips } from "@/components/scanner/QuickFilterChips";
import { ScannerActions } from "@/components/scanner/ScannerActions";
import { VolumeIssuePicker } from "@/components/scanner/VolumeIssuePicker";

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

export default function Scanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // CRITICAL FIX: Store uploaded URL in ref to avoid React state timing issues
  const uploadedImageUrlRef = useRef<string | null>(null);

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
  
  // Debug state
  const [debugData, setDebugData] = useState({
    status: "idle",
    raw_ocr: "",
    extracted: null as any,
    confidence: null as number | null,
    queryParams: null as any,
    comicvineQuery: ""
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
        const picks = applyPublisherBias(rawPicks, scanContext.publisherFilter) as ComicVinePick[];
        const topPick = picks[0];
        const pickConfidence = topPick.score || 0;
        
        setConfidence(pickConfidence);
        setSearchResults(picks);
        
        setDebugData({
          status: "success",
          raw_ocr: data.ocr || "",
          extracted: data.extracted || null,
          confidence: pickConfidence,
          queryParams: null,
          comicvineQuery: ""
        });
        
        // Determine state based on confidence and matches
        const newState = determineScannerState(pickConfidence, picks);
        setScannerState(newState);
        
        if (newState === 'match_high') {
          setSelectedPick(topPick);
          setPrefillData({
            title: topPick.volumeName || topPick.title,
            issueNumber: topPick.issue || undefined,
            publisher: topPick.publisher || undefined,
            year: topPick.year || undefined,
            comicvineId: topPick.id,
            comicvineCoverUrl: topPick.coverUrl
          });
          
          // Fetch detailed issue info
          const issueDetails = await fetchIssueDetails(topPick);
          if (issueDetails) {
            topPick.title = issueDetails.title || topPick.title;
            topPick.coverUrl = issueDetails.cover_url || topPick.coverUrl;
            topPick.writer = issueDetails.writer;
            topPick.artist = issueDetails.artist;
            topPick.description = issueDetails.description;
            
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
        }
      } else {
        // No matches found
        setScannerState("match_low");
        setSearchResults([]);
        
        const searchText = buildPrefilledQuery(data.extracted) || data.extracted?.title || "";
        if (searchText) {
          setManualSearchQuery(searchText);
        }
        
        setDebugData({
          status: "no_match",
          raw_ocr: data.ocr || "",
          extracted: data.extracted || null,
          confidence: 0,
          queryParams: null,
          comicvineQuery: searchText,
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
      const { data, error } = await supabase.functions.invoke('fetch-comicvine-issue', {
        body: {
          issue_id: pick.id,
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
        scanner_confidence: confidence || null,
        scanner_last_scanned_at: new Date().toISOString(),
        images: {
          front: finalImageUrl,
          comicvine_reference: selectedPick.coverUrl || null,
        },
        listing_status: "not_listed",
      };

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

  // High confidence confirm handler
  const handleHighConfidenceConfirm = () => {
    setScannerState("confirm");
  };

  // Enter manually handler
  const handleEnterManually = () => {
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
        />
      )}

      {/* Scanning Screen */}
      {scannerState === "scanning" && (
        <ScannerScanningScreen />
      )}

      {/* High Confidence Match */}
      {scannerState === "match_high" && selectedPick && (
        <ScannerMatchHighScreen
          match={selectedPick}
          previewImage={previewImage}
          onConfirm={handleHighConfidenceConfirm}
          onEdit={() => setScannerState("confirm")}
          onNotRight={() => setShowManualSearch(true)}
        />
      )}

      {/* Medium Confidence Match */}
      {scannerState === "match_medium" && searchResults.length > 0 && (
        <ScannerMatchMediumScreen
          match={searchResults[0]}
          previewImage={previewImage}
          onReview={() => setScannerState("multi_match")}
          onSearchManually={() => setShowManualSearch(true)}
        />
      )}

      {/* Low Confidence / No Match */}
      {scannerState === "match_low" && (
        <ScannerMatchLowScreen
          previewImage={previewImage}
          onAddDetails={handleEnterManually}
          onTryAnother={resetScanner}
        />
      )}

      {/* Multi-Match Selection */}
      {scannerState === "multi_match" && searchResults.length > 0 && (
        <ScannerMultiMatchScreen
          matches={searchResults}
          onSelectMatch={handleSelectFromMultiMatch}
          onEnterManually={handleEnterManually}
        />
      )}

      {/* Confirm Screen */}
      {scannerState === "confirm" && (
        <ScannerConfirmScreen
          match={selectedPick}
          previewImage={previewImage}
          onSave={handleConfirmSave}
          onBack={resetScanner}
        />
      )}

      {/* Success Screen */}
      {scannerState === "success" && (
        <ScannerSuccessScreen
          match={selectedPick}
          previewImage={previewImage}
          onSetPrice={handleSetPrice}
          onScanAnother={resetScanner}
          onGoToListings={handleGoToListings}
        />
      )}

      {/* Error Screens */}
      {(scannerState === "error_camera" || scannerState === "error_image" || scannerState === "error_network") && (
        <ScannerErrorScreen
          errorType={scannerState as 'error_camera' | 'error_image' | 'error_network'}
          onPrimaryAction={() => {
            if (scannerState === "error_camera") {
              startCamera();
            } else {
              resetScanner();
            }
          }}
          onSecondaryAction={() => {
            if (scannerState === "error_network") {
              // Save for later
              sonnerToast.info("Photo saved - you can finish listing later");
            }
            resetScanner();
          }}
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

      {/* Debug Panel */}
      {showDebug && (
        <DebugPanel debugData={debugData} />
      )}

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
