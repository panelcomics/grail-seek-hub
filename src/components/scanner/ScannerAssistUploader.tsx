/**
 * SCANNER ASSIST UPLOADER
 * ==========================================================================
 * Image upload component for Scanner Assist.
 * Handles camera capture and file upload.
 * ==========================================================================
 */

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Camera, Upload, Image as ImageIcon, Loader2, Lightbulb, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScannerAssistUploaderProps {
  onImageSelected: (imageData: string) => void;
  isProcessing: boolean;
  previewImage: string | null;
}

export function ScannerAssistUploader({
  onImageSelected,
  isProcessing,
  previewImage,
}: ScannerAssistUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      onImageSelected(imageData);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const imageData = ev.target?.result as string;
          onImageSelected(imageData);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  if (isProcessing) {
    return (
      <Card className="w-full">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              {previewImage && (
                <div className="w-32 h-44 rounded-lg overflow-hidden border-2 border-primary/30 shadow-lg">
                  <img
                    src={previewImage}
                    alt="Scanning..."
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-medium">Analyzing cover...</p>
              <p className="text-sm text-muted-foreground">
                Finding ComicVine matches
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Upload Comic Cover
        </CardTitle>
        <CardDescription>
          Take a photo or upload an image of your comic cover to find matches.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Drop image here or click to upload</p>
              <p className="text-sm text-muted-foreground">
                JPG, PNG up to 10MB
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="w-4 h-4 mr-2" />
            Take Photo
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Choose File
          </Button>
        </div>

        {/* Hidden Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Scan Tips */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center group">
            <Lightbulb className="w-4 h-4" />
            <span>Tips for better scans</span>
            <ChevronDown className="w-4 h-4 group-data-[state=open]:rotate-180 transition-transform" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <ul className="text-sm text-muted-foreground space-y-1.5 pl-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Lay the comic flat on a solid surface</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Avoid glare from bags or slabs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Make sure the full cover is visible</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Use good lighting (natural light works best)</span>
              </li>
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
