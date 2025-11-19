import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Search, Camera, Upload, X, AlertCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast as sonnerToast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Types
import { ComicVinePick } from "@/types/comicvine";

// Components
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

type ScannerStatus = "idle" | "scanning" | "processing" | "results" | "selected";

export default function Scanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Core state
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Image state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  
  // Search state
  const [manualSearchQuery, setManualSearchQuery] = useState("");
  const [manualSearchLoading, setManualSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ComicVinePick[]>([]);
  const [volumeResults, setVolumeResults] = useState<any[]>([]);
  const [searchSource, setSearchSource] = useState<'local' | 'live' | null>(null);
  
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
  
  // Debug state
  const [debugData, setDebugData] = useState({
    status: "idle",
    raw_ocr: "",
    extracted: null as any,
    confidence: null as number | null,
    queryParams: null as any,
    comicvineQuery: ""
  });

  // Load recent scans on mount (from database if logged in)
  useEffect(() => {
    const loadRecent = async () => {
      if (user?.id) {
        const dbHistory = await loadScanHistory(user.id, 10);
        if (dbHistory.length > 0) {
          setRecentScans(dbHistory);
          return;
        }
      }
      // Fallback to local storage
      const recent = loadRecentScans();
      setRecentScans(recent);
    };
    
    loadRecent();
    
    // Check if debug mode is enabled
    setShowDebug(isDebugMode());
  }, [user]);

  // Auto-fill manual search from OCR extraction
  useEffect(() => {
    if (debugData.extracted && confidence && confidence < 0.8) {
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
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to scan comics",
        variant: "destructive",
      });
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
    setStatus("processing");
    setLoading(true);
    setError(null);
    
    try {
      // Compress image
      const compressed = await compressImageDataUrl(imageData, 2000, 0.85);
      const thumbnail = await createThumbnail(imageData, 400);
      
      setImageUrl(compressed);
      
      // Call scan-item edge function for OCR + ComicVine matching
      const { data, error } = await supabase.functions.invoke('scan-item', {
        body: { imageData: compressed }
      });

      if (error) throw error;

      if (data.ok && data.picks && data.picks.length > 0) {
        const topPick = data.picks[0];
        const pickConfidence = topPick.score || 0;
        
        setConfidence(pickConfidence);
        setSearchResults(data.picks);
        
        // Update debug data
        setDebugData({
          status: "success",
          raw_ocr: data.ocr || "",
          extracted: data.extracted || null,
          confidence: pickConfidence,
          queryParams: null,
          comicvineQuery: ""
        });
        
        // Auto-select only if high confidence
        if (pickConfidence >= 0.8) {
          setSelectedPick(topPick);
          setPrefillData({
            title: topPick.volumeName || topPick.title,
            issueNumber: topPick.issue || undefined,
            publisher: topPick.publisher || undefined,
            year: topPick.year || undefined,
            comicvineId: topPick.id,
            comicvineCoverUrl: topPick.coverUrl
          });
          
          // Fetch detailed issue info from ComicVine for high-confidence matches
          const issueDetails = await fetchIssueDetails(topPick);
          if (issueDetails) {
            topPick.title = issueDetails.title || topPick.title;
            topPick.coverUrl = issueDetails.cover_url || topPick.coverUrl;
            topPick.writer = issueDetails.writer;
            topPick.artist = issueDetails.artist;
            topPick.description = issueDetails.description;
            topPick.coverDate = issueDetails.cover_date;
            
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

          setStatus("selected");
          
          // Save to recent scans
          saveToRecentScans(topPick);
          
          // Save to database if user is logged in
          if (user?.id && imageUrl) {
            await saveScanToHistory(user.id, imageUrl, topPick);
            const dbHistory = await loadScanHistory(user.id, 10);
            if (dbHistory.length > 0) {
              setRecentScans(dbHistory);
            }
          } else {
            setRecentScans(loadRecentScans());
          }
          
          sonnerToast.success("Comic identified!", {
            description: `${topPick.volumeName || topPick.title} #${topPick.issue}`
          });
        } else {
          setStatus("results");
          sonnerToast.info("Found possible matches", {
            description: "Review results or refine your search below"
          });
        }
      } else {
        setStatus("results");
        setSearchResults([]);

        const searchText =
          buildPrefilledQuery(data.extracted) ||
          data.extracted?.title ||
          (typeof data.ocr === "string" ? data.ocr : "");

        sonnerToast.info("Searching local ComicVine index...");

        setDebugData({
          status: "searching",
          raw_ocr: data.ocr || "",
          extracted: data.extracted || null,
          confidence: 0,
          queryParams: null,
          comicvineQuery: searchText,
        });

        let hasResults = false;

        if (searchText && searchText.trim().length > 0) {
          try {
            const { data: volumeData, error: volumeError } = await supabase.functions.invoke("volumes-suggest", {
              body: {
                q: searchText,
                publisher: data.extracted?.publisher,
                year: data.extracted?.year,
                limit: 20,
              },
            });

            const results = volumeData?.results || [];
            const bestScore = results[0]?.score ?? 1000;
            const hasGoodMatch = results.length > 0 && bestScore < 100;

            if (!volumeError && results.length) {
              hasResults = hasGoodMatch;
              setVolumeResults(results);
              setSearchSource(volumeData.source || "local");
              setDebugData((prev) => ({
                ...prev,
                status: hasGoodMatch ? "success" : "weak_matches",
                queryParams: { source: volumeData.source || "local", bestScore, ...volumeData.filters },
              }));
            }
          } catch (searchErr) {
            console.error("Auto-match search error:", searchErr);
          }
        }

        if (!hasResults) {
          setDebugData((prev) => ({
            ...prev,
            status: "no_match",
          }));

          setTimeout(() => {
            sonnerToast.info("No automatic match found", {
              description: "Try the manual search below",
            });
          }, 500);
        }
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setError(err.message || 'Failed to process image');
      setStatus("results");
      setDebugData(prev => ({ ...prev, status: "error" }));
      toast({
        title: "Scan failed",
        description: err.message || "Please try again",
        variant: "destructive"
      });
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

  // Manual search - tries local cache first, then fallback to live ComicVine
  const handleManualSearch = async () => {
    if (!manualSearchQuery.trim()) {
      toast({
        title: "Enter a search term",
        description: "Try something like 'Amazing Spider-Man 129' or just the title",
        variant: "destructive"
      });
      return;
    }

    setManualSearchLoading(true);
    setError(null);
    setVolumeResults([]);
    setSearchResults([]);

    try {
      // Try local volume cache first
      const localParams = new URLSearchParams({
        q: manualSearchQuery,
      });
      
      if (debugData.extracted?.publisher) {
        localParams.append('publisher', debugData.extracted.publisher);
      }
      if (debugData.extracted?.year) {
        localParams.append('year', debugData.extracted.year.toString());
      }

      const { data: localData, error: localError } = await supabase.functions.invoke('volumes-suggest', {
        body: {
          q: manualSearchQuery,
          publisher: debugData.extracted?.publisher,
          year: debugData.extracted?.year,
          limit: 20
        }
      });

      if (!localError && localData?.results && localData.results.length > 0) {
        // Found results in local cache
        setVolumeResults(localData.results);
        setSearchSource('local');
        setStatus("results");
        
        setDebugData(prev => ({
          ...prev,
          status: "success",
          comicvineQuery: manualSearchQuery,
          queryParams: { source: 'local', ...localData.filters }
        }));
        
        sonnerToast.success(`Found ${localData.results.length} volumes in local cache`);
        return;
      }

      // Fallback to live ComicVine search
      const { data, error } = await supabase.functions.invoke('manual-comicvine-search', {
        body: {
          searchText: manualSearchQuery,
          publisher: debugData.extracted?.publisher,
          filters: {
            notReprint: filterNotReprint,
            wrongYear: filterWrongYear,
            slabbed: filterSlabbed
          }
        }
      });

      if (error) throw error;

      let results = data.results || [];
      
      // Apply client-side reprint filter
      if (filterNotReprint) {
        results = filterReprints(results);
      }

      setSearchResults(results);
      setSearchSource('live');
      setStatus("results");
      
      setDebugData(prev => ({
        ...prev,
        status: "success",
        comicvineQuery: manualSearchQuery,
        queryParams: { source: 'live', searchText: manualSearchQuery, filters: { filterNotReprint, filterWrongYear, filterSlabbed } }
      }));

      if (results.length === 0) {
        sonnerToast.info("No results found", {
          description: "Try a simpler search like just the title"
        });
      } else {
        sonnerToast.info(`Found ${results.length} results from live ComicVine search`);
      }
    } catch (err: any) {
      console.error('Manual search error:', err);
      setError(err.message || 'Search failed');
      toast({
        title: "Search failed",
        description: err.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setManualSearchLoading(false);
    }
  };

  // Extract issue number from search query (e.g. "Avengers #1" -> "1")
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

  // Select comic from volume/issue picker (local cache)
  const handleSelectIssue = async (issue: any, volume: any) => {
    const year = issue.cover_date ? new Date(issue.cover_date).getFullYear() : volume.start_year;
    
    // Convert to ComicVinePick format for consistency
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
    
    // Fetch detailed issue info from ComicVine on-demand
    const issueDetails = await fetchIssueDetails(pick);
    if (issueDetails) {
      // Update pick with detailed info
      pick.title = issueDetails.title || pick.title;
      pick.coverUrl = issueDetails.cover_url || pick.coverUrl;
      pick.writer = issueDetails.writer;
      pick.artist = issueDetails.artist;
      pick.variantDescription = issueDetails.title;
      
      // Update prefill data with detailed info
      setPrefillData({
        title: issueDetails.volume_name || volume.name,
        issueNumber: issue.issue_number || undefined,
        publisher: issueDetails.publisher || volume.publisher,
        year: year || undefined,
        comicvineId: issue.id,
        comicvineCoverUrl: issueDetails.cover_url || issue.image_url,
        description: issueDetails.description || issue.key_notes
      });
    }
    
    setStatus("selected");
    saveToRecentScans(pick);
    
    // Save to database if user is logged in
    if (user?.id && imageUrl) {
      await saveScanToHistory(user.id, imageUrl, pick);
      const dbHistory = await loadScanHistory(user.id, 10);
      if (dbHistory.length > 0) {
        setRecentScans(dbHistory);
      }
    } else {
      setRecentScans(loadRecentScans());
    }
    
    sonnerToast.success("Comic selected!", {
      description: `${volume.name} #${issue.issue_number}`
    });
  };

  // Select comic from results (live ComicVine)
  const handleSelectComic = async (pick: ComicVinePick) => {
    setSelectedPick(pick);
    setPrefillData({
      title: pick.volumeName || pick.title,
      issueNumber: pick.issue || undefined,
      publisher: pick.publisher || undefined,
      year: pick.year || undefined,
      comicvineId: pick.id,
      comicvineCoverUrl: pick.coverUrl
    });
    
    // Fetch detailed issue info from ComicVine on-demand
    const issueDetails = await fetchIssueDetails(pick);
    if (issueDetails) {
      // Update pick with detailed info
      pick.title = issueDetails.title || pick.title;
      pick.coverUrl = issueDetails.cover_url || pick.coverUrl;
      pick.writer = issueDetails.writer;
      pick.artist = issueDetails.artist;
      pick.variantDescription = issueDetails.title;
      
      // Update prefill data with detailed info
      setPrefillData({
        title: issueDetails.volume_name || pick.volumeName || pick.title,
        issueNumber: pick.issue || undefined,
        publisher: issueDetails.publisher || pick.publisher,
        year: pick.year || undefined,
        comicvineId: pick.id,
        comicvineCoverUrl: issueDetails.cover_url || pick.coverUrl,
        description: issueDetails.description
      });
    }
    
    setStatus("selected");
    saveToRecentScans(pick);
    
    // Save to database if user is logged in
    if (user?.id && imageUrl) {
      await saveScanToHistory(user.id, imageUrl, pick);
      const dbHistory = await loadScanHistory(user.id, 10);
      if (dbHistory.length > 0) {
        setRecentScans(dbHistory);
      }
    } else {
      setRecentScans(loadRecentScans());
    }
    
    sonnerToast.success("Comic selected!", {
      description: `${pick.volumeName || pick.title} #${pick.issue}`
    });
  };

  // Recent scan selection - restore the full scan state
  const handleRecentScanSelect = async (scan: ComicVinePick) => {
    // Restore the scan state as if user just clicked "Use this comic"
    setSelectedPick(scan);
    setPreviewImage(scan.thumbUrl); // Use the user's uploaded image
    setImageUrl(scan.thumbUrl);
    
    // Set prefill data
    setPrefillData({
      title: scan.volumeName || scan.title,
      issueNumber: scan.issue || undefined,
      publisher: scan.publisher || undefined,
      year: scan.year || undefined,
      comicvineId: scan.id,
      comicvineCoverUrl: scan.coverUrl
    });
    
    // Fetch fresh details from ComicVine if available
    const issueDetails = await fetchIssueDetails(scan);
    if (issueDetails) {
      scan.writer = issueDetails.writer;
      scan.artist = issueDetails.artist;
      scan.variantDescription = issueDetails.title;
      
      setPrefillData({
        title: issueDetails.volume_name || scan.volumeName || scan.title,
        issueNumber: scan.issue || undefined,
        publisher: issueDetails.publisher || scan.publisher,
        year: scan.year || undefined,
        comicvineId: scan.id,
        comicvineCoverUrl: issueDetails.cover_url || scan.coverUrl,
        description: issueDetails.description
      });
    }
    
    setStatus("selected");
    
    sonnerToast.success("Recent scan restored!", {
      description: `${scan.volumeName || scan.title}${scan.issue ? ` #${scan.issue}` : ''}`
    });
  };

  // Reset scanner
  const resetScanner = () => {
    setStatus("idle");
    setPreviewImage(null);
    setImageUrl(null);
    setSelectedPick(null);
    setPrefillData(null);
    setSearchResults([]);
    setConfidence(null);
    setError(null);
    setManualSearchQuery("");
    setFilterNotReprint(false);
    setFilterWrongYear(false);
    setFilterSlabbed(false);
  };

  // Action handlers
  const handleSellNow = async () => {
    if (!selectedPick || !user) {
      sonnerToast.error("Please select a comic and sign in");
      return;
    }

    // Save to inventory first if not already saved
    setLoading(true);
    try {
      const finalImageUrl = imageUrl;
      
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

      // Navigate to sell page with the new inventory item
      navigate(`/sell/${inventoryItem.id}`);
    } catch (error: any) {
      console.error("Error saving comic:", error);
      sonnerToast.error("Failed to save comic");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCollection = () => {
    // Navigate to collection (to be implemented)
    sonnerToast.info("Collection feature coming soon!");
  };

  // Group results by volume
  const groupedResults = groupResultsByVolume(searchResults);

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Comic Scanner</h1>
        <p className="text-muted-foreground mb-1">
          Snap a photo or upload an image to identify your comic
        </p>
        <p className="text-xs text-muted-foreground/70">
          Using local cache of 8,560+ series (updated daily)
        </p>
      </div>

      {/* Recent Scans */}
      {recentScans.length > 0 && status === "idle" && (
        <RecentScans 
          recentScans={recentScans}
          onSelectScan={handleRecentScanSelect}
        />
      )}

      {/* Camera/Upload Section */}
      {status === "idle" && (
        <Card>
          <CardHeader>
            <CardTitle>Capture Image</CardTitle>
            <CardDescription>
              Take a photo or upload an image of your comic book cover
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {!cameraActive ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full"
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    Use Camera
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    Upload Image
                  </Button>
                </>
              ) : (
                <div className="col-span-2 space-y-3">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={capturePhoto}
                      className="flex-1"
                      size="lg"
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      Capture
                    </Button>
                    <Button
                      onClick={stopCamera}
                      variant="outline"
                      size="lg"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
          </CardContent>
        </Card>
      )}

      {/* Processing State */}
      {status === "processing" && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Processing image...</p>
              <p className="text-sm text-muted-foreground">
                Running OCR and searching ComicVine
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Image */}
      {previewImage && status !== "idle" && status !== "processing" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <img
                src={previewImage}
                alt="Scanned comic"
                className="w-32 h-48 object-cover rounded-lg border"
              />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">Your Image</p>
                {confidence !== null && (
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm">
                      Match confidence: {(confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetScanner}
                >
                  <X className="h-4 w-4 mr-1" />
                  Start Over
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-match warning + Quick filters */}
      {confidence !== null && confidence < 0.8 && searchResults.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <p>The automatic match confidence is low. Use quick filters or manual search to find the exact comic.</p>
              <QuickFilterChips
                filterNotReprint={filterNotReprint}
                filterWrongYear={filterWrongYear}
                filterSlabbed={filterSlabbed}
                onFilterToggle={handleFilterToggle}
                onApplyFilters={applyFilters}
                isLoading={manualSearchLoading}
              />
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Manual Refine Search - Always visible when processing/results */}
      {(status === "results" || status === "selected") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Didn't find the right comic?</CardTitle>
            <CardDescription className="space-y-1">
              <span className="block">Refine the search below. Try "Amazing Spider-Man 129" or just the title.</span>
              <span className="block text-xs text-muted-foreground">
                Searching local ComicVine index first for speed & accuracy
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Amazing Spider-Man #129 (1974) Marvel"
                value={manualSearchQuery}
                onChange={(e) => setManualSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                disabled={manualSearchLoading}
              />
              <Button
                onClick={handleManualSearch}
                disabled={manualSearchLoading || !manualSearchQuery.trim()}
              >
                {manualSearchLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {(filterNotReprint || filterWrongYear || filterSlabbed) && (
              <QuickFilterChips
                filterNotReprint={filterNotReprint}
                filterWrongYear={filterWrongYear}
                filterSlabbed={filterSlabbed}
                onFilterToggle={handleFilterToggle}
                onApplyFilters={applyFilters}
                isLoading={manualSearchLoading}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Volume/Issue Picker - Local Cache Results */}
      {volumeResults.length > 0 && searchSource === 'local' && (
        <VolumeIssuePicker
          volumes={volumeResults}
          loading={manualSearchLoading}
          onSelectIssue={handleSelectIssue}
          onClose={() => setVolumeResults([])}
          initialIssueNumber={extractIssueNumber(manualSearchQuery)}
        />
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Results - Live ComicVine (fallback) */}
      {searchResults.length > 0 && searchSource === 'live' && (
        <div className="space-y-4">
          <Alert>
            <AlertDescription className="text-sm">
              These results are from live ComicVine search. Local cache had no matches.
            </AlertDescription>
          </Alert>
          <VolumeGroupedResults
            groupedResults={groupResultsByVolume(searchResults)}
            onSelectComic={handleSelectComic}
            onCoverClick={(url, title) => setZoomImage({ url, title })}
          />
        </div>
      )}

      {/* No Results - Show Manual Entry */}
      {status === "results" && searchResults.length === 0 && !selectedPick && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              No Match Found
            </CardTitle>
            <CardDescription>
              We couldn't find a match in our database. You can enter the details manually.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
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
                setStatus("selected");
              }}
              size="lg"
              className="w-full"
            >
              Enter Manually
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Selected Comic - Listing Form */}
      {status === "selected" && selectedPick && imageUrl && (
        <div className="space-y-6">
          <ScannerListingForm
            imageUrl={imageUrl}
            selectedPick={selectedPick}
            confidence={confidence}
          />
          
          <ScannerActions
            onSellNow={handleSellNow}
            onAddToCollection={handleAddToCollection}
          />
        </div>
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
