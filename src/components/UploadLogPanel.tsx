import { Card } from "@/components/ui/card";

interface UploadLog {
  timestamp: string;
  fieldName: string;
  size: string;
  type: string;
  status: number;
  path?: string;
  publicUrl?: string;
  elapsed: string;
  error?: string;
}

interface UploadLogPanelProps {
  log: UploadLog | null;
}

export function UploadLogPanel({ log }: UploadLogPanelProps) {
  const isDev = import.meta.env.DEV || window.location.hostname.includes('lovable.app');
  
  if (!isDev || !log) return null;

  return (
    <Card className="fixed bottom-4 right-4 z-50 p-3 max-w-md bg-background/95 backdrop-blur border shadow-lg">
      <div className="text-xs space-y-1 font-mono">
        <div className="font-semibold text-foreground mb-2">📤 Upload Log</div>
        <div><span className="text-muted-foreground">Time:</span> {log.timestamp}</div>
        <div><span className="text-muted-foreground">Field:</span> {log.fieldName}</div>
        <div><span className="text-muted-foreground">Size:</span> {log.size}</div>
        <div><span className="text-muted-foreground">Type:</span> {log.type}</div>
        <div><span className="text-muted-foreground">Status:</span> <span className={log.status === 200 ? "text-green-500" : "text-red-500"}>{log.status}</span></div>
        <div><span className="text-muted-foreground">Elapsed:</span> {log.elapsed}</div>
        {log.path && <div className="break-all"><span className="text-muted-foreground">Path:</span> {log.path}</div>}
        {log.publicUrl && <div className="break-all"><span className="text-muted-foreground">URL:</span> {log.publicUrl}</div>}
        {log.error && <div className="text-red-500 break-all"><span className="text-muted-foreground">Error:</span> {log.error}</div>}
      </div>
    </Card>
  );
}
