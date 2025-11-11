import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Search, X } from "lucide-react";

interface RecognitionFallbackProps {
  failedImage: string | null;
  lastMethod: "camera" | "upload" | null;
  onRetakePhoto: () => void;
  onUploadInstead: () => void;
  onSearchByTitle: () => void;
  onClose: () => void;
}

export function RecognitionFallback({
  failedImage,
  lastMethod,
  onRetakePhoto,
  onUploadInstead,
  onSearchByTitle,
  onClose,
}: RecognitionFallbackProps) {
  return (
    <Card className="relative border-2 border-muted bg-card">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>

      <CardContent className="pt-8 pb-6 px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Emoji and message */}
          <div className="text-4xl">😕</div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">We couldn't identify that comic.</h3>
            <p className="text-sm text-muted-foreground">
              You can try again with a clearer photo, upload from your gallery, or search by name.
            </p>
          </div>

          {/* Failed image thumbnail */}
          {failedImage && (
            <div className="w-32 h-32 rounded-lg overflow-hidden border border-border">
              <img
                src={failedImage}
                alt="Failed scan"
                className="w-full h-full object-cover opacity-60"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 w-full mt-2">
            <Button
              onClick={onRetakePhoto}
              variant="default"
              className="w-full"
            >
              <Camera className="mr-2 h-4 w-4" />
              Retake Photo
            </Button>

            <Button
              onClick={onUploadInstead}
              variant="outline"
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Instead
            </Button>

            <Button
              onClick={onSearchByTitle}
              variant="outline"
              className="w-full"
            >
              <Search className="mr-2 h-4 w-4" />
              Search by Title
            </Button>
          </div>

          {lastMethod && (
            <p className="text-xs text-muted-foreground mt-2">
              Last attempt: {lastMethod === "camera" ? "Camera" : "Upload"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
