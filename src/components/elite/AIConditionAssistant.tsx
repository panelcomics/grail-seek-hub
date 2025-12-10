/**
 * AI CONDITION ASSISTANT COMPONENT (Elite Only)
 * Provides AI-powered condition assessment and grade estimation
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useEliteAccess } from "@/hooks/useEliteAccess";
import { Crown, Sparkles, Eye, Loader2, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ConditionAssessment {
  gradeRangeLow: number;
  gradeRangeHigh: number;
  conditionNotes: string;
  spineCondition: string;
  cornerCondition: string;
  surfaceCondition: string;
  glossCondition: string;
  pressingPotential: 'low' | 'medium' | 'high';
}

interface AIConditionAssistantProps {
  imageUrl: string | null;
  inventoryItemId?: string;
  onAssessmentComplete?: (assessment: ConditionAssessment) => void;
}

export function AIConditionAssistant({ imageUrl, inventoryItemId, onAssessmentComplete }: AIConditionAssistantProps) {
  const navigate = useNavigate();
  const { isElite, loading: eliteLoading } = useEliteAccess();
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<ConditionAssessment | null>(null);
  const [expanded, setExpanded] = useState(false);

  const runAssessment = async () => {
    if (!imageUrl) {
      toast.error("Please upload a cover image first");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to use AI assessment");
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-condition-ai', {
        body: { imageUrl, inventoryItemId }
      });

      if (error) throw error;

      if (data.error) {
        if (data.code === 'NOT_ELITE') {
          toast.error("Elite subscription required for AI condition assessment");
          return;
        }
        throw new Error(data.error);
      }

      setAssessment(data.assessment);
      setExpanded(true);
      onAssessmentComplete?.(data.assessment);
      toast.success("AI condition assessment complete!");
    } catch (err) {
      console.error('[AI-CONDITION] Error:', err);
      toast.error("Failed to analyze condition");
    } finally {
      setLoading(false);
    }
  };

  const getPressingBadgeVariant = (potential: string) => {
    switch (potential) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  // Free user teaser
  if (!eliteLoading && !isElite) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">AI Condition Assistant</CardTitle>
            </div>
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" />
              Elite
            </Badge>
          </div>
          <CardDescription>
            Get AI-powered grade estimates and detailed condition notes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Blurred preview */}
            <div className="blur-sm pointer-events-none opacity-60 space-y-3">
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold">8.0 - 8.5</div>
                <Badge>Medium Pressing Potential</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><strong>Spine:</strong> Minor stress lines...</div>
                <div><strong>Corners:</strong> Light wear...</div>
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
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">AI Condition Assistant</CardTitle>
          </div>
          <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
            <Crown className="h-3 w-3" />
            Elite
          </Badge>
        </div>
        <CardDescription>
          Get AI-powered grade estimates and detailed condition notes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!assessment ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Our AI will analyze your comic cover image and provide a detailed condition assessment including estimated grade range, condition notes, and pressing potential.
            </p>
            <Button 
              onClick={runAssessment} 
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
                  <Eye className="h-4 w-4" />
                  Analyze Condition
                </>
              )}
            </Button>
            {!imageUrl && (
              <p className="text-xs text-muted-foreground text-center">
                Upload a cover image to enable AI assessment
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Grade Range */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estimated Grade</p>
                <p className="text-3xl font-bold text-primary">
                  {assessment.gradeRangeLow} - {assessment.gradeRangeHigh}
                </p>
              </div>
              <Badge variant={getPressingBadgeVariant(assessment.pressingPotential)}>
                {assessment.pressingPotential.charAt(0).toUpperCase() + assessment.pressingPotential.slice(1)} Pressing Potential
              </Badge>
            </div>

            {/* Summary */}
            <p className="text-sm">{assessment.conditionNotes}</p>

            {/* Expandable Details */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setExpanded(!expanded)}
              className="w-full justify-between"
            >
              <span>Detailed Analysis</span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {expanded && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border-t pt-3">
                <div>
                  <p className="font-medium text-muted-foreground">Spine</p>
                  <p>{assessment.spineCondition}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Corners</p>
                  <p>{assessment.cornerCondition}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Surface</p>
                  <p>{assessment.surfaceCondition}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Gloss</p>
                  <p>{assessment.glossCondition}</p>
                </div>
              </div>
            )}

            <Button 
              variant="outline" 
              size="sm" 
              onClick={runAssessment}
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
