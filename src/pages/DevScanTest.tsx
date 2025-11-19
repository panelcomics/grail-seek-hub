import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    try {
      const imageBase64 = await fileToBase64(file);
      
      const { data, error } = await supabase.functions.invoke('scan-item', {
        body: { imageBase64 }
      });

      setResponse({ data, error: error?.message });
    } catch (err) {
      setResponse({ error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 container py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>🔧 Dev Test Harness - scan-item Edge Function</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload Test Image:</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>

            <Button 
              onClick={handleTest}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Testing..." : "Test Edge Function"}
            </Button>

            {response && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Raw Response:</label>
                <pre className="bg-muted p-4 rounded-md overflow-auto max-h-96 text-xs">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
      </Card>
    </main>
  );
}
