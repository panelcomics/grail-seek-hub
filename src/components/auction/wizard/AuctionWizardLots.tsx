import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Clock } from "lucide-react";
import { MockLot, AuctionCloseSchedule } from "@/config/auctionEventTypes";
import { formatCloseTime } from "@/config/auctionConfig";

interface Props {
  lots: MockLot[];
  onChange: (lots: MockLot[]) => void;
  closeSchedule: AuctionCloseSchedule;
}

export function AuctionWizardLots({ lots, onChange, closeSchedule }: Props) {
  const [title, setTitle] = useState("");
  const [issue, setIssue] = useState("");
  const [grade, setGrade] = useState("9.4");
  const [startingBid, setStartingBid] = useState("9.99");

  const addLot = () => {
    if (!title.trim()) return;
    const newLot: MockLot = {
      id: `mock-lot-${Date.now()}`,
      title: title.trim(),
      issue: issue.trim(),
      imageUrl: "/placeholder.svg",
      grade,
      startingBid: parseFloat(startingBid) || 9.99,
    };
    onChange([...lots, newLot]);
    setTitle("");
    setIssue("");
  };

  const removeLot = (id: string) => {
    onChange(lots.filter((l) => l.id !== id));
  };

  const computeLotCloseTime = (index: number): Date => {
    const anchor = new Date(closeSchedule.scheduledAt).getTime();
    const offset = index * closeSchedule.staggerSecondsPerLot * 1000;
    return new Date(anchor + offset);
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold">
          Step 3 — Lots (Preview)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Add lot form */}
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/40">
          <p className="text-xs font-semibold text-foreground">Add Mock Lot</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input
                placeholder="Amazing Spider-Man"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Issue</Label>
              <Input
                placeholder="#300"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Grade</Label>
              <Input
                placeholder="9.4"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Starting Bid ($)</Label>
              <Input
                type="number"
                placeholder="9.99"
                value={startingBid}
                onChange={(e) => setStartingBid(e.target.value)}
              />
            </div>
          </div>
          <Button size="sm" onClick={addLot} disabled={!title.trim()} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Add Lot
          </Button>
        </div>

        {/* Ending order preview */}
        {lots.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Ending Order Preview
            </div>
            <div className="space-y-1.5">
              {lots.map((lot, i) => {
                const closeTime = computeLotCloseTime(i);
                return (
                  <div
                    key={lot.id}
                    className="flex items-center gap-3 p-2 rounded-md bg-muted/20 border border-border/30"
                  >
                    <span className="text-[10px] text-muted-foreground font-bold w-8">
                      #{i + 1}
                    </span>
                    <div className="w-8 h-11 rounded bg-muted overflow-hidden flex-shrink-0">
                      <img
                        src={lot.imageUrl}
                        alt={lot.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground line-clamp-1">
                        {lot.title} {lot.issue}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {lot.grade} • ${lot.startingBid}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      Ends: {formatCloseTime(closeTime)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeLot(lot.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {lots.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Add lots above to see the ending order preview.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
