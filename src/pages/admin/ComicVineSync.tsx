import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Database, CheckCircle2, XCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

export default function ComicVineSync() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [stats, setStats] = useState<{ volumes: number; issues: number } | null>(null);
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      const { data: volumeData } = await supabase
        .from('comicvine_volumes')
        .select('id', { count: 'exact', head: true });
      
      const { data: issueData } = await supabase
        .from('comicvine_issues')
        .select('id', { count: 'exact', head: true });

      setStats({
        volumes: volumeData?.length || 0,
        issues: issueData?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-comicvine-cache', {
        body: { limit: 100 },
      });

      if (error) throw error;

      setSyncResult(data);
      toast({
        title: "Sync Complete",
        description: `Synced ${data.volumesSynced} volumes and ${data.issuesSynced} issues`,
      });
      
      // Refresh stats
      await fetchStats();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message || "Failed to sync ComicVine cache",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Load stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">ComicVine Cache Management</h1>

        <div className="grid gap-6">
          {/* Current Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Cache Statistics
              </CardTitle>
              <CardDescription>
                Current state of the local ComicVine cache
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-primary">{stats.volumes.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground mt-1">Volumes</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-primary">{stats.issues.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground mt-1">Issues</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">Loading stats...</div>
              )}
            </CardContent>
          </Card>

          {/* Sync Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Sync ComicVine Data</CardTitle>
              <CardDescription>
                Populate the local cache with ComicVine volumes and issues. This will sync the top 100 volumes by issue count.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleSync}
                disabled={syncing}
                className="w-full"
                size="lg"
              >
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Start Sync
                  </>
                )}
              </Button>

              {syncResult && (
                <div className={`p-4 rounded-lg ${syncResult.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                  <div className="flex items-start gap-3">
                    {syncResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold mb-2">
                        {syncResult.success ? 'Sync Successful' : 'Sync Failed'}
                      </div>
                      {syncResult.success && (
                        <div className="text-sm space-y-1">
                          <div>Volumes synced: {syncResult.volumesSynced}</div>
                          <div>Issues synced: {syncResult.issuesSynced}</div>
                        </div>
                      )}
                      {syncResult.error && (
                        <div className="text-sm text-destructive">
                          {syncResult.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <p>
                This sync process fetches volume and issue data from ComicVine's API and stores it locally for fast searching.
              </p>
              <p>
                The sync is safe to run multiple times (it upserts existing data). It respects ComicVine's rate limits (1 request per second).
              </p>
              <p>
                Once synced, the scanner's manual search will use this local cache first, providing instant and accurate results for popular comics.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
