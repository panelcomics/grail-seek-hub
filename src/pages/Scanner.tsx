import { useState, useRef } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
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

export default function Scanner() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [comic, setComic] = useState<ComicData | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
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

  const processImage = async (imageData: string) => {
    setLoading(true);
    setComic(null);

    try {
      // Strip the data URL prefix to get just the base64 string
      const base64Data = imageData.includes(',') 
        ? imageData.split(',')[1] 
        : imageData;

      const { data, error } = await supabase.functions.invoke("scan-item", {
        body: { imageBase64: base64Data },
      });

      if (error) throw error;

      // Check if the response indicates failure
      if (data?.ok === false) {
        toast({
          title: "Scan failed",
          description: data.error || "Unable to process image. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data?.ocrPreview) {
        // OCR text was found, now search for the comic
        const searchText = data.ocrPreview.replace('...', '');
        setQuery(searchText);
        toast({
          title: "Text detected",
          description: `Found: ${searchText}. Searching...`,
        });
        await handleTextSearch(searchText);
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
      <AppHeader />
      
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
