/**
 * SCANNER IDLE SCREEN
 * ==========================================================================
 * Initial camera/upload screen with production-ready copy.
 * ==========================================================================
 */

import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X } from "lucide-react";
import { SCANNER_COPY } from "@/types/scannerState";

interface ScannerIdleScreenProps {
  cameraActive: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onCapturePhoto: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ScannerIdleScreen({
  cameraActive,
  videoRef,
  onStartCamera,
  onStopCamera,
  onCapturePhoto,
  onFileUpload,
}: ScannerIdleScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const copy = SCANNER_COPY.idle;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{copy.header}</CardTitle>
        <CardDescription className="whitespace-pre-line">
          {copy.subtext}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {!cameraActive ? (
            <>
              <Button
                size="lg"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full"
              >
                <Camera className="h-5 w-5 mr-2" />
                {copy.primaryButton}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="h-5 w-5 mr-2" />
                {copy.secondaryButton}
              </Button>
            </>
          ) : (
            <div className="col-span-2 space-y-3">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={onCapturePhoto}
                  className="flex-1"
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Capture
                </Button>
                <Button
                  onClick={onStopCamera}
                  variant="outline"
                  size="lg"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer micro-copy */}
        {copy.helperText && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            {copy.helperText}
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileUpload}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFileUpload}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}
