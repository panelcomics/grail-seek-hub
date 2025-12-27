/**
 * SCANNER ERROR SCREENS
 * ==========================================================================
 * Error states that never sound like failure - always forward-looking.
 * ==========================================================================
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Wifi, RefreshCw, Save } from "lucide-react";
import { SCANNER_COPY, ScannerState } from "@/types/scannerState";

interface ScannerErrorScreenProps {
  errorType: 'error_camera' | 'error_image' | 'error_network';
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
}

export function ScannerErrorScreen({
  errorType,
  onPrimaryAction,
  onSecondaryAction,
}: ScannerErrorScreenProps) {
  const copy = SCANNER_COPY[errorType];

  const getIcon = () => {
    switch (errorType) {
      case 'error_camera':
        return <Camera className="w-6 h-6 text-blue-500" />;
      case 'error_image':
        return <Camera className="w-6 h-6 text-amber-500" />;
      case 'error_network':
        return <Wifi className="w-6 h-6 text-red-500" />;
      default:
        return <Camera className="w-6 h-6 text-muted-foreground" />;
    }
  };

  const getIconBg = () => {
    switch (errorType) {
      case 'error_camera':
        return 'bg-blue-500/10';
      case 'error_image':
        return 'bg-amber-500/10';
      case 'error_network':
        return 'bg-red-500/10';
      default:
        return 'bg-muted';
    }
  };

  const getPrimaryIcon = () => {
    switch (errorType) {
      case 'error_camera':
        return <Camera className="w-4 h-4 mr-2" />;
      case 'error_image':
        return <RefreshCw className="w-4 h-4 mr-2" />;
      case 'error_network':
        return <RefreshCw className="w-4 h-4 mr-2" />;
      default:
        return null;
    }
  };

  const getSecondaryIcon = () => {
    switch (errorType) {
      case 'error_image':
        return <Upload className="w-4 h-4 mr-2" />;
      case 'error_network':
        return <Save className="w-4 h-4 mr-2" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="text-center pb-3">
        <div className={`mx-auto w-12 h-12 rounded-full ${getIconBg()} flex items-center justify-center mb-3`}>
          {getIcon()}
        </div>
        <CardTitle className="text-xl">{copy.header}</CardTitle>
        <CardDescription>{copy.subtext}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={onPrimaryAction} className="w-full" size="lg">
          {getPrimaryIcon()}
          {copy.primaryButton}
        </Button>

        {copy.secondaryButton && onSecondaryAction && (
          <Button onClick={onSecondaryAction} variant="outline" className="w-full">
            {getSecondaryIcon()}
            {copy.secondaryButton}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
