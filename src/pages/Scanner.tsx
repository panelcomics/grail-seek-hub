import { useState, useRef } from "react";
import { Camera, Upload, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
}

export default function Scanner() {
  const navigate = useNavigate();
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Strip the "data:image/...;base64," prefix
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(file?: File) {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const imageBase64 = await fileToBase64(file);
      
      const { data, error: invokeError } = await supabase.functions.invoke('scan-item', {
        body: { imageBase64 }
      });

      if (invokeError) throw invokeError;
      
      setResult(data as ScanResponse);
      
      if (data && !data.ok) {
        setError(data.error || "Scan failed");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Try a straight-on, well-lit cover photo.");
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
                    </div>
                  )}

                  {result.comicvineResults && result.comicvineResults.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="font-semibold">ComicVine Results ({result.comicvineResults.length}):</h3>
                      <div className="grid gap-3">
                        {result.comicvineResults.map((comic, idx) => (
                          <button
                            key={idx}
                            onClick={() => navigate("/scanner/result", { state: comic })}
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
    </div>
  );
}
