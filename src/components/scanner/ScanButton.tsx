import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Loader2, X, Upload, ScanLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ScanButtonProps {
  onScanResult?: (searchText: string) => void;
  className?: string;
}

export function ScanButton({ onScanResult, className }: ScanButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

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

      if (data?.ocrPreview) {
        const searchText = data.ocrPreview.replace('...', '');
        toast({
          title: "Text detected",
          description: `Found: ${searchText}. Searching...`,
        });
        
        setShowModal(false);
        
        if (onScanResult) {
          onScanResult(searchText);
        } else {
          // Fallback: search via comic-scanner
          await searchComic(searchText);
        }
      } else {
        toast({
          title: "Couldn't detect anything",
          description: "Try again or type manually",
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

  const searchComic = async (searchText: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("comic-scanner", {
        body: { query: searchText },
      });

      if (error) throw error;

      if (!data.found) {
        toast({
          title: "No comic found",
          description: "Try a different search term",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Comic found!",
        description: data.comic.full_title,
      });
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: error.message || "Unable to search",
        variant: "destructive",
      });
    }
  };

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleStartCamera = async () => {
    setShowModal(false);
    await startCamera();
  };

  const handleUploadClick = () => {
    setShowModal(false);
    fileInputRef.current?.click();
  };

  return (
    <>
      <Button
        onClick={handleOpenModal}
        disabled={loading}
        className={`h-12 w-12 shrink-0 bg-orange-500 hover:bg-orange-600 text-white transition-all duration-200 hover:scale-105 active:scale-95 ${className || ""}`}
        aria-label="Scan book"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Camera className="h-5 w-5" />
        )}
      </Button>

      {/* Scan Options Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] p-4 animate-in zoom-in-95 duration-200">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold">Scan a Book</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowModal(false)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-6">
                <Button
                  onClick={handleStartCamera}
                  className="w-full h-16 text-base bg-orange-500 hover:bg-orange-600 transition-all duration-200"
                  size="lg"
                >
                  <ScanLine className="mr-3 h-6 w-6" />
                  Scan Barcode
                </Button>
                <Button
                  onClick={handleUploadClick}
                  variant="outline"
                  className="w-full h-16 text-base transition-all duration-200"
                  size="lg"
                >
                  <Upload className="mr-3 h-6 w-6" />
                  Upload Photo
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] p-4 animate-in zoom-in-95 duration-200">
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
                    <Button onClick={capturePhoto} className="flex-1 bg-orange-500 hover:bg-orange-600" size="lg">
                      <Camera className="mr-2 h-5 w-5" />
                      Take Photo
                    </Button>
                    <Button onClick={stopCamera} variant="outline" size="icon">
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </>
  );
}
