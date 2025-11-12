import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, Camera, Zap, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/externalSupabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecognitionDebugOverlay } from "@/components/RecognitionDebugOverlay";
import { ScannerListingForm } from "@/components/ScannerListingForm";

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

interface SearchResult {
  id: string | number;
  title?: string;
  volume?: string;
  volumeName?: string;
  issue_number?: string;
  publisher?: string;
  year?: string;
  image?: string;
  cover_image?: string;
  coverUrl?: string;
  description?: string;
}

type ScannerStatus = "idle" | "previewing" | "recognizing" | "prefilled" | "manual";

export default function Scanner() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null); // Preview before recognition
  const [imageUrl, setImageUrl] = useState<string | null>(null); // Final user image for listing
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"camera" | "upload" | "search">("camera");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

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
    setStatus("idle");
    startCamera();
  };

  const handleUsePhoto = () => {
    if (!previewImage) return;
    setImageUrl(previewImage);
    identifyFromImage(previewImage, "camera");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const uploadedImageData = e.target?.result as string;
      setPreviewImage(uploadedImageData);
      setStatus("previewing");
    };
    reader.readAsDataURL(file);
  };

  const handleChooseDifferent = () => {
    setPreviewImage(null);
    setStatus("idle");
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

    const startTime = Date.now();
    setLoading(true);
    setStatus("recognizing");
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

    // 10-second timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Scan timeout after 10s')), 10000)
    );

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to use the scanner",
          variant: "destructive"
        });
        setLoading(false);
        setStatus("idle");
        setDebugData(prev => ({ ...prev, status: 'error', errorMessage: 'Not authenticated' }));
        return;
      }

      // Step 1: Upload image to Storage first (preserve photo)
      toast({
        title: "📤 Uploading photo...",
        description: "Securing your image",
      });

      const timestamp = Date.now();
      const fileName = `listings/${user.id}/${timestamp}-comic.jpg`;
      const base64Data = imageData.split(',')[1];
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' });

      const { data: uploadData, error: uploadError } = await externalSupabase.storage
        .from('images')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('Image upload failed:', uploadError);
        toast({
          title: "Image upload failed",
          description: uploadError.message || "Please try again",
          variant: "destructive"
        });
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = externalSupabase.storage
        .from('images')
        .getPublicUrl(fileName);

      console.log('Photo uploaded:', publicUrl);
      setImageUrl(publicUrl); // Preserve photo URL

      // Step 2: Server-side barcode + OCR + ComicVine
      toast({
        title: "🔍 AI Recognition...",
        description: retryCount > 0 ? "Retry attempt..." : "Scanning barcode & reading text",
      });

      const ocrStartTime = Date.now();
      const scanPromise = supabase.functions.invoke("scan-item", {
        body: { 
          imageBase64: base64Data,
        },
      });

      const { data, error } = await Promise.race([
        scanPromise,
        timeoutPromise
      ]) as any;

      const ocrTime = Date.now() - ocrStartTime;
      const responseTime = Date.now() - startTime;

      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || "Unable to process image");

      const results = data?.comicvineResults || [];
      const rawOcrText = data?.ocrText || '';
      const cvQuery = data?.cvQuery || '';
      const extracted = data?.extracted || {};
      
      console.log('Server response:', { 
        ocrTime: `${ocrTime}ms`, 
        rawOcrText: rawOcrText.substring(0, 100), 
        cvQuery, 
        extracted,
        results: results.length 
      });
      
      if (results.length === 0) {
        // No match - retry once if first attempt
        if (retryCount === 0) {
          console.log('No results, retrying...');
          toast({
            title: "Retrying...",
            description: "Attempting different recognition method",
          });
          setLoading(false);
          return identifyFromImage(imageData, method, 1);
        }
        
        // After retry, fallback to manual
        setDebugData({
          status: "error",
          method,
          apiHit: "ComicVine",
          confidenceScore: 0,
          responseTimeMs: responseTime,
          ocrTimeMs: ocrTime,
          errorMessage: "No match after retry",
          rawOcrText,
          cvQuery,
          slabData: null,
          ebayData: null,
          retryAttempt: retryCount,
        });
        
        toast({
          title: "No match found",
          description: "Opening manual search...",
          variant: "destructive",
        });
        
        setTimeout(() => setActiveTab("search"), 1000);
        setLoading(false);
        return;
      }

      // Step 4: Use extracted slab data from backend
      const slabData = {
        title: extracted.series_title || results[0]?.volume || "",
        issueNumber: extracted.issue_number || results[0]?.issue_number || "",
        grade: extracted.grade || "",
        certNumber: rawOcrText.match(/\d{8}-\d{3}/)?.[0] || "",
        gradingCompany: extracted.gradingCompany || "",
        publisher: extracted.publisher || "",
        year: extracted.year || "",
      };

      const topResult = results[0];
      const calculatedConfidence = Math.min(95, 70 + (5 - Math.min(results.length, 5)) * 5);
      
      const title = topResult.volume || topResult.volumeName || "";
      const issueNumber = topResult.issue_number || "";
      
      const prefill: PrefillData = {
        title: title,
        series: title,
        issueNumber: issueNumber,
        publisher: slabData.publisher || topResult.publisher || "",
        year: slabData.year || topResult.year || "",
        comicvineId: topResult.id || "",
        comicvineCoverUrl: topResult.image || topResult.cover_image || topResult.coverUrl || "",
        description: topResult.description || "",
      };

      setPrefillData(prefill);
      setConfidence(calculatedConfidence);
      
      // Step 5: Fetch eBay pricing (ALWAYS if grade detected)
      let ebayData = null;
      if (title && issueNumber && slabData.grade) {
        try {
          toast({
            title: "💰 Checking market prices...",
            description: "Fetching eBay sold listings",
          });

          const { data: pricingData, error: pricingError } = await supabase.functions.invoke("ebay-pricing", {
            body: { 
              title, 
              issueNumber, 
              grade: slabData.grade 
            },
          });
          
          if (pricingError) {
            console.error('eBay API error:', pricingError);
          } else if (pricingData?.ok && pricingData.avgPrice) {
            ebayData = pricingData;
            console.log('eBay pricing:', {
              avg: pricingData.avgPrice,
              range: `${pricingData.minPrice}-${pricingData.maxPrice}`,
              comps: pricingData.items?.length
            });
            
            // Add prominent pricing to description
            const avgPrice = pricingData.avgPrice.toFixed(0);
            const comp = pricingData.items?.[0];
            const compLink = comp?.url ? `[View listing](${comp.url})` : '';
            const pricingText = `\n\n💰 **eBay Sold Avg: $${avgPrice}** (CGC ${slabData.grade})${comp ? `\nRecent: ${comp.title.slice(0, 60)}... - $${comp.price} ${compLink}` : ''}`;
            prefill.description = (prefill.description || '') + pricingText;
            setPrefillData(prefill);
            
            toast({
              title: "💰 Market data found",
              description: `Avg sold: $${avgPrice} | ${pricingData.items?.length || 0} comps`,
            });
          } else {
            console.log('No eBay pricing data available');
          }
        } catch (err) {
          console.error('eBay fetch failed:', err);
        }
      }
      
      // Step 6: Update UI based on confidence
      if (calculatedConfidence >= 65 && title && issueNumber) {
        setStatus("prefilled");
        setDebugData({
          status: "success",
          method,
          apiHit: "ComicVine",
          confidenceScore: calculatedConfidence,
          responseTimeMs: responseTime,
          ocrTimeMs: ocrTime,
          errorMessage: null,
          rawOcrText,
          cvQuery,
          slabData,
          ebayData,
          retryAttempt: retryCount,
        });
        
        const ebayMsg = ebayData?.avgPrice ? ` | eBay avg: $${ebayData.avgPrice.toFixed(0)}` : '';
        toast({
          title: "✅ Comic identified!",
          description: `${title} #${issueNumber}${ebayMsg}`,
        });
      } else {
        setStatus("manual");
        setDebugData({
          status: "error",
          method,
          apiHit: "ComicVine",
          confidenceScore: calculatedConfidence,
          responseTimeMs: responseTime,
          ocrTimeMs: ocrTime,
          errorMessage: `Low confidence (${calculatedConfidence}%)`,
          rawOcrText,
          cvQuery,
          slabData,
          ebayData,
          retryAttempt: retryCount,
        });
        toast({
          title: "Low confidence",
          description: "Review and edit details.",
        });
      }

    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      console.error("Scan error:", err);
      
      const isTimeout = err.message?.includes('timeout');
      
      // Retry once on timeout if first attempt
      if (isTimeout && retryCount === 0) {
        console.log('Timeout, retrying...');
        setLoading(false);
        toast({
          title: "⏱️ Timeout - retrying...",
          description: "Attempting again",
        });
        return identifyFromImage(imageData, method, 1);
      }
      
      setDebugData({
        status: "error",
        method,
        apiHit: "scan-item",
        confidenceScore: null,
        responseTimeMs: responseTime,
        ocrTimeMs: null,
        errorMessage: err.message || "Unexpected error",
        rawOcrText: null,
        cvQuery: null,
        slabData: null,
        ebayData: null,
        retryAttempt: retryCount,
      });

      toast({
        title: isTimeout ? "⏱️ Scan timeout" : "❌ Recognition failed",
        description: "Photo saved - opening manual search",
        variant: "destructive",
      });
      
      setTimeout(() => setActiveTab("search"), 1000);
      
    } finally {
      setLoading(false);
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
    setSearchResults([]);

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

      setSearchResults(results);
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

  const handleUseSearchResult = (result: SearchResult) => {
    const title = result.title || result.volume || result.volumeName || "";
    
    setPrefillData({
      title: title,
      series: title,
      issueNumber: result.issue_number || "",
      publisher: result.publisher || "",
      year: result.year || "",
      comicvineId: result.id || "",
      comicvineCoverUrl: result.image || result.cover_image || result.coverUrl || "",
      description: result.description || "",
    });
    setConfidence(100); // Manual search selection = 100% confidence
    setStatus("prefilled");
    // Note: No imageUrl set for search results - form will handle this
  };

  const handleReset = () => {
    setImageUrl(null);
    setPreviewImage(null);
    setPrefillData(null);
    setStatus("idle");
    setConfidence(null);
    setQuery("");
    setSearchResults([]);
    setCameraActive(false);
    stopCamera();
  };

  // Show listing form when we have status prefilled or manual
  const showListingForm = (status === "prefilled" || status === "manual") && (imageUrl || prefillData);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/20 via-background to-accent/10 border-b-4 border-primary">
        <div className="container mx-auto py-10 px-4">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-4">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                GrailSeeker AI Scanner
              </h1>
              <p className="text-muted-foreground text-base md:text-lg">
                Snap a photo, upload an image, or search by title. We'll identify your comic and prefill details.
                All fields remain editable - you can always list manually.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>AI-powered identification</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>Your photo = listing image</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>Manual listing always available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 py-8 flex-1">
        {showListingForm ? (
          // Show listing form with user's image
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={handleReset}
              className="mb-4"
            >
              ← Scan Another Comic
            </Button>
            <ScannerListingForm
              imageUrl={imageUrl || ""}
              initialData={prefillData || {}}
              confidence={confidence}
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
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full rounded-lg"
                    />
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
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="w-full rounded-lg border-2 border-border"
                      />
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

              {status === "recognizing" && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <h3 className="text-xl font-semibold">Identifying Comic...</h3>
                    <p className="text-sm text-muted-foreground">
                      Extracting text and searching database
                    </p>
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
                    <Button
                      size="lg"
                      onClick={() => fileInputRef.current?.click()}
                    >
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
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="w-full rounded-lg border-2 border-border"
                      />
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

              {status === "recognizing" && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <h3 className="text-xl font-semibold">Identifying Comic...</h3>
                    <p className="text-sm text-muted-foreground">
                      Extracting text and searching database
                    </p>
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
                    <p className="text-sm text-muted-foreground">
                      Find your comic by title, series, or issue number.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., 'Amazing Spider-Man 300'"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleTextSearch()}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleTextSearch}
                      disabled={loading}
                      size="lg"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto mt-4">
                      {searchResults.map((result, index) => {
                        const title = result.title || result.volume || result.volumeName || "";
                        const coverUrl = result.image || result.cover_image || result.coverUrl;
                        
                        return (
                          <Card key={index} className="hover:border-primary/50 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                {coverUrl && (
                                  <img
                                    src={coverUrl}
                                    alt={title}
                                    className="w-16 h-24 object-cover rounded"
                                  />
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUseSearchResult(result)}
                                >
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

      <Footer />
      
      {/* Debug overlay - only in development */}
      {import.meta.env.DEV && <RecognitionDebugOverlay debugData={debugData} />}
    </div>
  );
}
