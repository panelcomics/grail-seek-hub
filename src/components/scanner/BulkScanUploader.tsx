/**
 * BULK SCAN UPLOADER
 * ==========================================================================
 * Multi-image upload component for Bulk Scan v2 (Elite only).
 * Allows up to 20 images at once.
 * ==========================================================================
 */

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, Images, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 20;

interface BulkScanUploaderProps {
  onImagesSelected: (imageDataList: string[]) => void;
  disabled?: boolean;
}

export function BulkScanUploader({
  onImagesSelected,
  disabled = false,
}: BulkScanUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const processFiles = (files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
    
    if (fileArray.length === 0) {
      setError("No valid image files selected");
      return;
    }

    if (fileArray.length > MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images allowed. Please select fewer images.`);
      return;
    }

    const readPromises = fileArray.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readPromises).then((imageDataList) => {
      setPreviewImages(imageDataList);
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      processFiles(files);
    }
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

    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    setPreviewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartBulkScan = () => {
    if (previewImages.length > 0) {
      onImagesSelected(previewImages);
    }
  };

  const clearAll = () => {
    setPreviewImages([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Images className="w-5 h-5" />
          Bulk Upload Comics
        </CardTitle>
        <CardDescription>
          Select up to {MAX_IMAGES} comic cover images to scan at once.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {previewImages.length === 0 ? (
          <>
            {/* Drop Zone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={disabled ? undefined : handleDrop}
              onClick={() => !disabled && fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center justify-center space-y-3 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Drop images here or click to upload</p>
                  <p className="text-sm text-muted-foreground">
                    Up to {MAX_IMAGES} images • JPG, PNG
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              <Images className="w-4 h-4 mr-2" />
              Select Multiple Images
            </Button>
          </>
        ) : (
          <>
            {/* Preview Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto p-1">
              {previewImages.map((img, index) => (
                <div
                  key={index}
                  className="relative aspect-[2/3] rounded-md overflow-hidden border border-border group"
                >
                  <img
                    src={img}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-background/80 text-xs text-center py-0.5">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{previewImages.length} image{previewImages.length !== 1 ? "s" : ""} selected</span>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear all
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={previewImages.length >= MAX_IMAGES}
              >
                Add More
              </Button>
              <Button
                className="flex-1"
                onClick={handleStartBulkScan}
                disabled={disabled}
              >
                Start Bulk Scan
              </Button>
            </div>
          </>
        )}

        {/* Hidden Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </CardContent>
    </Card>
  );
}
