import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, Camera, Zap, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ComicResultCard } from "@/components/ComicResultCard";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecognitionDebugOverlay } from "@/components/RecognitionDebugOverlay";

interface ComicData {
  comicvine_id: number;
  title: string;
  issue_number: string;
  full_title: string;
  publisher?: string;
  year?: number;
  cover_image?: string;
  cover_thumb?: string;
  description?: string;
  characters?: string[];
  ebay_avg_price?: number;
  trade_fee_total?: number;
  trade_fee_each?: number;
  fee_tier?: string;
}

export default function Scanner() {
  const [query, setQuery] = useState("");
  const [comic, setComic] = useState<ComicData | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"camera" | "upload" | "search">("camera");
  const [debugData, setDebugData] = useState({
    status: "idle" as "idle" | "processing" | "success" | "error",
    method: null as "camera" | "upload" | null,
    apiHit: null as "ComicVine" | "scan-item" | null,
    confidenceScore: null as number | null,
    responseTimeMs: null as number | null,
    errorMessage: null as string | null,
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
        // Explicitly play the video
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
        setImageData(capturedImageData);
        stopCamera();
        toast({
          title: "Photo captured!",
          description: "Processing your comic now...",
        });
        identifyFromImage(capturedImageData, "camera");
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const uploadedImageData = e.target?.result as string;
      setImageData(uploadedImageData);
      toast({
        title: "Image uploaded!",
        description: "Processing your comic now...",
      });
      identifyFromImage(uploadedImageData, "upload");
    };
    reader.readAsDataURL(file);
  };

  // Single pipeline for image identification
  const identifyFromImage = async (imageData: string, method: "camera" | "upload") => {
    if (!imageData) {
      toast({
        title: "No image data",
        description: "Please capture or upload an image first.",
        variant: "destructive",
      });
      return;
    }

    const startTime = Date.now();
    setLoading(true);
    setComic(null);
    
    // Update debug state: processing
    setDebugData({
      status: "processing",
      method,
      apiHit: null,
      confidenceScore: null,
      responseTimeMs: null,
      errorMessage: null,
    });

    try {
      // Extract base64 data (remove data:image/jpeg;base64, prefix if present)
      const base64Data = imageData.includes(",")
        ? imageData.split(",")[1]
        : imageData;

      console.log("Calling scan-item with image data:", {
        dataLength: base64Data.length,
        preview: base64Data.substring(0, 50) + "..."
      });

      // Call scan-item edge function via Supabase client
      const { data, error } = await supabase.functions.invoke("scan-item", {
        body: { imageBase64: base64Data },
      });

      const responseTime = Date.now() - startTime;
      console.log("scan-item response:", { data, error });

      if (error) {
        console.error("Edge function error:", error);
        setDebugData({
          status: "error",
          method,
          apiHit: "scan-item",
          confidenceScore: null,
          responseTimeMs: responseTime,
          errorMessage: error.message || "Edge function error",
        });
        throw error;
      }

      // Handle scan-item response format: { ok, extracted, comicvineResults, cached }
      if (data?.ok === false) {
        const errorMsg = data.error || "Unable to process image";
        setDebugData({
          status: "error",
          method,
          apiHit: "scan-item",
          confidenceScore: null,
          responseTimeMs: responseTime,
          errorMessage: errorMsg,
        });
        toast({
          title: "Scan failed",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }

      // Check if we got ComicVine results
      const results = data?.comicvineResults || [];
      
      if (results.length === 0) {
        setDebugData({
          status: "error",
          method,
          apiHit: "ComicVine",
          confidenceScore: 0,
          responseTimeMs: responseTime,
          errorMessage: "No match found",
        });
        toast({
          title: "No match found",
          description: "Try a clearer photo with the full cover visible, or use manual search.",
          variant: "destructive",
        });
        return;
      }

      // Use the first (best) match
      const topResult = results[0];
      
      // Calculate confidence (placeholder - ComicVine doesn't return confidence scores)
      // Could be based on number of results or other heuristics
      const confidence = results.length > 0 ? Math.min(95, 70 + (5 - Math.min(results.length, 5)) * 5) : 0;
      
      // Map to our ComicData format
      const identifiedComic: ComicData = {
        comicvine_id: topResult.id,
        title: topResult.volume || topResult.volumeName || "",
        issue_number: topResult.issue_number || "",
        full_title: topResult.name || `${topResult.volume} #${topResult.issue_number}`,
        publisher: topResult.publisher,
        year: topResult.year,
        cover_image: topResult.image || topResult.cover_image || topResult.coverUrl,
        cover_thumb: topResult.cover_thumb,
        description: topResult.description,
        characters: topResult.characters,
        ebay_avg_price: topResult.ebay_avg_price,
        trade_fee_total: topResult.trade_fee_total,
        trade_fee_each: topResult.trade_fee_each,
        fee_tier: topResult.fee_tier,
      };

      setComic(identifiedComic);
      
      // Update debug state: success
      setDebugData({
        status: "success",
        method,
        apiHit: "ComicVine",
        confidenceScore: confidence,
        responseTimeMs: responseTime,
        errorMessage: null,
      });

      // Console log summary
      console.info(`[Recognition Debug] ${method} → ComicVine (${confidence}% in ${responseTime}ms)`);
      
      toast({
        title: "Comic identified!",
        description: identifiedComic.full_title,
      });

    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      console.error("Identification error:", err);
      
      setDebugData({
        status: "error",
        method,
        apiHit: "scan-item",
        confidenceScore: null,
        responseTimeMs: responseTime,
        errorMessage: err.message || "Unexpected error",
      });

      console.info(`[Recognition Debug] ${method} → Error (${err.message} in ${responseTime}ms)`);
      
      toast({
        title: "Scan failed",
        description: err.message || "Unexpected error, please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTextSearch = async (override?: string) => {
    const searchTerm = (override ?? query).trim();
    if (!searchTerm) {
      toast({
        title: "Enter a search term",
        description: "Example: 'Uncanny X-Men 268'",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setComic(null);

    try {
      const { data, error } = await supabase.functions.invoke("comic-scanner", {
        body: { query: searchTerm },
      });

      if (error) throw error;
      if (!data?.found || !data?.comic) {
        toast({
          title: "No comic found",
          description: "Try a different search or clearer title.",
          variant: "destructive",
        });
        return;
      }

      setComic(data.comic);
      toast({
        title: "Comic found!",
        description: data.comic.full_title,
      });
    } catch (err: any) {
      console.error("Search error:", err);
      toast({
        title: "Search failed",
        description: err.message || "Unexpected error, please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = () => {
    if (!comic) return;
    navigate("/scanner/result", {
      state: {
        id: comic.comicvine_id,
        name: comic.full_title,
        issue_number: comic.issue_number,
        volume: comic.title,
        cover_date: null,
        image: comic.cover_image,
        description: comic.description,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Global AppLayout header wraps this, so no local header */}

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/20 via-background to-accent/10 border-b-4 border-primary">
        <div className="container mx-auto py-10 px-4">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-4">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                GrailSeeker AI Scanner
              </h1>
              <p className="text-muted-foreground text-base md:text-lg">
                Snap a photo or type a title. We'll identify the comic, pull ComicVine data,
                and estimate value using live market data.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>AI-powered identification</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>ComicVine integrated</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>Built for slabs & raws</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scanner Tabs */}
      <section className="container mx-auto px-4 py-8 flex-1">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid grid-cols-3 max-w-xl mx-auto">
            <TabsTrigger value="camera">Camera</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>

          {/* Camera tab */}
          <TabsContent value="camera" className="mt-6 space-y-4">
            {!cameraActive && !imageData && (
              <Card>
                <CardContent className="flex flex-col items-center gap-4 py-6">
                  <Camera className="h-10 w-10 text-primary" />
                  <p className="text-sm text-muted-foreground text-center">
                    Use your camera to capture the full front cover of the comic.
                  </p>
                  <Button onClick={startCamera} size="lg">
                    Enable Camera
                  </Button>
                </CardContent>
              </Card>
            )}

            {cameraActive && (
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
                      Take Photo
                    </Button>
                    <Button onClick={stopCamera} variant="outline" size="lg">
                      <X className="h-5 w-5" />
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {imageData && !cameraActive && (
              <Card>
                <CardContent className="p-4">
                  <img
                    src={imageData}
                    alt="Captured"
                    className="w-full rounded-lg mb-4"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setImageData(null)}
                      variant="outline"
                      className="flex-1"
                    >
                      Retake Photo
                    </Button>
                    <Button
                      onClick={() => identifyFromImage(imageData, activeTab as "camera" | "upload")}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Rescan
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Upload tab */}
          <TabsContent value="upload" className="mt-6 space-y-4">
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-6">
                <Upload className="h-10 w-10 text-primary" />
                <p className="text-sm text-muted-foreground text-center">
                  Upload a clear photo or scan of the cover. We&apos;ll try to match it.
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
                  Choose Image
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual search tab */}
          <TabsContent value="search" className="mt-6 space-y-4">
            <Card>
              <CardContent className="flex flex-col gap-4 py-6">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., 'Uncanny X-Men 268'"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleTextSearch()
                    }
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleTextSearch()}
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Result */}
        {comic && (
          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-bold">Matched Comic</h2>
            <ComicResultCard
              comic={{
                comicvine_id: comic.comicvine_id,
                title: comic.title,
                issue_number: comic.issue_number,
                full_title: comic.full_title,
                publisher: comic.publisher || "",
                year: comic.year || null,
                cover_image: comic.cover_image || "",
                cover_thumb: comic.cover_thumb || "",
                description: comic.description || "",
                characters: comic.characters || [],
                ebay_avg_price: comic.ebay_avg_price || 0,
                trade_fee_total: comic.trade_fee_total || 0,
                trade_fee_each: comic.trade_fee_each || 0,
                fee_tier: comic.fee_tier || "",
              }}
              onListForSwap={handleViewDetails}
            />
          </section>
        )}
      </section>

      <Footer />
      
      <RecognitionDebugOverlay debugData={debugData} />
    </div>
  );
}