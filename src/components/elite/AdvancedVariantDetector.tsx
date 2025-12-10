/**
 * ADVANCED VARIANT DETECTOR COMPONENT (Elite Only)
 * Provides AI-powered variant and print edition detection
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEliteAccess } from "@/hooks/useEliteAccess";
import { Crown, Fingerprint, Loader2, Lock, Info } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VariantAnalysis {
  printNumber: string | null;
  variantName: string | null;
  rarityScore: number;
  detectionReasons: string[];
  isReprint: boolean;
  coverType: string;
}

interface AdvancedVariantDetectorProps {
  imageUrl: string | null;
  title?: string;
  issueNumber?: string;
  onAnalysisComplete?: (analysis: VariantAnalysis) => void;
}

export function AdvancedVariantDetector({ 
  imageUrl, 
  title, 
  issueNumber,
  onAnalysisComplete 
}: AdvancedVariantDetectorProps) {
  const navigate = useNavigate();
  const { isElite, loading: eliteLoading } = useEliteAccess();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<VariantAnalysis | null>(null);

  const runAnalysis = async () => {
    if (!imageUrl) {
      toast.error("Please upload a cover image first");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to use variant detection");
        return;
      }

      const { data, error } = await supabase.functions.invoke('analyze-variant', {
        body: { imageUrl, title, issueNumber }
      });

      if (error) throw error;

      if (!data.isElite) {
        // Free user got basic result
        toast.info("Upgrade to Elite for detailed variant analysis");
        return;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data.analysis);
      onAnalysisComplete?.(data.analysis);
      toast.success("Variant analysis complete!");
    } catch (err) {
      console.error('[VARIANT-DETECT] Error:', err);
      toast.error("Failed to analyze variant");
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (score: number) => {
    if (score >= 80) return 'text-yellow-500';
    if (score >= 60) return 'text-orange-500';
    if (score >= 40) return 'text-blue-500';
    return 'text-muted-foreground';
  };

  // Free user teaser
  if (!eliteLoading && !isElite) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Advanced Variant Detector</CardTitle>
            </div>
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" />
              Elite
            </Badge>
          </div>
          <CardDescription>
            Identify exact print editions and variant covers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Blurred preview */}
            <div className="blur-sm pointer-events-none opacity-60 space-y-3">
              <div className="flex items-center gap-4">
                <Badge>1st Print</Badge>
                <Badge variant="secondary">Direct Edition</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Rarity Score:</span>
                <Progress value={75} className="h-2 flex-1" />
                <span className="font-bold">75</span>
              </div>
            </div>
            
            {/* Upgrade CTA overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <Button onClick={() => navigate('/plans')} className="gap-2">
                <Crown className="h-4 w-4" />
                Upgrade to Elite
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Advanced Variant Detector</CardTitle>
          </div>
          <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
            <Crown className="h-3 w-3" />
            Elite
          </Badge>
        </div>
        <CardDescription>
          Identify exact print editions and variant covers
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!analysis ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Our AI will analyze your comic cover to identify the exact print edition, variant type, and rarity based on visual cues like price box, logo, and UPC differences.
            </p>
            <Button 
              onClick={runAnalysis} 
              disabled={loading || !imageUrl}
              className="w-full gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4" />
                  Detect Variant
                </>
              )}
            </Button>
            {!imageUrl && (
              <p className="text-xs text-muted-foreground text-center">
                Upload a cover image to enable variant detection
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Print & Variant Info */}
            <div className="flex flex-wrap gap-2">
              {analysis.printNumber && (
                <Badge variant="default">{analysis.printNumber} Print</Badge>
              )}
              <Badge variant="secondary">{analysis.coverType}</Badge>
              {analysis.variantName && (
                <Badge variant="outline">{analysis.variantName}</Badge>
              )}
              {analysis.isReprint && (
                <Badge variant="destructive">Reprint</Badge>
              )}
            </div>

            {/* Rarity Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1 cursor-help">
                      <span>Rarity Score</span>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Rarity score (1-100) based on print run estimates, variant scarcity, and market demand.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className={`font-bold text-lg ${getRarityColor(analysis.rarityScore)}`}>
                  {analysis.rarityScore}
                </span>
              </div>
              <Progress value={analysis.rarityScore} className="h-2" />
            </div>

            {/* Detection Reasons */}
            {analysis.detectionReasons && analysis.detectionReasons.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">How we detected this:</p>
                <ul className="text-sm space-y-1">
                  {analysis.detectionReasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button 
              variant="outline" 
              size="sm" 
              onClick={runAnalysis}
              disabled={loading}
              className="w-full"
            >
              Re-analyze
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
