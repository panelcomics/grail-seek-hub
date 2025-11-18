import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface DebugPanelProps {
  debugData: {
    status: string;
    raw_ocr?: string;
    extracted?: {
      title?: string;
      issueNumber?: string;
      publisher?: string;
      year?: number;
    };
    confidence?: number;
    queryParams?: any;
    comicvineQuery?: string;
  };
}

export function DebugPanel({ debugData }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-amber-500/50 bg-amber-50/10 dark:bg-amber-950/10">
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">Debug Panel</CardTitle>
              <Badge variant="outline" className="text-xs">
                {debugData.status}
              </Badge>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-3 text-xs">
            {debugData.raw_ocr && (
              <div>
                <p className="font-semibold mb-1 text-muted-foreground">Raw OCR:</p>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">
                  {debugData.raw_ocr}
                </pre>
              </div>
            )}
            
            {debugData.extracted && (
              <div>
                <p className="font-semibold mb-1 text-muted-foreground">Extracted Tokens:</p>
                <div className="bg-muted p-2 rounded space-y-1">
                  {debugData.extracted.title && (
                    <div><span className="font-medium">Title:</span> {debugData.extracted.title}</div>
                  )}
                  {debugData.extracted.issueNumber && (
                    <div><span className="font-medium">Issue:</span> {debugData.extracted.issueNumber}</div>
                  )}
                  {debugData.extracted.publisher && (
                    <div><span className="font-medium">Publisher:</span> {debugData.extracted.publisher}</div>
                  )}
                  {debugData.extracted.year && (
                    <div><span className="font-medium">Year:</span> {debugData.extracted.year}</div>
                  )}
                </div>
              </div>
            )}
            
            {debugData.confidence !== undefined && (
              <div>
                <p className="font-semibold mb-1 text-muted-foreground">Auto-match Confidence:</p>
                <Badge variant={debugData.confidence >= 0.8 ? "default" : "secondary"}>
                  {(debugData.confidence * 100).toFixed(1)}%
                </Badge>
              </div>
            )}
            
            {debugData.comicvineQuery && (
              <div>
                <p className="font-semibold mb-1 text-muted-foreground">ComicVine Query:</p>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                  {debugData.comicvineQuery}
                </pre>
              </div>
            )}
            
            {debugData.queryParams && (
              <div>
                <p className="font-semibold mb-1 text-muted-foreground">Query Parameters:</p>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(debugData.queryParams, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
