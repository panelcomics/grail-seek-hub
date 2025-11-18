import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Volume {
  id: number;
  name: string;
  publisher: string | null;
  start_year: number | null;
  issue_count: number;
  image_url: string | null;
  deck: string | null;
}

interface Issue {
  id: number;
  volume_id: number;
  issue_number: string | null;
  name: string | null;
  cover_date: string | null;
  image_url: string | null;
  writer: string | null;
  artist: string | null;
  key_notes: string | null;
}

interface VolumeIssuePickerProps {
  volumes: Volume[];
  loading: boolean;
  onSelectIssue: (issue: Issue, volume: Volume) => void;
  onClose?: () => void;
}

export function VolumeIssuePicker({ volumes, loading, onSelectIssue, onClose }: VolumeIssuePickerProps) {
  const [selectedVolume, setSelectedVolume] = useState<Volume | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);

  const handleVolumeClick = async (volume: Volume) => {
    setSelectedVolume(volume);
    setLoadingIssues(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('volumes-issues', {
        body: { volumeId: volume.id }
      });

      if (error) throw error;
      setIssues(data.issues || []);
    } catch (error) {
      console.error('Failed to load issues:', error);
      setIssues([]);
    } finally {
      setLoadingIssues(false);
    }
  };

  const handleIssueClick = (issue: Issue) => {
    if (selectedVolume) {
      onSelectIssue(issue, selectedVolume);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (volumes.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {selectedVolume ? selectedVolume.name : 'Select Volume'}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {selectedVolume 
                ? 'Choose the specific issue' 
                : 'Searching local ComicVine index for speed & accuracy'}
            </CardDescription>
          </div>
          {(selectedVolume || onClose) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => selectedVolume ? setSelectedVolume(null) : onClose?.()}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {!selectedVolume ? (
            // Volume List
            <div className="space-y-2">
              {volumes.map((volume) => (
                <button
                  key={volume.id}
                  onClick={() => handleVolumeClick(volume)}
                  className="w-full text-left"
                >
                  <Card className="hover:bg-accent transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        {volume.image_url && (
                          <img
                            src={volume.image_url}
                            alt={volume.name}
                            className="w-16 h-24 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold truncate">{volume.name}</h4>
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {volume.publisher && (
                              <Badge variant="secondary" className="text-xs">
                                {volume.publisher}
                              </Badge>
                            )}
                            {volume.start_year && (
                              <Badge variant="outline" className="text-xs">
                                {volume.start_year}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {volume.issue_count} issues
                            </Badge>
                          </div>
                          {volume.deck && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {volume.deck}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          ) : loadingIssues ? (
            // Loading Issues
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            // Issue List
            <div className="space-y-2">
              {issues.map((issue) => {
                const year = issue.cover_date ? new Date(issue.cover_date).getFullYear() : null;
                
                return (
                  <button
                    key={issue.id}
                    onClick={() => handleIssueClick(issue)}
                    className="w-full text-left"
                  >
                    <Card className="hover:bg-accent transition-colors cursor-pointer">
                      <CardContent className="p-3">
                        <div className="flex gap-3">
                          {issue.image_url && (
                            <img
                              src={issue.image_url}
                              alt={`Issue #${issue.issue_number}`}
                              className="w-12 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="font-semibold">#{issue.issue_number}</span>
                              {issue.name && (
                                <span className="text-sm text-muted-foreground truncate">
                                  {issue.name}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 mt-1 flex-wrap text-xs">
                              {year && (
                                <Badge variant="outline" className="text-xs">
                                  {year}
                                </Badge>
                              )}
                              {issue.writer && (
                                <span className="text-muted-foreground">
                                  W: {issue.writer.split(',')[0]}
                                </span>
                              )}
                              {issue.artist && (
                                <span className="text-muted-foreground">
                                  A: {issue.artist.split(',')[0]}
                                </span>
                              )}
                            </div>
                            {issue.key_notes && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 line-clamp-1">
                                {issue.key_notes.substring(0, 100)}...
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
