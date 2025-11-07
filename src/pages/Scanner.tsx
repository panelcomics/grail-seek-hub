import { useState, useRef } from "react";
import { Camera, Upload, Loader2, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { compressImageForScanning, getScanningTips } from "@/lib/imageCompression";
import { SaveToInventoryModal } from "@/components/SaveToInventoryModal";

interface ComicResult {
  id: number | null;
  name: string;
  issue_number: string;
  volume: string;
  cover_date: string;
  image: string | null;
}

interface ScanResponse {
  ok: boolean;
  ocrPreview?: string;
  comicvineResults?: ComicResult[];
  error?: string;
  cached?: boolean;
}

export default function Scanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file?: File) {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Compress image on client side
      const compressed = await compressImageForScanning(file);
      
      if ('error' in compressed) {
        setError(compressed.error);
        setLoading(false);
        return;
      }

      console.log(`Image compressed: ${compressed.sizeKB}KB (${compressed.width}x${compressed.height})`);
      setUploadedImageBase64(compressed.base64);
      
      // Get auth token if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      // Don't manually set Content-Type - supabase client handles it
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const { data, error: invokeError } = await supabase.functions.invoke('scan-item', {
        body: { imageBase64: compressed.base64 },
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      });

      if (invokeError) throw invokeError;
      
      const scanResult = data as ScanResponse;
      setResult(scanResult);
      
      if (scanResult && !scanResult.ok) {
        setError(scanResult.error || "Scan failed");
      } else if (scanResult.cached) {
        toast.success("Scan loaded from cache (no API cost)");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Try a straight-on, well-lit cover photo.");
    } finally {
      setLoading(false);
    }
  }

  async function saveOcrToCollection() {
    if (!user) {
      toast.error("Please sign in to add to your collection");
      navigate("/auth");
      return;
    }

    if (!result?.ocrPreview || !uploadedImageBase64) {
      toast.error("No OCR data to save");
      return;
    }

    setLoading(true);

    try {
      // Upload photo to storage
      const response = await fetch(`data:image/jpeg;base64,${uploadedImageBase64}`);
      const blob = await response.blob();
      
      const fileName = `${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("comic-photos")
        .upload(filePath, blob, {
          contentType: "image/jpeg",
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("comic-photos")
        .getPublicUrl(filePath);

      const firstLine = result.ocrPreview.split('\n')[0].trim();
      const title = firstLine || "Custom Scan";

      const { error } = await supabase.from("user_comics").insert({
        user_id: user.id,
        comicvine_id: null,
        title,
        issue_number: "Custom",
        volume_name: "Manual Entry",
        cover_date: new Date().toISOString().split('T')[0],
        image_url: publicUrl,
        ocr_text: result.ocrPreview,
        source: "ocr_custom"
      });

      if (error) throw error;

      toast.success("Added to collection!");
      navigate("/my-collection");
    } catch (error) {
      console.error("Error saving OCR to collection:", error);
      toast.error("Failed to add to collection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">AI Comic Scanner</h1>
            <p className="text-muted-foreground">
              Upload or take a photo of a comic cover. We'll identify it using OCR and ComicVine.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Scan Comic Cover</CardTitle>
              <CardDescription>
                For best results, use a clear, straight-on photo with good lighting
              </CardDescription>
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Tips:</strong> {getScanningTips().join(" • ")}
                </AlertDescription>
              </Alert>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="gap-2"
                  size="lg"
                >
                  <Upload className="h-5 w-5" />
                  Choose from Photos
                </Button>
                
                <Button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={loading}
                  variant="outline"
                  className="gap-2"
                  size="lg"
                >
                  <Camera className="h-5 w-5" />
                  Use Camera
                </Button>
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Scanning cover and searching database...</span>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {result && result.ok && (
                <div className="space-y-4">
                  {result.ocrPreview && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">OCR Text Detected:</h3>
                      <div className="bg-muted p-3 rounded-md text-sm font-mono">
                        {result.ocrPreview}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => setSaveModalOpen(true)}
                          className="flex-1"
                        >
                          Save to My Inventory
                        </Button>
                        <Button 
                          onClick={saveOcrToCollection}
                          variant="outline"
                          className="flex-1"
                        >
                          Add OCR to Collection
                        </Button>
                      </div>
                    </div>
                  )}

                  {result.comicvineResults && result.comicvineResults.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="font-semibold">ComicVine Results ({result.comicvineResults.length}):</h3>
                      <div className="grid gap-3">
                        {result.comicvineResults.map((comic, idx) => (
                          <button
                            key={idx}
                            onClick={() => navigate("/scanner/result", { 
                              state: { 
                                ...comic, 
                                userPhotoBase64: uploadedImageBase64,
                                ocrText: result.ocrPreview 
                              } 
                            })}
                            className="w-full text-left transition-transform hover:scale-[1.02]"
                          >
                            <Card className="cursor-pointer hover:border-primary">
                              <CardContent className="flex gap-4 p-4">
                                {comic.image && (
                                  <img
                                    src={comic.image}
                                    alt={comic.name}
                                    className="w-16 h-24 object-cover rounded"
                                  />
                                )}
                                <div className="flex-1 space-y-1">
                                  <div className="font-semibold">
                                    {comic.name}
                                    {comic.issue_number && (
                                      <Badge variant="secondary" className="ml-2">
                                        #{comic.issue_number}
                                      </Badge>
                                    )}
                                  </div>
                                  {comic.volume && (
                                    <div className="text-sm text-muted-foreground">
                                      {comic.volume}
                                    </div>
                                  )}
                                  {comic.cover_date && (
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(comic.cover_date).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        No matches found in ComicVine. Try a different image or angle.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />

      <SaveToInventoryModal
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        ocrText={result?.ocrPreview || ""}
        comicvineResults={result?.comicvineResults || []}
      />
    </div>
  );
}
