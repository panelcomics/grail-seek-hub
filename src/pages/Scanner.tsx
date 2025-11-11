import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, Camera, Zap, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

type ScannerStatus = "idle" | "recognizing" | "prefilled" | "manual";

export default function Scanner() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null); // User's captured/uploaded image
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [confidence, setConfidence] = useState<number | null>(null);
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
        setImageUrl(capturedImageData);
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
      setImageUrl(uploadedImageData);
      toast({
        title: "Image uploaded!",
        description: "Processing your comic now...",
      });
      identifyFromImage(uploadedImageData, "upload");
    };
    reader.readAsDataURL(file);
  };

  // Recognition pipeline
  const identifyFromImage = async (imageData: string, method: "camera" | "upload") => {
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
      errorMessage: null,
    });

    try {
      const base64Data = imageData.includes(",") ? imageData.split(",")[1] : imageData;

      const { data, error } = await supabase.functions.invoke("scan-item", {
        body: { imageBase64: base64Data },
      });

      const responseTime = Date.now() - startTime;

      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || "Unable to process image");

      const results = data?.comicvineResults || [];
      
      if (results.length === 0) {
        // No match - show manual form
        setDebugData({
          status: "error",
          method,
          apiHit: "ComicVine",
          confidenceScore: 0,
          responseTimeMs: responseTime,
          errorMessage: "No match found",
        });
        setStatus("manual");
        setPrefillData({});
        setConfidence(0);
        toast({
          title: "No confident match",
          description: "You can still list this comic manually with your photo.",
        });
        return;
      }

      const topResult = results[0];
      const calculatedConfidence = Math.min(95, 70 + (5 - Math.min(results.length, 5)) * 5);
      
      const title = topResult.volume || topResult.volumeName || "";
      const issueNumber = topResult.issue_number || "";
      
      // Build prefill data
      const prefill: PrefillData = {
        title: title,
        series: title,
        issueNumber: issueNumber,
        publisher: topResult.publisher || "",
        year: topResult.year || "",
        comicvineId: topResult.id || "",
        comicvineCoverUrl: topResult.image || topResult.cover_image || topResult.coverUrl || "",
        description: topResult.description || "",
      };

      setPrefillData(prefill);
      setConfidence(calculatedConfidence);
      
      // Check confidence threshold (65% as specified)
      if (calculatedConfidence >= 65 && title && issueNumber) {
        setStatus("prefilled");
        setDebugData({
          status: "success",
          method,
          apiHit: "ComicVine",
          confidenceScore: calculatedConfidence,
          responseTimeMs: responseTime,
          errorMessage: null,
        });
        toast({
          title: "Match found!",
          description: `${title} #${issueNumber} (${calculatedConfidence}% confidence)`,
        });
      } else {
        setStatus("manual");
        setDebugData({
          status: "error",
          method,
          apiHit: "ComicVine",
          confidenceScore: calculatedConfidence,
          responseTimeMs: responseTime,
          errorMessage: `Low confidence (${calculatedConfidence}%)`,
        });
        toast({
          title: "Low confidence match",
          description: "Review the suggested details or edit as needed.",
        });
      }

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

      setStatus("manual");
      setPrefillData({});
      setConfidence(0);
      
      toast({
        title: "Recognition error",
        description: "You can still list this comic manually with your photo.",
        variant: "destructive",
      });
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
    setPrefillData(null);

    try {
      const { data, error } = await supabase.functions.invoke("comic-scanner", {
        body: { query: searchTerm },
      });

      if (error) throw error;
      if (!data?.found || !data?.comic) {
        toast({
          title: "No comic found",
          description: "Try a different search term.",
          variant: "destructive",
        });
        return;
      }

      const comic = data.comic;
      setPrefillData({
        title: comic.title || "",
        series: comic.title || "",
        issueNumber: comic.issue_number || "",
        publisher: comic.publisher || "",
        year: comic.year || "",
        comicvineId: comic.comicvine_id || "",
        comicvineCoverUrl: comic.cover_image || "",
        description: comic.description || "",
      });
      setConfidence(85); // Text search has good confidence
      setStatus("prefilled");
      
      toast({
        title: "Comic found!",
        description: comic.full_title || comic.title,
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

  const handleReset = () => {
    setImageUrl(null);
    setPrefillData(null);
    setStatus("idle");
    setConfidence(null);
    setQuery("");
  };

  // Show listing form when we have an image and status is prefilled or manual
  const showListingForm = imageUrl && (status === "prefilled" || status === "manual");

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
                Snap a photo or upload an image. We'll try to identify your comic and prefill details.
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
              imageUrl={imageUrl}
              initialData={prefillData || {}}
              confidence={confidence}
            />
          </div>
        ) : (
          // Show scanner interface
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid grid-cols-3 max-w-xl mx-auto">
              <TabsTrigger value="camera">Camera</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
            </TabsList>

            {/* Camera tab */}
            <TabsContent value="camera" className="mt-6 space-y-4">
              {!cameraActive && (
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
                      <Button onClick={capturePhoto} className="flex-1" size="lg" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Camera className="mr-2 h-5 w-5" />
                            Capture Photo
                          </>
                        )}
                      </Button>
                      <Button onClick={stopCamera} variant="outline" size="lg">
                        <X className="h-5 w-5" />
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
                    Upload a clear photo of the comic cover.
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
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Choose Image"
                    )}
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
        )}
      </section>

      <Footer />
      
      {/* Debug overlay - only in development */}
      {import.meta.env.DEV && <RecognitionDebugOverlay debugData={debugData} />}
    </div>
  );
}
