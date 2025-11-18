import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Database, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ComicVineSync() {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [stats, setStats] = useState<{ volumes: number; issues: number } | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { toast } = useToast();

  // Environment info for debugging
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const fetchStats = async () => {
    try {
      const { count: volumeCount } = await supabase
        .from('comicvine_volumes')
        .select('*', { count: 'exact', head: true });
      
      const { count: issueCount } = await supabase
        .from('comicvine_issues')
        .select('*', { count: 'exact', head: true });

      // Get last sync timestamp
      const { data: lastSyncData } = await supabase
        .from('comicvine_volumes')
        .select('last_synced_at')
        .order('last_synced_at', { ascending: false })
        .limit(1)
        .single();

      setStats({
        volumes: volumeCount || 0,
        issues: issueCount || 0,
      });
      
      if (lastSyncData?.last_synced_at) {
        setLastSync(lastSyncData.last_synced_at);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      console.log('[UI] Invoking sync-comicvine-cache function...');
      const { data, error } = await supabase.functions.invoke('sync-comicvine-cache', {
        body: { limit: 5 }, // Start with just 5 volumes to test
      });

      console.log('[UI] Function response:', { data, error });

      // Capture full response for debugging
      const fullResponse = {
        data,
        error,
        timestamp: new Date().toISOString()
      };

      if (error) {
        console.error('[UI] Function error:', error);
        // Display full error in UI
        setSyncResult({ 
          success: false, 
          errorMessage: error.message || "Unknown error occurred",
          errorName: error.name || "UnknownError",
          errorObject: JSON.stringify(error, null, 2),
          fullResponse: JSON.stringify(fullResponse, null, 2)
        });
        toast({
          variant: "destructive",
          title: "Sync Failed",
          description: error.message || "Check error details below",
        });
        return;
      }

      if (!data || !data.success) {
        console.error('[UI] Sync unsuccessful:', data);
        setSyncResult({ 
          success: false, 
          errorMessage: data?.error || "Sync returned unsuccessful status",
          errorObject: JSON.stringify(data, null, 2),
          fullResponse: JSON.stringify(fullResponse, null, 2)
        });
        toast({
          variant: "destructive",
          title: "Sync Failed",
          description: data?.error || "Check error details below",
        });
        return;
      }

      console.log('[UI] Sync successful:', data);
      setSyncResult(data);
      toast({
        title: "Sync Complete",
        description: `Synced ${data.volumesSynced} volumes and ${data.issuesSynced} issues`,
      });
      
      // Refresh stats
      await fetchStats();
    } catch (error: any) {
      console.error('[UI] Unexpected error:', error);
      // Catch any unexpected errors and display full details
      setSyncResult({ 
        success: false, 
        errorMessage: error.message || "Unexpected error occurred",
        errorName: error.name || "UnknownError",
        errorObject: JSON.stringify(error, null, 2),
        errorStack: error.stack,
        fullError: JSON.stringify({
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...error
        }, null, 2)
      });
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message || "Check error details below",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Load stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  if (adminLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You must be an administrator to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

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
            <CardContent className="space-y-4">
              {lastSync && (
                <div className="text-sm text-muted-foreground border-b pb-3">
                  <strong>Last successful sync:</strong> {new Date(lastSync).toLocaleString()}
                </div>
              )}
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
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold mb-3 text-lg">
                        {syncResult.success ? 'Sync Successful' : 'Sync Failed'}
                      </div>
                      
                      {syncResult.success && (
                        <div className="text-sm space-y-1">
                          <div>Volumes synced: <span className="font-bold">{syncResult.volumesSynced}</span></div>
                          <div>Issues synced: <span className="font-bold">{syncResult.issuesSynced}</span></div>
                        </div>
                      )}
                      
                      {!syncResult.success && (
                        <div className="space-y-3">
                          {syncResult.errorName && (
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-destructive">Error Type:</div>
                              <div className="text-sm p-3 bg-background rounded border border-destructive/20">
                                {syncResult.errorName}
                              </div>
                            </div>
                          )}
                          {syncResult.errorMessage && (
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-destructive">Error Message:</div>
                              <div className="text-sm p-3 bg-background rounded border border-destructive/20">
                                {syncResult.errorMessage}
                              </div>
                            </div>
                          )}
                          
                          {syncResult.errorObject && (
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-destructive">Error Object:</div>
                              <pre className="text-xs bg-background p-3 rounded border border-destructive/20 overflow-auto max-h-60 whitespace-pre-wrap break-words">
                                {syncResult.errorObject}
                              </pre>
                            </div>
                          )}
                          
                          {syncResult.fullResponse && (
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-destructive">Full Response:</div>
                              <pre className="text-xs bg-background p-3 rounded border border-destructive/20 overflow-auto max-h-60 whitespace-pre-wrap break-words">
                                {syncResult.fullResponse}
                              </pre>
                            </div>
                          )}
                          
                          {syncResult.fullError && (
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-destructive">Full Error Details:</div>
                              <pre className="text-xs bg-background p-3 rounded border border-destructive/20 overflow-auto max-h-60 whitespace-pre-wrap break-words">
                                {syncResult.fullError}
                              </pre>
                            </div>
                          )}
                          
                          {syncResult.errorStack && (
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-destructive">Stack Trace:</div>
                              <pre className="text-xs bg-background p-3 rounded border border-destructive/20 overflow-auto max-h-40 whitespace-pre-wrap break-words">
                                {syncResult.errorStack}
                              </pre>
                            </div>
                          )}
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
              <CardTitle>Environment & Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
                  <span className="font-semibold">Supabase URL:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded break-all">{supabaseUrl}</code>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
                  <span className="font-semibold">Project ID:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded break-all">{supabaseProjectId}</code>
                </div>
              </div>
              <div className="pt-3 border-t text-sm text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">How It Works:</p>
                <p>
                  This sync process fetches volume and issue data from ComicVine's API and stores it locally for fast searching.
                </p>
                <p>
                  The sync is safe to run multiple times (it upserts existing data). It respects ComicVine's rate limits (1 request per second).
                </p>
                <p>
                  Once synced, the scanner's manual search will use this local cache first, providing instant and accurate results for popular comics.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
