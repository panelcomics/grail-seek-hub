import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Loader2, ChevronRight, X, Search, AlertCircle } from "lucide-react";
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
  initialIssueNumber?: string;
}

export function VolumeIssuePicker({ volumes, loading, onSelectIssue, onClose, initialIssueNumber }: VolumeIssuePickerProps) {
  const [selectedVolume, setSelectedVolume] = useState<Volume | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [issueFilter, setIssueFilter] = useState(initialIssueNumber || "");
  const [issueError, setIssueError] = useState<string | null>(null);

  const handleVolumeClick = async (volume: Volume) => {
    setSelectedVolume(volume);
    setLoadingIssues(true);
    setIssueError(null);
    
    try {
      // volumes-issues expects volumeId as a query parameter, not body
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/volumes-issues?volumeId=${volume.id}`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load issues');
      }

      const data = await response.json();
      const issuesList = data.issues || [];
      
      if (issuesList.length === 0) {
        setIssueError('No issues found for this volume. The data may still be syncing.');
      }
      
      setIssues(issuesList);
    } catch (error) {
      console.error('Failed to load issues:', error);
      setIssueError(error instanceof Error ? error.message : 'Failed to load issues. Please try again.');
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
        {selectedVolume && (
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Issue # (e.g. 1, 11, 129)"
                value={issueFilter}
                onChange={(e) => setIssueFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            {issueFilter && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIssueFilter("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
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
          ) : issueError ? (
            // Error State
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">{issueError}</p>
              <Button
                variant="outline"
                onClick={() => handleVolumeClick(selectedVolume)}
              >
                Try Again
              </Button>
            </div>
          ) : issues.length === 0 ? (
            // No Issues Found
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-sm text-muted-foreground">No issues found for this volume.</p>
            </div>
          ) : (
            // Issue List
            <div className="space-y-2">
              {issues
                .filter((issue) => {
                  if (!issueFilter.trim()) return true;
                  const filterNum = issueFilter.trim().toLowerCase();
                  const issueNum = (issue.issue_number || "").toLowerCase();
                  return issueNum.includes(filterNum);
                })
                .map((issue) => {
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
