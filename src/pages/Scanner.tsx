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

  // Calculate confidence based on structured extracted data
  const calculateConfidence = (
    candidate: ComicCandidate, 
    extracted: { series_title?: string; issue_number?: string; year?: number | null }
  ): number => {
    let score = 0;
    
    const lowerVolume = candidate.volume.toLowerCase();
    const lowerName = candidate.name.toLowerCase();
    const extractedTitle = (extracted.series_title || "").toLowerCase().trim();
    const extractedIssue = (extracted.issue_number || "").trim();
    const extractedYear = extracted.year;
    
    // Title similarity (0-50 points) - compare against volume name primarily
    if (extractedTitle) {
      const titleWords = extractedTitle.split(/\s+/).filter(w => w.length > 2);
      const volumeWords = lowerVolume.split(/\s+/).filter(w => w.length > 2);
      
      // Check how many key words match
      const matchingWords = titleWords.filter(word => 
        volumeWords.some(vw => vw.includes(word) || word.includes(vw))
      ).length;
      
      if (matchingWords > 0) {
        score += Math.min(50, matchingWords * 15);
      }
    }
    
    // Issue number match (0-30 points) - exact match is critical
    if (extractedIssue && candidate.issue_number) {
      if (extractedIssue === candidate.issue_number) {
        score += 30;
      } else if (extractedIssue.replace(/^0+/, '') === candidate.issue_number.replace(/^0+/, '')) {
        score += 25; // Handle leading zeros
      }
    }
    
    // Year proximity (0-20 points)
    if (extractedYear && candidate.cover_date) {
      const coverYear = parseInt(candidate.cover_date.substring(0, 4));
      if (!isNaN(coverYear)) {
        const yearDiff = Math.abs(extractedYear - coverYear);
        if (yearDiff === 0) score += 20;
        else if (yearDiff === 1) score += 15;
        else if (yearDiff <= 3) score += 10;
        else if (yearDiff <= 5) score += 5;
      }
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
        const extracted = data.extracted || {};
        
        // Calculate confidence for each candidate using structured extracted data
        const scoredCandidates = data.comicvineResults.map((result: any) => ({
          ...result,
          confidence: calculateConfidence(result, extracted)
        }));
        
        // Sort by confidence descending
        scoredCandidates.sort((a: ComicCandidate, b: ComicCandidate) => 
          (b.confidence || 0) - (a.confidence || 0)
        );
        
        // Take top 5 for display
        setCandidates(scoredCandidates.slice(0, 5));
        
        const topResult = scoredCandidates[0];
        const minConfidence = 65;
        
        if (topResult.confidence && topResult.confidence >= minConfidence) {
          // Good match - build clean query
          const cleanQuery = `${topResult.volume} ${topResult.issue_number}`.trim();
          setQuery(cleanQuery);
          
          toast({
            title: "Match found",
            description: `${topResult.volume} #${topResult.issue_number}`,
          });
          // Fetch full details with pricing
          await handleTextSearch(cleanQuery);
        } else {
          // Uncertain - show candidates list, don't auto-search
          toast({
            title: "Pick the right book",
            description: "We're not sure. Select from the list below or try another photo.",
          });
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

      {/* Match Results or Candidate Selection */}
      {candidates.length > 0 && !comic && (
        <section className="container mx-auto px-4 py-6">
          {candidates[0].confidence && candidates[0].confidence >= 65 ? (
            // Good match - show green banner with single candidate
            <Card className="border-2 border-green-500/50 bg-green-50 dark:bg-green-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {candidates[0].image && (
                    <img 
                      src={candidates[0].image} 
                      alt={candidates[0].name}
                      className="w-24 h-36 object-cover rounded border-2 border-green-500"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                        ✓ Match found
                      </span>
                      <span className="text-xs bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                        {candidates[0].confidence}% confidence
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-1">
                      {candidates[0].volume} #{candidates[0].issue_number}
                    </h3>
                    {candidates[0].cover_date && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {new Date(candidates[0].cover_date).getFullYear()}
                      </p>
                    )}
                    <Button 
                      onClick={() => {
                        const cleanQuery = `${candidates[0].volume} ${candidates[0].issue_number}`.trim();
                        setQuery(cleanQuery);
                        handleTextSearch(cleanQuery);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Use This Result
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Uncertain - show neutral message with candidate list
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">
                    We're not sure. Pick the right book below or try another photo.
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Top {candidates.length} potential matches based on your scan:
                  </p>
                </div>
                
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {candidates.map((candidate, idx) => (
                    <div 
                      key={candidate.id}
                      className="p-3 rounded border hover:border-primary transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {candidate.image && (
                          <img 
                            src={candidate.image} 
                            alt={candidate.name}
                            className="w-16 h-24 object-cover rounded flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold">
                              {candidate.volume} #{candidate.issue_number}
                            </span>
                            {candidate.cover_date && (
                              <span className="text-xs text-muted-foreground">
                                ({new Date(candidate.cover_date).getFullYear()})
                              </span>
                            )}
                          </div>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const cleanQuery = `${candidate.volume} ${candidate.issue_number}`.trim();
                              setQuery(cleanQuery);
                              handleTextSearch(cleanQuery);
                            }}
                          >
                            Use This Result
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Debug Panel - collapsed by default */}
          <Card className="mt-4 border-orange-500/30">
            <CardContent className="pt-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowDebug(!showDebug)}
                className="w-full justify-between"
              >
                <span className="text-sm text-orange-600">🔍 Scanner Debug</span>
                <span className="text-xs text-muted-foreground">
                  {showDebug ? "Hide" : "Show"}
                </span>
              </Button>
              
              {showDebug && (
                <div className="mt-4 space-y-2 text-xs font-mono">
                  {candidates.map((candidate, idx) => (
                    <div 
                      key={candidate.id}
                      className="p-2 rounded bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-orange-600">#{idx + 1}</span>
                        <span className={`font-bold ${
                          (candidate.confidence || 0) >= 65
                                ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              {candidate.confidence}%
                            </span>
                        <span className="text-muted-foreground">|</span>
                        <span className="truncate flex-1">
                          {candidate.volume} #{candidate.issue_number}
                        </span>
                      </div>
                      <p className="text-muted-foreground pl-6">
                        ID: {candidate.id} | {candidate.cover_date || "no date"}
                      </p>
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
