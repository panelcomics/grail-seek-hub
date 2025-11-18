import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ComicVinePick } from "@/types/comicvine";
import { Clock } from "lucide-react";

interface RecentScansProps {
  recentScans: ComicVinePick[];
  onSelectScan: (scan: ComicVinePick) => void;
}

export function RecentScans({ recentScans, onSelectScan }: RecentScansProps) {
  if (recentScans.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm">Recent Scans</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-2">
            {recentScans.map((scan) => (
              <button
                key={scan.id}
                onClick={() => onSelectScan(scan)}
                className="flex-shrink-0 w-24 group cursor-pointer"
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden border-2 border-border group-hover:border-primary transition-colors">
                  <img
                    src={scan.thumbUrl}
                    alt={scan.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs mt-1 truncate font-medium">
                  {scan.volumeName || scan.title}
                </p>
                {scan.issue && (
                  <p className="text-xs text-muted-foreground truncate">
                    #{scan.issue}
                  </p>
                )}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
