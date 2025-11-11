import { Card } from "@/components/ui/card";

interface RecognitionDebugData {
  status: "idle" | "processing" | "success" | "error";
  method: "camera" | "upload" | "search" | null;
  apiHit: "ComicVine" | "scan-item" | null;
  confidenceScore: number | null;
  responseTimeMs: number | null;
  ocrTimeMs: number | null;
  errorMessage: string | null;
  rawOcrText: string | null;
  cvQuery: string | null;
  slabData: any;
  ebayData: any;
  retryAttempt: number;
}

interface RecognitionDebugOverlayProps {
  debugData: RecognitionDebugData;
}

export function RecognitionDebugOverlay({ debugData }: RecognitionDebugOverlayProps) {
  // Only show in dev mode
  if (!import.meta.env.DEV) return null;
  
  // Don't render if idle and no previous data
  if (debugData.status === "idle" && !debugData.method) return null;

  const getStatusIcon = () => {
    switch (debugData.status) {
      case "processing":
        return "🟡";
      case "success":
        return "🟢";
      case "error":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const getStatusColor = () => {
    switch (debugData.status) {
      case "processing":
        return "text-yellow-400";
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 w-[320px] max-h-[80vh] overflow-auto bg-black/90 backdrop-blur-sm border-border/50 p-3 text-xs font-mono z-50">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 font-semibold text-foreground border-b border-border/30 pb-1.5 mb-2">
          <span>🔍</span>
          <span>Recognition Debug</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status:</span>
          <span className={`flex items-center gap-1 ${getStatusColor()}`}>
            {getStatusIcon()} {debugData.status}
          </span>
        </div>

        {debugData.method && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Method:</span>
            <span className="text-foreground capitalize">{debugData.method}</span>
          </div>
        )}

        {debugData.apiHit && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">API Hit:</span>
            <span className="text-foreground">{debugData.apiHit}</span>
          </div>
        )}

        {debugData.confidenceScore !== null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Confidence:</span>
            <span className="text-foreground">{debugData.confidenceScore}%</span>
          </div>
        )}

        {debugData.responseTimeMs !== null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Time:</span>
            <span className="text-foreground">{debugData.responseTimeMs} ms</span>
          </div>
        )}

        {debugData.ocrTimeMs !== null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">OCR Time:</span>
            <span className="text-foreground">{debugData.ocrTimeMs} ms</span>
          </div>
        )}

        {debugData.retryAttempt > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Retry:</span>
            <span className="text-yellow-400">Attempt #{debugData.retryAttempt}</span>
          </div>
        )}

        {debugData.rawOcrText && (
          <div className="mt-2 pt-2 border-t border-border/30">
            <div className="text-muted-foreground mb-1">Raw OCR Text:</div>
            <div className="text-foreground text-[10px] bg-black/40 p-2 rounded max-h-24 overflow-auto break-words">
              {debugData.rawOcrText}
            </div>
          </div>
        )}

        {debugData.cvQuery && (
          <div className="mt-2 pt-2 border-t border-border/30">
            <div className="text-muted-foreground mb-1">CV Query:</div>
            <div className="text-green-400 break-words">
              {debugData.cvQuery}
            </div>
          </div>
        )}

        {debugData.slabData && Object.keys(debugData.slabData).length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/30">
            <div className="text-muted-foreground mb-1">Slab Data:</div>
            <div className="text-foreground text-[10px] space-y-0.5">
              {debugData.slabData.title && <div>Title: {debugData.slabData.title}</div>}
              {debugData.slabData.issueNumber && <div>Issue: #{debugData.slabData.issueNumber}</div>}
              {debugData.slabData.grade && <div>Grade: {debugData.slabData.grade}</div>}
              {debugData.slabData.certNumber && <div>Cert: {debugData.slabData.certNumber}</div>}
              {debugData.slabData.gradingCompany && <div>Company: {debugData.slabData.gradingCompany}</div>}
            </div>
          </div>
        )}

        {debugData.errorMessage && (
          <div className="mt-2 pt-2 border-t border-border/30">
            <div className="text-red-400 break-words">
              ❌ {debugData.errorMessage}
            </div>
          </div>
        )}

        {debugData.ebayData && (
          <div className="mt-2 pt-2 border-t border-border/30">
            <div className="text-muted-foreground mb-1">eBay Comps:</div>
            <div className="text-foreground text-[10px] space-y-0.5">
              <div>💰 Avg: ${debugData.ebayData.avgPrice?.toFixed(2) || 'N/A'}</div>
              <div>📊 Range: ${debugData.ebayData.minPrice?.toFixed(2)}-${debugData.ebayData.maxPrice?.toFixed(2)}</div>
              <div>📈 Total: {debugData.ebayData.totalResults || 0} results</div>
              {debugData.ebayData.items?.slice(0, 2).map((item: any, i: number) => (
                <div key={i} className="text-green-400">
                  • ${item.price}: {item.title.slice(0, 30)}...
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
