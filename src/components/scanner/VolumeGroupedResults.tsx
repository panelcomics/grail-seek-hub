import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComicVinePick, GroupedResults } from "@/types/comicvine";
import { Book, Calendar, Building2, User, Pen } from "lucide-react";

interface VolumeGroupedResultsProps {
  groupedResults: GroupedResults[];
  onSelectComic: (pick: ComicVinePick) => void;
  onCoverClick: (imageUrl: string, title: string) => void;
}

export function VolumeGroupedResults({ 
  groupedResults, 
  onSelectComic,
  onCoverClick 
}: VolumeGroupedResultsProps) {
  if (groupedResults.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No results found.</p>
          <p className="text-sm mt-2">
            Try a simpler search like "Amazing Spider-Man" or just the title without the issue number.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groupedResults.map((group) => (
        <Card key={group.volume.id}>
          <CardHeader className="pb-3 border-b">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{group.volume.name}</CardTitle>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {group.volume.yearRange}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {group.volume.publisher}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {group.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <button
                    onClick={() => onCoverClick(issue.coverUrl, `${issue.volumeName || issue.title} #${issue.issue}`)}
                    className="flex-shrink-0"
                  >
                    <img
                      src={issue.thumbUrl}
                      alt={`${issue.title} ${issue.issue}`}
                      className="w-16 h-24 object-cover rounded border hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">
                          {issue.title || `Issue #${issue.issue}`}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Issue #{issue.issue}
                        </p>
                      </div>
                      {issue.year && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {issue.year}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      {issue.writer && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Pen className="h-3 w-3" />
                          <span>{issue.writer}</span>
                        </div>
                      )}
                      {issue.artist && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{issue.artist}</span>
                        </div>
                      )}
                    </div>

                    {issue.isReprint && (
                      <Badge variant="secondary" className="text-xs mb-2">
                        Reprint
                      </Badge>
                    )}
                    
                    <Button
                      size="sm"
                      onClick={() => onSelectComic(issue)}
                      className="w-full mt-1"
                    >
                      <Book className="h-3 w-3 mr-1" />
                      Use this comic
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
