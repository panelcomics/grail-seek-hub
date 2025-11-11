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

interface ComicData {
  comicvine_id: number;
  title: string;
  issue_number: string;
  full_title: string;
  publisher: string;
  year: number | null;
  cover_image: string;
  cover_thumb: string;
  description: string;
  characters: string[];
  ebay_avg_price: number;
  trade_fee_total: number;
  trade_fee_each: number;
  fee_tier: string;
}

interface ComicCandidate {
  id: number;
  name: string;
  issue_number: string;
  volume: string;
  cover_date: string;
  image: string | null;
  confidence?: number;
}

export default function Scanner() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [comic, setComic] = useState<ComicData | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [candidates, setCandidates] = useState<ComicCandidate[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { session } = useAuth();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setShowCamera(true);
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
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg");
        setCapturedImage(imageData);
        stopCamera();
        toast({
          title: "Photo captured!",
          description: "Now processing the image...",
        });
        processImage(imageData);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
        toast({
          title: "Image uploaded!",
          description: "Now processing...",
        });
        processImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateConfidence = (candidate: ComicCandidate, ocrText: string): number => {
    let score = 0;
    const lowerOcr = ocrText.toLowerCase();
    const lowerName = candidate.name.toLowerCase();
    const lowerVolume = candidate.volume.toLowerCase();
    
    // Title match (0-50 points)
    if (lowerOcr.includes(lowerName)) score += 50;
    else if (lowerName.includes(lowerOcr.split(' ')[0])) score += 25;
    
    // Volume/series match (0-30 points)
    if (lowerOcr.includes(lowerVolume)) score += 30;
    else if (lowerVolume.includes(lowerOcr.split(' ')[0])) score += 15;
    
    // Issue number match (0-20 points)
    if (candidate.issue_number && lowerOcr.includes(candidate.issue_number)) {
      score += 20;
    }
    
    return Math.min(score, 100);
  };

  const processImage = async (imageData: string) => {
    setLoading(true);
    setComic(null);
    setCandidates([]);

    try {
      const base64Data = imageData.includes(',') 
        ? imageData.split(',')[1] 
        : imageData;

      const { data, error } = await supabase.functions.invoke("scan-item", {
        body: { imageBase64: base64Data },
      });

      if (error) throw error;

      if (data?.ok === false) {
        toast({
          title: "Scan failed",
          description: data.error || "Unable to process image. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data?.comicvineResults && data.comicvineResults.length > 0) {
        const ocrText = data.ocrPreview || "";
        
        // Calculate confidence for each candidate
        const scoredCandidates = data.comicvineResults.map((result: any) => ({
          ...result,
          confidence: calculateConfidence(result, ocrText)
        }));
        
        // Sort by confidence descending
        scoredCandidates.sort((a: ComicCandidate, b: ComicCandidate) => 
          (b.confidence || 0) - (a.confidence || 0)
        );
        
        setCandidates(scoredCandidates);
        
        const topResult = scoredCandidates[0];
        const minConfidence = 65;
        
        if (topResult.confidence && topResult.confidence >= minConfidence) {
          // Build clean query from structured data only (no raw OCR)
          const cleanQuery = `${topResult.volume} ${topResult.issue_number}`.trim();
          setQuery(cleanQuery);
          
          toast({
            title: "Comic identified!",
            description: `${topResult.name} #${topResult.issue_number} (${topResult.confidence}% confidence)`,
          });
          // Fetch full details with pricing
          await handleTextSearch(cleanQuery);
        } else {
          // Show best match without auto-searching
          const cleanQuery = `${topResult.volume} ${topResult.issue_number}`.trim();
          setQuery(cleanQuery);
          
          toast({
            title: "Low confidence match",
            description: `Best match: ${topResult.name} #${topResult.issue_number} (${topResult.confidence}% confidence). Refine or search manually.`,
            variant: "destructive",
          });
          setShowDebug(true);
        }
      } else {
        toast({
          title: "No text detected",
          description: "Try entering the title manually",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Image processing error:", error);
      toast({
        title: "Scan failed",
        description: error.message || "Try entering the title manually or take another photo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTextSearch = async (searchQuery?: string) => {
    const searchTerm = searchQuery || query.trim();
    
    if (!searchTerm) {
      toast({
        title: "Enter a search term",
        description: "Try 'Amazing Fantasy 15' or 'X-Men 1'",
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

      if (!data.found) {
        toast({
          title: "No comic found",
          description: "Try a different search term or check the spelling",
          variant: "destructive",
        });
        return;
      }

      setComic(data.comic);
      toast({
        title: "Comic found!",
        description: data.comic.full_title,
      });
    } catch (error: any) {
      console.error("Comic scanner error:", error);
      toast({
        title: "Scan failed",
        description: error.message || "Unable to scan comic",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = () => {
    if (!comic) return;

    // Navigate to result detail page with comic data
    navigate("/scanner/result", {
      state: {
        id: comic.comicvine_id,
        name: comic.full_title,
        issue_number: comic.issue_number,
        volume: comic.title,
        cover_date: null,
        image: comic.cover_image,
        description: comic.description,
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/20 via-background to-accent/10 border-b-4 border-primary">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary text-primary-foreground mb-4">
              <Zap className="h-10 w-10" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Scan Your <span className="text-primary">Comic</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Take a photo, upload an image, or enter a title manually. We'll fetch Comic Vine data, calculate eBay pricing, and show your exact swap fees.
            </p>

            <Tabs defaultValue="camera" className="max-w-2xl mx-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="camera">
                  <Camera className="mr-2 h-4 w-4" />
                  Camera
                </TabsTrigger>
                <TabsTrigger value="search">
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </TabsTrigger>
              </TabsList>

              <TabsContent value="camera" className="space-y-4 mt-4">
                {showCamera ? (
                  <Card>
                    <CardContent className="p-4">
                      <div className="relative">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full rounded-lg"
                        />
                        <div className="flex gap-2 mt-4">
                          <Button onClick={capturePhoto} className="flex-1" size="lg">
                            <Camera className="mr-2 h-5 w-5" />
                            Take Photo
                          </Button>
                          <Button onClick={stopCamera} variant="outline" size="lg">
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : capturedImage ? (
                  <Card>
                    <CardContent className="p-4">
                      <img src={capturedImage} alt="Captured" className="w-full rounded-lg mb-4" />
                      <div className="flex gap-2">
                        <Button onClick={() => setCapturedImage(null)} variant="outline" className="flex-1">
                          Retake Photo
                        </Button>
                        <Button onClick={() => processImage(capturedImage)} disabled={loading} className="flex-1">
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            "Process Image"
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Button onClick={startCamera} size="lg" className="h-14">
                      <Camera className="mr-2 h-5 w-5" />
                      Open Camera
                    </Button>
                    <Button 
                      onClick={() => fileInputRef.current?.click()} 
                      variant="outline" 
                      size="lg" 
                      className="h-14"
                    >
                      <Upload className="mr-2 h-5 w-5" />
                      Upload Photo
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </TabsContent>

              <TabsContent value="search" className="space-y-4 mt-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="e.g., 'Amazing Fantasy 15' or 'X-Men 1'"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleTextSearch()}
                    className="flex-1 h-14 text-lg border-2 border-primary/30 focus:border-primary"
                  />
                  <Button 
                    onClick={() => handleTextSearch()} 
                    disabled={loading} 
                    size="lg" 
                    className="h-14 px-8 font-bold"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-5 w-5" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap gap-2 justify-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setQuery("Amazing Spider-Man 300")}
              >
                Amazing Spider-Man #300
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setQuery("Batman 1")}
              >
                Batman #1
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setQuery("Incredible Hulk 181")}
              >
                Hulk #181
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Debug Panel */}
      {candidates.length > 0 && (
        <section className="container mx-auto px-4 py-6">
          <Card className="border-2 border-orange-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-orange-600">🔍 Scanner Debug</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  {showDebug ? "Hide" : "Show"} Candidates
                </Button>
              </div>
              
              {showDebug && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {candidates.map((candidate, idx) => (
                    <div 
                      key={candidate.id}
                      className={`p-3 rounded border ${
                        idx === 0 ? 'border-primary bg-primary/5' : 'border-muted'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {candidate.image && (
                          <img 
                            src={candidate.image} 
                            alt={candidate.name}
                            className="w-16 h-24 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                              #{idx + 1}
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              (candidate.confidence || 0) >= 65 
                                ? 'bg-green-500/20 text-green-700' 
                                : 'bg-red-500/20 text-red-700'
                            }`}>
                              {candidate.confidence || 0}% confidence
                            </span>
                          </div>
                          <p className="font-semibold text-sm truncate">{candidate.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {candidate.volume} #{candidate.issue_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ID: {candidate.id}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => handleTextSearch(`${candidate.volume} ${candidate.issue_number}`)}
                          >
                            Use This Result
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Result Section */}
      {comic && (
        <section className="container mx-auto px-4 py-12">
          <ComicResultCard comic={comic} onListForSwap={handleViewDetails} />
        </section>
      )}

      {/* Empty State */}
      {!loading && !comic && (
        <section className="container mx-auto px-4 py-20">
          <Card className="max-w-md mx-auto border-2 border-dashed border-muted">
            <CardContent className="pt-12 pb-12 text-center space-y-4">
              <Camera className="h-16 w-16 mx-auto text-muted-foreground/50" />
              <h3 className="text-xl font-bold">Ready to Scan</h3>
              <p className="text-muted-foreground">
                Enter a comic title or issue to get started. We'll fetch all the data and pricing instantly.
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      <Footer />
    </div>
  );
}
