import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function DevScanTest() {
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleTest() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setLoading(true);
    const startTime = Date.now();
    try {
      const imageBase64 = await fileToBase64(file);
      
      const { data, error } = await supabase.functions.invoke('scan-item', {
        body: { imageBase64 }
      });

      const elapsed = Date.now() - startTime;
      setResponse({ data, error: error?.message, elapsed });
    } catch (err) {
      setResponse({ error: String(err), elapsed: Date.now() - startTime });
    } finally {
      setLoading(false);
    }
  }

  const result = response?.data;
  const topMatch = result?.topMatches?.[0];

  return (
    <main className="flex-1 container py-8 space-y-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>🔧 Scanner Test Harness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Upload Comic Cover:</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          <Button onClick={handleTest} disabled={loading} className="w-full">
            {loading ? "Scanning..." : "Test Scan"}
          </Button>
        </CardContent>
      </Card>

      {response && (
        <>
          {/* Quick Stats */}
          <Card className="max-w-4xl mx-auto">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">⏱️ {response.elapsed}ms</Badge>
                {result?.confidence !== undefined && (
                  <Badge variant={result.confidence >= 80 ? "default" : result.confidence >= 60 ? "secondary" : "destructive"}>
                    🎯 {result.confidence}% confidence
                  </Badge>
                )}
                {result?.strategy && <Badge variant="outline">📊 {result.strategy}</Badge>}
                {result?.requestId && <Badge variant="outline">🔗 {result.requestId.slice(0,8)}</Badge>}
                {result?.topMatches && <Badge variant="outline">📚 {result.topMatches.length} matches</Badge>}
              </div>
            </CardContent>
          </Card>

          {/* Top Match */}
          {topMatch && (
            <Card className="max-w-4xl mx-auto border-green-500/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-green-600">🏆 Top Match</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4">
                {topMatch.imageUrl && (
                  <img src={topMatch.imageUrl} alt="cover" className="w-24 h-32 object-cover rounded" />
                )}
                <div className="space-y-1 text-sm">
                  <div className="font-bold text-lg">{topMatch.series} #{topMatch.issue}</div>
                  {topMatch.year && <div className="text-muted-foreground">Year: {topMatch.year}</div>}
                  {topMatch.publisher && <div className="text-muted-foreground">Publisher: {topMatch.publisher}</div>}
                  <div className="pt-2 flex gap-2">
                    <Badge>Score: {topMatch.confidence}</Badge>
                    {topMatch.hasExactYear && <Badge variant="outline">Year ✓</Badge>}
                    {topMatch.hasExactIssue && <Badge variant="outline">Issue ✓</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Matches */}
          {result?.topMatches?.length > 1 && (
            <Card className="max-w-4xl mx-auto">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">All Candidates ({result.topMatches.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.topMatches.map((m: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                      <span>{m.series} #{m.issue} {m.year ? `(${m.year})` : ''}</span>
                      <Badge variant={i === 0 ? "default" : "outline"}>{m.confidence}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Parsed Query */}
          {result?.parsedQuery && (
            <Card className="max-w-4xl mx-auto">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Parsed Query</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div><strong>Title:</strong> {result.parsedQuery.title || '—'}</div>
                <div><strong>Issue:</strong> {result.parsedQuery.issue || '—'}</div>
                <div><strong>Year:</strong> {result.parsedQuery.year || '—'}</div>
                <div><strong>Publisher:</strong> {result.parsedQuery.publisher || '—'}</div>
              </CardContent>
            </Card>
          )}

          {/* Raw Response */}
          <Card className="max-w-4xl mx-auto">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Raw Response</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md overflow-auto max-h-64 text-xs">
                {JSON.stringify(response, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
