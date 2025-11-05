import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Upload, Loader2, CheckCircle2, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useModal } from "@/contexts/ModalContext";
import Navbar from "@/components/Navbar";

export default function Scanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openModal } = useModal();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [showAltCandidates, setShowAltCandidates] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    checkAndShowTour();
  }, [user]);

  const checkAndShowTour = async () => {
    // Check if user wants to skip the tour
    const hideLocalStorage = localStorage.getItem("hideAiScannerTour");
    
    if (user) {
      // For signed-in users, check profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("hide_ai_scanner_tour")
        .eq("user_id", user.id)
        .single();

      if (!profile?.hide_ai_scanner_tour) {
        showTour();
      }
    } else {
      // For guests, check localStorage
      if (hideLocalStorage !== "true") {
        showTour();
      }
    }
  };

  const showTour = () => {
    openModal("aiScannerTour", {
      onComplete: async (dontShowAgain: boolean) => {
        if (dontShowAgain) {
          // Save preference
          if (user) {
            // Save to profile
            await supabase
              .from("profiles")
              .update({ hide_ai_scanner_tour: true })
              .eq("user_id", user.id);
          } else {
            // Save to localStorage
            localStorage.setItem("hideAiScannerTour", "true");
          }
        }
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleFileSelect = async (files: FileList) => {
    const fileArray = Array.from(files);
    
    if (fileArray.length === 0) return;
    
    if (fileArray.some(f => !f.type.startsWith('image/'))) {
      toast.error('Please select only image files (JPG, PNG, WEBP)');
      return;
    }

    // Single mode only (as per requirements)
    const file = fileArray[0];
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    await scanImage(file);
  };

  const scanImage = async (file: File) => {
    setScanning(true);
    setScanResult(null);
    setShowAltCandidates(false);

    try {
      // Convert image to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const imageBase64 = await base64Promise;

      // Call edge function to scan
      const { data, error } = await supabase.functions.invoke('scan-item', {
        body: { imageBase64 }
      });

      if (error) {
        if (error.message.includes("Couldn't read the cover text")) {
          toast.error("Couldn't read the cover text. Try a clearer photo or different angle.");
        } else if (error.message.includes("No matching comics found")) {
          toast.error("No matching comics found. Try adjusting the image or search manually.");
        } else {
          throw error;
        }
        return;
      }

      setScanResult(data);
      toast.success('Comic identified successfully!');

    } catch (error: any) {
      console.error('Scan error:', error);
      toast.error(error.message || 'Failed to scan comic');
    } finally {
      setScanning(false);
    }
  };

  const handleChooseCandidate = async (comicvineId: string) => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('choose-candidate', {
        body: { comicvineId }
      });

      if (error) throw error;

      setScanResult(data);
      setShowAltCandidates(false);
      toast.success('Comic updated!');
    } catch (error: any) {
      console.error('Choose candidate error:', error);
      toast.error(error.message || 'Failed to fetch comic details');
    } finally {
      setScanning(false);
    }
  };

  const handleSaveToPortfolio = async () => {
    if (!scanResult) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to save items');
        navigate('/auth');
        return;
      }

      // Save to collections table
      const { error } = await supabase
        .from('collections')
        .insert({
          user_id: user.id,
          title: `${scanResult.comicvine.series} #${scanResult.comicvine.issue}`,
          category: 'comic',
          grade: 'Ungraded',
          condition: scanResult.vision.titleGuess,
          purchase_price: 0,
          purchase_date: new Date().toISOString().split('T')[0],
          current_value: 0,
          image_url: scanResult.comicvine.coverUrl
        });

      if (error) throw error;

      toast.success('Comic added to your portfolio!');
      navigate('/portfolio');

    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save comic');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">AI Comic Scanner</h1>
            <p className="text-muted-foreground">
              Scan your comics for instant identification and information
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Upload Image</CardTitle>
              <CardDescription>
                Drag and drop, upload, or capture a photo of your comic book cover
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/png"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              />

              {!previewUrl ? (
                <div className="space-y-4">
                  {/* Drag and Drop Area */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                  >
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">Drag and drop your image here</p>
                    <p className="text-sm text-muted-foreground mb-4">Supports JPG, PNG, WEBP</p>
                    <p className="text-xs text-muted-foreground">or use the buttons below</p>
                  </div>

                  {/* Upload and Camera Buttons */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      size="lg"
                      className="h-16"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-5 w-5" />
                      Choose File
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-16"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera className="mr-2 h-5 w-5" />
                      Use Camera
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Preview */}
                  <div className="relative">
                    <div className="aspect-[2/3] max-w-sm mx-auto rounded-lg overflow-hidden border">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-contain bg-muted"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setPreviewUrl("");
                        setFileName("");
                        setScanResult(null);
                        setShowAltCandidates(false);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                        if (cameraInputRef.current) cameraInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {fileName && (
                    <p className="text-sm text-muted-foreground text-center">{fileName}</p>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setPreviewUrl("");
                      setFileName("");
                      setScanResult(null);
                      setShowAltCandidates(false);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      if (cameraInputRef.current) cameraInputRef.current.value = "";
                    }}
                  >
                    Try Another Image
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {scanning && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Scanning with AI...</p>
                <p className="text-sm text-muted-foreground">
                  Identifying your comic with Google Vision & ComicVine
                </p>
              </CardContent>
            </Card>
          )}

          {scanResult && !scanning && (
            <Card className="border-primary/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Comic Identified
                    </CardTitle>
                    <h3 className="text-2xl font-bold">{scanResult.comicvine.series}</h3>
                    <p className="text-muted-foreground">Issue #{scanResult.comicvine.issue}</p>
                  </div>
                  {scanResult.comicvine.coverUrl && (
                    <img 
                      src={scanResult.comicvine.coverUrl} 
                      alt="Cover" 
                      className="w-24 h-32 object-cover rounded border"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Comic Details */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Year</p>
                    <p className="font-semibold">{scanResult.comicvine.year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Publisher</p>
                    <p className="font-semibold">{scanResult.comicvine.publisher}</p>
                  </div>
                  {scanResult.comicvine.creators && scanResult.comicvine.creators.length > 0 && (
                    <div className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground">Creators</p>
                      <p className="font-semibold">{scanResult.comicvine.creators.join(', ')}</p>
                    </div>
                  )}
                </div>

                {/* Market Value Box */}
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Market Value</p>
                      <p className="font-medium">{scanResult.pricing.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Status: {scanResult.pricing.status}
                      </p>
                    </div>
                    {scanResult.pricing.estimate !== null && (
                      <p className="text-2xl font-bold text-green-500">
                        ${scanResult.pricing.estimate.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Alternative Candidates */}
                {scanResult.comicvine.altCandidates && scanResult.comicvine.altCandidates.length > 0 && (
                  <div>
                    {!showAltCandidates ? (
                      <Button
                        variant="link"
                        className="text-sm p-0 h-auto"
                        onClick={() => setShowAltCandidates(true)}
                      >
                        Not right? See other matches ({scanResult.comicvine.altCandidates.length})
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">Other Matches:</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAltCandidates(false)}
                          >
                            Hide
                          </Button>
                        </div>
                        {scanResult.comicvine.altCandidates.map((candidate: any) => (
                          <div
                            key={candidate.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                          >
                            <p className="text-sm">{candidate.label}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleChooseCandidate(candidate.id)}
                            >
                              Use this
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleSaveToPortfolio}
                >
                  Add to Portfolio
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
