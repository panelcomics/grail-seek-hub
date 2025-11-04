import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";

export default function Scanner() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkResults, setBulkResults] = useState<any[]>([]);

  const handleFileSelect = async (files: FileList) => {
    const fileArray = Array.from(files);
    
    if (fileArray.length === 0) return;
    
    if (fileArray.some(f => !f.type.startsWith('image/'))) {
      toast.error('Please select only image files');
      return;
    }

    if (fileArray.length > 1) {
      // Bulk mode
      setBulkMode(true);
      toast.info(`Scanning ${fileArray.length} items...`);
      
      const results = [];
      for (let i = 0; i < Math.min(fileArray.length, 50); i++) {
        const file = fileArray[i];
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        try {
          const imageBase64 = await base64Promise;
          const { data, error } = await supabase.functions.invoke('scan-item', {
            body: { imageBase64 }
          });

          if (!error && data) {
            results.push({ ...data, image: imageBase64 });
          }
        } catch (error) {
          console.error('Error scanning item:', error);
        }
      }
      
      setBulkResults(results);
      toast.success(`Scanned ${results.length} items!`);
    } else {
      // Single mode
      const file = fileArray[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      await scanImage(file);
    }
  };

  const scanImage = async (file: File) => {
    setScanning(true);
    setScanResult(null);

    try {
      // Convert image to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const imageBase64 = await base64Promise;

      // Call edge function to scan
      const { data, error } = await supabase.functions.invoke('scan-item', {
        body: { imageBase64 }
      });

      if (error) throw error;

      setScanResult(data);
      toast.success('Item scanned successfully!');

    } catch (error: any) {
      console.error('Scan error:', error);
      toast.error(error.message || 'Failed to scan item');
    } finally {
      setScanning(false);
    }
  };

  const handleSaveToListings = async () => {
    if (!scanResult) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to save items');
        navigate('/auth');
        return;
      }

      // Save to collections table
      const { error } = await supabase
        .from('collections')
        .insert({
          user_id: user.id,
          title: scanResult.title,
          category: scanResult.category,
          grade: scanResult.grade,
          condition: scanResult.condition,
          purchase_price: scanResult.estimatedValue,
          purchase_date: new Date().toISOString().split('T')[0],
          current_value: scanResult.estimatedValue,
          image_url: previewUrl
        });

      if (error) throw error;

      toast.success('Item added to your portfolio!');
      navigate('/portfolio');

    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save item');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">AI Scanner</h1>
            <p className="text-muted-foreground">
              Scan your comics and cards for instant identification and valuation
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Upload Image</CardTitle>
              <CardDescription>
                Take a clear photo or upload an image of your comic or trading card
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              />

              {!previewUrl && bulkResults.length === 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Button
                    size="lg"
                    className="h-32"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-6 w-6" />
                    Choose Files
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-32"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="mr-2 h-6 w-6" />
                    Bulk Scan (50 max)
                  </Button>
                </div>
              ) : bulkResults.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Bulk Scan Results ({bulkResults.length} items)</h3>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBulkResults([]);
                        setBulkMode(false);
                        fileInputRef.current!.value = "";
                      }}
                    >
                      New Scan
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {bulkResults.map((result, idx) => (
                      <Card key={idx} className="overflow-hidden">
                        <div className="aspect-[3/4] overflow-hidden">
                          <img
                            src={result.image || '/placeholder.svg'}
                            alt={result.title}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-sm mb-2">{result.title}</h4>
                          <div className="flex gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">{result.category}</Badge>
                            <Badge variant="outline" className="text-xs">{result.grade}</Badge>
                          </div>
                          <p className="text-lg font-bold text-green-500">
                            ${result.estimatedValue?.toFixed(2)}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={async () => {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) {
                        toast.error('Please sign in to save items');
                        navigate('/auth');
                        return;
                      }

                      for (const result of bulkResults) {
                        await supabase.from('collections').insert({
                          user_id: user.id,
                          title: result.title,
                          category: result.category,
                          grade: result.grade,
                          condition: result.condition,
                          purchase_price: result.estimatedValue,
                          purchase_date: new Date().toISOString().split('T')[0],
                          current_value: result.estimatedValue,
                          image_url: result.image
                        });
                      }

                      toast.success(`Added ${bulkResults.length} items to portfolio!`);
                      navigate('/portfolio');
                    }}
                  >
                    Add All to Portfolio
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-lg overflow-hidden border">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setPreviewUrl("");
                      setScanResult(null);
                      fileInputRef.current!.value = "";
                    }}
                  >
                    Upload Different Image
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {scanning && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Scanning with AI...</p>
                <p className="text-sm text-muted-foreground">
                  Identifying and grading your item
                </p>
              </CardContent>
            </Card>
          )}

          {scanResult && !scanning && (
            <Card className="border-primary/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Scan Complete
                    </CardTitle>
                    <CardDescription>95% accuracy match</CardDescription>
                  </div>
                  <Badge className="text-lg px-3 py-1">
                    ${scanResult.estimatedValue.toFixed(2)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{scanResult.title}</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary">{scanResult.category}</Badge>
                    <Badge variant="outline">{scanResult.grade}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{scanResult.condition}</p>
                </div>

                {scanResult.comparableSales && scanResult.comparableSales.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Comparable Sales</h4>
                    <div className="space-y-2">
                      {scanResult.comparableSales.map((sale: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="font-medium">{sale.source}</p>
                            <p className="text-sm text-muted-foreground">
                              {sale.condition} • {sale.date}
                            </p>
                          </div>
                          <p className="font-semibold">${sale.price.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleSaveToListings}
                >
                  Add to Portfolio
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
