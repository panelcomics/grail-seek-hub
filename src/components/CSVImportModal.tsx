import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle, XCircle } from "lucide-react";
import { parseInventoryCSV } from "@/lib/csvUtils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface CSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

type DuplicateStrategy = 'skip' | 'update' | 'create';

interface ImportPreviewItem {
  item: any;
  isDuplicate: boolean;
  existingId?: string;
  strategy: DuplicateStrategy;
}

export function CSVImportModal({ open, onOpenChange, onImportComplete }: CSVImportModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewItem[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('skip');

  const handleFileSelect = async (file: File) => {
    if (!user) return;

    setLoading(true);
    try {
      const text = await file.text();
      const { items } = parseInventoryCSV(text);

      if (items.length === 0) {
        toast.error("No valid items found in CSV");
        return;
      }

      // Check for duplicates
      const previewItems: ImportPreviewItem[] = [];
      for (const item of items) {
        const { data: existing } = await supabase
          .from('inventory_items')
          .select('id')
          .eq('user_id', user.id)
          .eq('title', item.title || '')
          .eq('issue_number', item.issue_number || '')
          .maybeSingle();

        previewItems.push({
          item,
          isDuplicate: !!existing,
          existingId: existing?.id,
          strategy: duplicateStrategy,
        });
      }

      setPreview(previewItems);
      toast.success(`Loaded ${items.length} items from CSV`);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error("Failed to parse CSV file");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!user || preview.length === 0) return;

    setLoading(true);
    let created = 0;
    let updated = 0;
    let skipped = 0;

    try {
      for (const previewItem of preview) {
        const strategy = previewItem.strategy;

        if (previewItem.isDuplicate) {
          if (strategy === 'skip') {
            skipped++;
            continue;
          } else if (strategy === 'update' && previewItem.existingId) {
            await supabase
              .from('inventory_items')
              .update({
                grade: previewItem.item.grade || null,
                private_location: previewItem.item.private_location || null,
                private_notes: previewItem.item.private_notes || null,
              })
              .eq('id', previewItem.existingId);
            updated++;
            continue;
          }
        }

        // Create new item
        await supabase.from('inventory_items').insert({
          user_id: user.id,
          title: previewItem.item.title,
          issue_number: previewItem.item.issue_number || null,
          grade: previewItem.item.grade || null,
          private_location: previewItem.item.private_location || null,
          private_notes: previewItem.item.private_notes || null,
          comicvine_issue_id: previewItem.item.comicvine_issue_id || null,
        });
        created++;
      }

      toast.success(`Import complete! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
      onImportComplete();
      onOpenChange(false);
      setPreview([]);
    } catch (error) {
      console.error('Error importing:', error);
      toast.error("Import failed");
    } finally {
      setLoading(false);
    }
  };

  const updateStrategy = (newStrategy: DuplicateStrategy) => {
    setDuplicateStrategy(newStrategy);
    setPreview(preview.map(item => ({ ...item, strategy: newStrategy })));
  };

  const duplicateCount = preview.filter(p => p.isDuplicate).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Inventory from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: title, issue_number, grade, private_location, private_notes
          </DialogDescription>
        </DialogHeader>

        {preview.length === 0 ? (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full gap-2"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Choose CSV File
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {preview.length} items loaded, {duplicateCount} duplicates found
              </div>
            </div>

            {duplicateCount > 0 && (
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-3 block">
                  How to handle duplicates?
                </Label>
                <RadioGroup value={duplicateStrategy} onValueChange={(v) => updateStrategy(v as DuplicateStrategy)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="skip" id="skip" />
                    <Label htmlFor="skip" className="cursor-pointer">
                      Skip duplicates (keep existing)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="update" id="update" />
                    <Label htmlFor="update" className="cursor-pointer">
                      Update duplicates (merge location & notes)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="create" id="create" />
                    <Label htmlFor="create" className="cursor-pointer">
                      Create new entries (allow duplicates)
                    </Label>
                  </div>
                </RadioGroup>
              </Card>
            )}

            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {preview.slice(0, 20).map((item, idx) => (
                <Card key={idx} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {item.item.title}
                        {item.item.issue_number && ` #${item.item.issue_number}`}
                      </div>
                      {item.item.private_location && (
                        <div className="text-xs text-muted-foreground">
                          Location: {item.item.private_location}
                        </div>
                      )}
                    </div>
                    {item.isDuplicate ? (
                      <Badge variant="outline" className="gap-1 flex-shrink-0">
                        <XCircle className="h-3 w-3" />
                        Duplicate
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 flex-shrink-0">
                        <CheckCircle className="h-3 w-3" />
                        New
                      </Badge>
                    )}
                  </div>
                </Card>
              ))}
              {preview.length > 20 && (
                <div className="text-sm text-muted-foreground text-center py-2">
                  ... and {preview.length - 20} more items
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => {
            onOpenChange(false);
            setPreview([]);
          }} disabled={loading}>
            Cancel
          </Button>
          {preview.length > 0 && (
            <Button onClick={handleImport} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {preview.length} Items
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
