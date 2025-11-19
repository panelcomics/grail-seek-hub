import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ComicVineIssuesSync() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const { toast } = useToast();
  
  const [stats, setStats] = useState({
    totalIssues: 0,
    distinctVolumes: 0,
    lastSync: null as string | null,
  });
  
  const [volumeOffset, setVolumeOffset] = useState(0);
  const [volumeLimit, setVolumeLimit] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    try {
      const { count: issueCount, error: issueError } = await supabase
        .from('comicvine_issues')
        .select('*', { count: 'exact', head: true });

      if (issueError) {
        console.error('Error fetching issue count:', issueError);
      }

      const { data: distinctVolumes, error: volumeError } = await supabase
        .from('comicvine_issues')
        .select('volume_id')
        .not('volume_id', 'is', null);

      if (volumeError) {
        console.error('Error fetching distinct volumes:', volumeError);
      }

      const uniqueVolumes = new Set(distinctVolumes?.map(d => d.volume_id) || []).size;

      const { data: lastSyncData } = await supabase
        .from('comicvine_issues')
        .select('last_synced_at')
        .order('last_synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setStats({
        totalIssues: issueCount || 0,
        distinctVolumes: uniqueVolumes,
        lastSync: lastSyncData?.last_synced_at || null,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-comicvine-issues', {
        body: { volumeOffset, volumeLimit },
      });

      if (error) throw error;

      setLastResult(data);

      if (data.success) {
        const nextOffset = data.nextVolumeOffset;
        setVolumeOffset(nextOffset);
        
        await fetchStats();
        
        toast({
          title: data.done ? "Issue Sync Complete" : "Batch Synced",
          description: data.done 
            ? `Synced ${data.issuesProcessed} issues for ${data.volumesProcessed} volume(s). All done!`
            : `Synced ${data.issuesProcessed} issues for ${data.volumesProcessed} volume(s). Click "Start Issue Sync" again to continue (offset: ${nextOffset}).`,
        });
      } else {
        toast({
          title: "Sync Failed",
          description: data.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('[UI] Unexpected error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sync issues",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">ComicVine Issue Sync</h1>
        <p className="text-muted-foreground">
          Sync comic book issues from ComicVine API in small batches
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Issue Cache Statistics</CardTitle>
          <CardDescription>Current state of the comicvine_issues table</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Issues</p>
              <p className="text-2xl font-bold">{stats.totalIssues.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Volumes with Issues</p>
              <p className="text-2xl font-bold">{stats.distinctVolumes.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Sync</p>
              <p className="text-sm font-medium">
                {stats.lastSync ? new Date(stats.lastSync).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync ComicVine Issues</CardTitle>
          <CardDescription>
            Process issues for a small batch of volumes (1-5 volumes per sync)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="volumeOffset">Volume Offset</Label>
              <Input
                id="volumeOffset"
                type="number"
                min="0"
                value={volumeOffset}
                onChange={(e) => setVolumeOffset(Number(e.target.value))}
                disabled={syncing}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Start position in comicvine_volumes (0-based)
              </p>
            </div>
            <div>
              <Label htmlFor="volumeLimit">Volume Limit</Label>
              <Input
                id="volumeLimit"
                type="number"
                min="1"
                max="5"
                value={volumeLimit}
                onChange={(e) => setVolumeLimit(Math.min(5, Math.max(1, Number(e.target.value))))}
                disabled={syncing}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Process 1-5 volumes per batch
              </p>
            </div>
          </div>

          <Button
            onClick={handleSync}
            disabled={syncing}
            className="w-full"
          >
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              'Start Issue Sync'
            )}
          </Button>

          {lastResult && (
            <Card className={lastResult.success ? "border-green-500" : "border-red-500"}>
              <CardHeader>
                <CardTitle className="text-sm">
                  {lastResult.success ? "✓ Sync Result" : "✗ Sync Failed"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Volume Offset:</span>
                    <span className="ml-2 font-medium">{lastResult.volumeOffset}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Volume Limit:</span>
                    <span className="ml-2 font-medium">{lastResult.volumeLimit}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Volumes Processed:</span>
                    <span className="ml-2 font-medium">{lastResult.volumesProcessed}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Issues Processed:</span>
                    <span className="ml-2 font-medium">{lastResult.issuesProcessed}</span>
                  </div>
                  {lastResult.nextVolumeOffset !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Next Offset:</span>
                      <span className="ml-2 font-medium">{lastResult.nextVolumeOffset}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Done:</span>
                    <span className="ml-2 font-medium">{lastResult.done ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{lastResult.message}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
