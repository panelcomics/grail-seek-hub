import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, Camera, Zap, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecognitionDebugOverlay } from "@/components/RecognitionDebugOverlay";
import { UploadLogPanel } from "@/components/UploadLogPanel";
import { ScannerListingForm } from "@/components/ScannerListingForm";
import { ComicVinePicker } from "@/components/ComicVinePicker";
import { uploadViaProxy } from "@/lib/uploadImage";
import { withTimeout } from "@/lib/withTimeout";
import { toast as sonnerToast } from "sonner";
import { getSessionId } from "@/lib/session";

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

interface ComicVinePick {
  id: number;
  resource: 'issue' | 'volume';
  title: string;
  issue: string | null;
  year: number | null;
  publisher?: string | null;
  volumeName?: string | null;
  volumeId?: number | null;
  variantDescription?: string | null;
  thumbUrl: string;
  coverUrl: string;
  score: number;
  isReprint: boolean;
  source?: 'comicvine' | 'cache' | 'gcd';
}

// Explicit state machine: idle → previewing → uploading → picks → editing
// Once in 'picks' or 'editing', only user actions change state
type ScannerStatus = "idle" | "previewing" | "uploading" | "picks" | "editing";

export default function Scanner() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null); // Preview before recognition (local data URL)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null); // Fast-loading thumbnail from server
  const [imageUrl, setImageUrl] = useState<string | null>(null); // Final compressed image for listing
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"camera" | "upload" | "search">("camera");
  const [searchResults, setSearchResults] = useState<ComicVinePick[]>([]);
  const [textSearchResults, setTextSearchResults] = useState<any[]>([]);
  
  // Sticky session: once a scan is active, keep it active until explicit user action
  const [scanSessionActive, setScanSessionActive] = useState(false);
  const [selectedPick, setSelectedPick] = useState<ComicVinePick | null>(null);

  const [debugData, setDebugData] = useState({
    status: "idle" as "idle" | "processing" | "success" | "error",
    method: null as "camera" | "upload" | "search" | null,
    apiHit: null as "ComicVine" | "scan-item" | null,
    confidenceScore: null as number | null,
    responseTimeMs: null as number | null,
    ocrTimeMs: null as number | null,
    errorMessage: null as string | null,
    rawOcrText: null as string | null,
    cvQuery: null as string | null,
    slabData: null as any,
    ebayData: null as any,
    retryAttempt: 0,
  });

  const [uploadLog, setUploadLog] = useState<{
    timestamp: string;
    fieldName: string;
    size: string;
    type: string;
    status: number;
    path?: string;
    publicUrl?: string;
    elapsed: string;
    error?: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isDev = import.meta.env.DEV || window.location.hostname.includes("lovableproject.com");

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast({
        title: "Camera access denied",
        description: "Please enable camera access in your browser settings.",
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

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const capturedImageData = canvas.toDataURL("image/jpeg");
        setPreviewImage(capturedImageData);
        setStatus("previewing");
        stopCamera();
      }
    }
  };

  const handleRetake = () => {
    setPreviewImage(null);
    setThumbnailUrl(null);
    setImageUrl(null);
    setStatus("idle");
    setScanSessionActive(false);
    startCamera();
  };

  const handleUsePhoto = () => {
    if (!previewImage) return;
    setImageUrl(previewImage);
    identifyFromImage(previewImage, "camera");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('UPLOAD_CLICK');
    const file = event.target.files?.[0];
    console.log('FILE_SELECTED', file?.name, file?.size, file?.type);
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const uploadedImageData = e.target?.result as string;
      // Skip preview, immediately upload
      identifyFromImage(uploadedImageData, "upload");
    };
    reader.readAsDataURL(file);
  };

  const handleChooseDifferent = () => {
    setPreviewImage(null);
    setThumbnailUrl(null);
    setImageUrl(null);
    setStatus("idle");
    setScanSessionActive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleContinue = () => {
    if (!previewImage) return;
    setImageUrl(previewImage);
    identifyFromImage(previewImage, "upload");
  };

  // Server-side OCR with storage, retry, and eBay pricing
  const identifyFromImage = async (imageData: string, method: "camera" | "upload", retryCount = 0) => {
    if (!imageData) return;

    const getTimestamp = () => `[Scanner ${new Date().toISOString()}]`;
    
    console.log(`${getTimestamp()} 📸 Starting scanner flow...`, { method, retryCount });

    try {
      setLoading(true);
      setStatus("uploading");
      setScanSessionActive(true); // Activate sticky session
      setPrefillData(null);
      setConfidence(null);

      setDebugData({
        status: "processing",
        method,
        apiHit: null,
        confidenceScore: null,
        responseTimeMs: null,
        ocrTimeMs: null,
        errorMessage: null,
        rawOcrText: null,
        cvQuery: null,
        slabData: null,
        ebayData: null,
        retryAttempt: retryCount,
      });

      // Check authentication
      console.log(`${getTimestamp()} Checking authentication...`);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error(`${getTimestamp()} ERROR: Not authenticated`);
        throw new Error("Please sign in to use the scanner");
      }
      console.log(`${getTimestamp()} User authenticated`);

      // Step 1: Upload via proxy with 20s timeout
      const base64Data = imageData.split(",")[1];
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      const file = new File([bytes], `comic-scan-${Date.now()}.jpg`, { type: "image/jpeg" });
      
      console.log(`${getTimestamp()} ⏫ Uploading via proxy...`, {
        fileSize: file.size,
        fileType: file.type
      });

      const uploadStartTime = Date.now();
      let uploadResult;
      try {
        uploadResult = await withTimeout(
          uploadViaProxy(file),
          30000,
          "upload"
        );
        console.log('UPLOAD_RESPONSE', uploadResult);
        
        if (!uploadResult?.publicUrl) {
          console.warn('NO_PUBLIC_URL_FROM_UPLOAD');
          throw new Error("Upload succeeded but returned no public URL");
        }
      } catch (e: any) {
        console.error('UPLOAD_FAILED', e?.message ?? e);
        sonnerToast.error("Upload failed", {
          description: e?.message ?? "Unknown error during upload"
        });
        throw e;
      }
      
      const { path: uploadPath, publicUrl, previewUrl, stats } = uploadResult;
      const uploadElapsed = Date.now() - uploadStartTime;

      console.log(`${getTimestamp()} ✅ Photo uploaded successfully:`, { 
        path: uploadPath, 
        publicUrl,
        previewUrl,
        stats
      });

      // Log upload details with compression stats
      setUploadLog({
        timestamp: new Date().toLocaleTimeString(),
        fieldName: "image",
        size: stats ? `${stats.originalKB}KB → ${stats.compressedKB}KB (preview: ${stats.previewKB}KB)` : `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type,
        status: 200,
        path: uploadPath,
        publicUrl,
        elapsed: stats ? `${stats.elapsedMs}ms (compression + upload)` : `${uploadElapsed}ms`
      });

      // Show thumbnail immediately, then swap to full compressed image
      if (previewUrl) {
        setThumbnailUrl(previewUrl);
        setImageUrl(previewUrl); // Show thumbnail first
        
        // Swap to full compressed image after a brief moment
        setTimeout(() => {
          setImageUrl(publicUrl);
        }, 100);
      } else {
        setImageUrl(publicUrl);
      }
      
      setPrefillData({ comicvineCoverUrl: publicUrl });
      // Start in 'picks' state - will show picks when they arrive, manual entry always available
      setStatus("picks");

      toast({
        title: "✅ Photo uploaded",
        description: stats 
          ? `Compressed ${stats.originalKB}KB → ${stats.compressedKB}KB. Scanning for details...`
          : "Scanning for details...",
      });

      // Step 2: Run recognition in background (non-blocking)
      console.log(`${getTimestamp()} 🔍 Starting background recognition...`);
      
      // FEATURE_SCANNER_ANALYTICS & FEATURE_IMAGE_COMPRESSION are handled server-side
      // FEATURE_TOP3_PICKS, FEATURE_REPRINT_FILTER controlled by scan-item response
      (async () => {
        try {
          const ocrStartTime = Date.now();
          
          // Get session ID for analytics
          const sessionId = getSessionId();
          
          const { data: scanResult, error: scanError } = await withTimeout(
            supabase.functions.invoke("scan-item", {
              body: { 
                imageBase64: base64Data,
                sessionId 
              },
              headers: { Authorization: `Bearer ${session.access_token}` }
            }),
            45000,
            "scan-item"
          );

          const ocrTime = Date.now() - ocrStartTime;

          if (scanError) {
            console.warn(`${getTimestamp()} ⚠️ Background scan failed:`, scanError.message);
            setDebugData(prev => ({ ...prev, status: "error", errorMessage: scanError.message }));
            return;
          }

          if (scanResult?.ok === false) {
            console.warn(`${getTimestamp()} ⚠️ scan-item returned ok=false:`, scanResult.error);
            return;
          }

          const results = scanResult?.picks || [];
          const rawOcrText = scanResult?.ocrText || "";
          const cvQuery = scanResult?.cvQuery || "";
          const extracted = scanResult?.extracted || {};

          console.log(`${getTimestamp()} ✅ OCR/vision result:`, {
            ocrTime: `${ocrTime}ms`,
            rawOcrText: rawOcrText.substring(0, 100) + (rawOcrText.length > 100 ? "..." : ""),
            cvQuery,
            extracted,
            matchesFound: results.length
          });

          console.log(`${getTimestamp()} 📚 ComicVine top 3 results:`, results);

          // Store results for picker - but DON'T change status automatically
          // User must explicitly select a pick or choose manual entry
          setSearchResults(results);

          // Merge results if found
          if (results.length > 0) {
            const topResult = results[0];
            const calculatedConfidence = Math.min(95, 70 + (5 - Math.min(results.length, 5)) * 5);
            const slabData = {
              title: extracted.series_title || topResult.volume || "",
              issueNumber: extracted.issue_number || topResult.issue_number || "",
              grade: extracted.grade || "",
              certNumber: rawOcrText.match(/\d{8}-\d{3}/)?.[0] || "",
              gradingCompany: extracted.gradingCompany || "",
              publisher: extracted.publisher || topResult.publisher || "",
              year: extracted.year || topResult.year || "",
            };

            const title = topResult.volume || topResult.volumeName || "";
            const issueNumber = topResult.issue_number || "";

            const prefill: PrefillData = {
              title: title,
              series: title,
              issueNumber: issueNumber,
              publisher: slabData.publisher,
              year: slabData.year,
              comicvineId: topResult.id || "",
              comicvineCoverUrl: topResult.image || topResult.cover_image || topResult.coverUrl || publicUrl,
              description: topResult.description || "",
            };

            setPrefillData(prefill);
            setConfidence(calculatedConfidence);

            // Fetch eBay pricing if grade detected
            if (title && issueNumber && slabData.grade) {
              try {
                console.log(`${getTimestamp()} 💰 Fetching eBay pricing...`);
                const { data: pricingData, error: pricingError } = await supabase.functions.invoke("ebay-pricing", {
                  body: { title, issueNumber, grade: slabData.grade },
                });

                if (!pricingError && pricingData?.ok && pricingData.avgPrice) {
                  const avgPrice = pricingData.avgPrice.toFixed(0);
                  const comp = pricingData.items?.[0];
                  const compLink = comp?.url ? `[View listing](${comp.url})` : "";
                  const pricingText = `\n\n💰 **eBay Sold Avg: $${avgPrice}** (CGC ${slabData.grade})${comp ? `\nRecent: ${comp.title.slice(0, 60)}... - $${comp.price} ${compLink}` : ""}`;
                  prefill.description = (prefill.description || "") + pricingText;
                  setPrefillData(prefill);

                  console.log(`${getTimestamp()} ✅ eBay pricing: $${avgPrice}`);
                }
              } catch (err) {
                console.warn(`${getTimestamp()} eBay fetch failed:`, err);
              }
            }

            // Update debug data but DON'T change status automatically
            // User stays in 'picks' state until they explicitly choose
            setDebugData({
              status: "success",
              method,
              apiHit: "ComicVine",
              confidenceScore: calculatedConfidence,
              responseTimeMs: ocrTime,
              ocrTimeMs: ocrTime,
              errorMessage: null,
              rawOcrText,
              cvQuery,
              slabData,
              ebayData: null,
              retryAttempt: retryCount,
            });

            console.log(`${getTimestamp()} ✅ Results ready:`, { title, issueNumber, confidence: calculatedConfidence });
            
            if (calculatedConfidence >= 65) {
              sonnerToast("Matches found", {
                description: "Select a match or enter details manually."
              });
            } else {
              sonnerToast("Results ready", {
                description: "You can select a match or enter details manually."
              });
            }
          } else {
            console.log(`${getTimestamp()} ℹ️ No metadata found`);
          }
        } catch (bgError: any) {
          console.warn("[Scanner] background scan failed:", bgError?.message ?? bgError);
        }
      })();

    } catch (error: any) {
      console.error("[Scanner]", error);
      
      // Log upload error
      setUploadLog(prev => prev ? {
        ...prev,
        status: 500,
        error: error?.message || String(error)
      } : null);

      sonnerToast("Scan failed", {
        description: error?.message ?? "Unknown error",
      });
      setStatus("idle");
      setScanSessionActive(false);
    } finally {
      setLoading(false);
      setCameraActive(false);
      stopCamera();
      console.log(`${getTimestamp()} Scanner flow complete`);
    }
  };

  const handleTextSearch = async () => {
    const searchTerm = query.trim();
    if (!searchTerm) {
      toast({
        title: "Enter a search term",
        description: "Example: 'Uncanny X-Men 268'",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setTextSearchResults([]);

    try {
      const { data, error } = await supabase.functions.invoke("comic-scanner", {
        body: { query: searchTerm },
      });

      if (error) throw error;

      const results = data?.results || [];

      if (results.length === 0) {
        toast({
          title: "No results found",
          description: "Try a different search term.",
          variant: "destructive",
        });
        return;
      }

      setTextSearchResults(results);
      toast({
        title: "Results found",
        description: `Found ${results.length} result(s)`,
      });
    } catch (err: any) {
      console.error("Search error:", err);
      toast({
        title: "Search failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUseSearchResult = (result: any) => {
    // Set the searchResults to pass to form as picks
    setSearchResults([{
      id: result.id || 0,
      resource: 'issue',
      title: result.title || result.volume || result.volumeName || "",
      issue: result.issue_number || null,
      year: result.year ? parseInt(result.year) : null,
      publisher: result.publisher || null,
      volumeName: result.volumeName || result.volume || null,
      volumeId: result.volumeId || null,
      variantDescription: result.description || null,
      thumbUrl: result.thumbnail || result.image || result.cover_image || result.coverUrl || "",
      coverUrl: result.image || result.cover_image || result.coverUrl || "",
      score: 1,
      isReprint: false,
    }]);
    setImageUrl("");
    setStatus("picks");
    setScanSessionActive(true);
  };

  const handleReset = () => {
    setImageUrl(null);
    setPreviewImage(null);
    setThumbnailUrl(null);
    setPrefillData(null);
    setSearchResults([]);
    setSelectedPick(null);
    setStatus("idle");
    setConfidence(null);
    setQuery("");
    setTextSearchResults([]);
    setCameraActive(false);
    setScanSessionActive(false);
    stopCamera();
  };

  // Explicit user actions to move from 'picks' to 'editing'
  const handleSelectPickFromPicker = (pick: ComicVinePick) => {
    setSelectedPick(pick);
    setStatus("editing");
  };

  const handleManualEntry = () => {
    setSelectedPick(null); // Clear any selected pick
    setStatus("editing");
  };

  // Show picker/manual entry choice when in 'picks' state with results
  const showPickerScreen = scanSessionActive && status === "picks" && imageUrl;
  
  // Show editing form when user explicitly chooses editing or when in 'editing' state
  const showEditingForm = scanSessionActive && status === "editing" && imageUrl;

  return (
    <AppLayout>
      {/* Hero */}
      <section className="bg-muted/30 border-b">
        <div className="container mx-auto py-6 px-4">
          <h1 className="text-2xl md:text-3xl font-bold">AI Scanner</h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1">
            Snap, upload, or search to identify comics and prefill details
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 py-8 flex-1">
        {showPickerScreen ? (
          // Show picker screen: user must choose a pick or manual entry
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Select a Match or Enter Manually</h2>
              <Button variant="outline" onClick={handleReset}>
                <X className="mr-2 h-4 w-4" />
                Cancel Scan
              </Button>
            </div>

            {/* User's Photo */}
            {imageUrl && (
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-32 h-48 flex-shrink-0">
                      <img
                        src={imageUrl}
                        alt="Your comic photo"
                        className="w-full h-full object-cover rounded border-2 border-primary"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Your Photo</h3>
                      <p className="text-sm text-muted-foreground">
                        This will be your listing image. Select a match below or enter details manually.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading state while scanning */}
            {loading && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <h3 className="text-xl font-semibold">Scanning for matches...</h3>
                  <p className="text-sm text-muted-foreground">You can choose manual entry below if you prefer</p>
                </CardContent>
              </Card>
            )}

            {/* ComicVine Picker */}
            {searchResults.length > 0 && (
              <div className="mb-6">
                <ComicVinePicker
                  picks={searchResults}
                  onSelect={handleSelectPickFromPicker}
                />
              </div>
            )}

            {/* Manual Entry Button - Always Available */}
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold mb-2">
                  {searchResults.length > 0 ? "Or enter details manually" : "No matches found - Enter details manually"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  All fields will be editable. Your photo is already saved.
                </p>
                <Button onClick={handleManualEntry} size="lg" variant="outline" className="w-full max-w-md">
                  Enter Details Manually
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : showEditingForm ? (
          // Show editing form when user explicitly entered editing mode
          <div className="space-y-4">
            <Button variant="outline" onClick={handleReset} className="mb-4">
              <X className="mr-2 h-4 w-4" />
              Cancel & Scan Another Comic
            </Button>
            <ScannerListingForm 
              imageUrl={imageUrl || ""} 
              initialData={{}}
              confidence={confidence}
              comicvineResults={searchResults}
              selectedPick={selectedPick}
            />
          </div>
        ) : (
          // Show scanner interface
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid grid-cols-3 max-w-xl mx-auto">
              <TabsTrigger value="camera">
                <Camera className="h-4 w-4 mr-2" />
                Camera
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="search">
                <Search className="h-4 w-4 mr-2" />
                Search
              </TabsTrigger>
            </TabsList>

            {/* Camera tab */}
            <TabsContent value="camera" className="mt-6 space-y-4">
              {status === "idle" && !cameraActive && !previewImage && (
                <Card>
                  <CardContent className="flex flex-col items-center gap-4 py-8">
                    <Camera className="h-16 w-16 text-primary" />
                    <h3 className="text-xl font-semibold">Use your camera</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      Use your camera to capture the full front cover.
                    </p>
                    <Button onClick={startCamera} size="lg">
                      <Camera className="mr-2 h-5 w-5" />
                      Open Camera
                    </Button>
                  </CardContent>
                </Card>
              )}

              {cameraActive && !previewImage && (
                <Card>
                  <CardContent className="p-4">
                    <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="flex gap-2 mt-4">
                      <Button onClick={capturePhoto} className="flex-1" size="lg">
                        <Camera className="mr-2 h-5 w-5" />
                        Capture Photo
                      </Button>
                      <Button onClick={stopCamera} variant="outline" size="lg">
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {status === "previewing" && previewImage && (
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-xl font-semibold text-center">Preview</h3>
                    <div className="max-w-md mx-auto">
                      <img src={previewImage} alt="Preview" className="w-full rounded-lg border-2 border-border" />
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={handleRetake} className="flex-1">
                        Retake
                      </Button>
                      <Button onClick={handleUsePhoto} className="flex-1">
                        Use This Photo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {status === "uploading" && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <h3 className="text-xl font-semibold">Uploading & Scanning...</h3>
                    <p className="text-sm text-muted-foreground">This will only take a moment</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Upload tab */}
            <TabsContent value="upload" className="mt-6 space-y-4">
              {status === "idle" && !previewImage && (
                <Card>
                  <CardContent className="flex flex-col items-center gap-4 py-8">
                    <Upload className="h-16 w-16 text-primary" />
                    <h3 className="text-xl font-semibold">Upload a photo</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      Upload a clear photo or scan of the front cover.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <Button size="lg" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="mr-2 h-5 w-5" />
                      Choose File
                    </Button>
                  </CardContent>
                </Card>
              )}

              {status === "previewing" && previewImage && (
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-xl font-semibold text-center">Preview</h3>
                    <div className="max-w-md mx-auto">
                      <img src={previewImage} alt="Preview" className="w-full rounded-lg border-2 border-border" />
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={handleChooseDifferent} className="flex-1">
                        Choose Different Image
                      </Button>
                      <Button onClick={handleContinue} className="flex-1">
                        Continue
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {status === "uploading" && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <h3 className="text-xl font-semibold">Uploading & Scanning...</h3>
                    <p className="text-sm text-muted-foreground">This will only take a moment</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Search tab */}
            <TabsContent value="search" className="mt-6 space-y-4">
              <Card>
                <CardContent className="flex flex-col gap-4 py-6">
                  <div className="text-center space-y-2">
                    <Search className="h-16 w-16 mx-auto text-primary" />
                    <h3 className="text-xl font-semibold">Search for a comic</h3>
                    <p className="text-sm text-muted-foreground">Find your comic by title, series, or issue number.</p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., 'Amazing Spider-Man 300'"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleTextSearch()}
                      className="flex-1"
                    />
                    <Button onClick={handleTextSearch} disabled={loading} size="lg">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>

                  {textSearchResults.length > 0 && (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto mt-4">
                      {textSearchResults.map((result, index) => {
                        const title = result.title || result.volume || result.volumeName || "";
                        const coverUrl = result.image || result.cover_image || result.coverUrl;

                        return (
                          <Card key={index} className="hover:border-primary/50 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                {coverUrl && (
                                  <img src={coverUrl} alt={title} className="w-16 h-24 object-cover rounded" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold truncate">
                                    {title}
                                    {result.issue_number && ` #${result.issue_number}`}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {result.publisher}
                                    {result.year && ` • ${result.year}`}
                                  </p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => handleUseSearchResult(result)}>
                                  Use This Issue
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </section>

      {/* Debug overlay - enabled in dev and preview */}
      {isDev && <RecognitionDebugOverlay debugData={debugData} />}
      
      {/* Upload log panel - dev/preview only */}
      <UploadLogPanel log={uploadLog} />
    </AppLayout>
  );
}
