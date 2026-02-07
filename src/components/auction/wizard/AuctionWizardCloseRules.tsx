import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock, Clock, Shield } from "lucide-react";
import {
  AuctionCloseSchedule,
  CloseMode,
  STAGGER_OPTIONS,
} from "@/config/auctionEventTypes";

interface Props {
  schedule: AuctionCloseSchedule;
  onChange: (s: AuctionCloseSchedule) => void;
}

export function AuctionWizardCloseRules({ schedule, onChange }: Props) {
  const update = (partial: Partial<AuctionCloseSchedule>) =>
    onChange({ ...schedule, ...partial });

  // Convert ISO to datetime-local input value
  const scheduledLocal = schedule.scheduledAt
    ? new Date(schedule.scheduledAt).toISOString().slice(0, 16)
    : "";

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold">
          Step 2 — Close Rules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Close mode */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            Close Mode
          </Label>
          <Select
            value={schedule.mode}
            onValueChange={(v) => update({ mode: v as CloseMode })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hard_close">
                Hard close at specific time
              </SelectItem>
              <SelectItem value="rolling_close">
                Rolling close starting at
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            {schedule.mode === "hard_close"
              ? "All lots close relative to this timestamp. No extensions unless sniping is enabled."
              : "Lots begin closing at this time and end sequentially."}
          </p>
        </div>

        {/* Scheduled time */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            {schedule.mode === "hard_close" ? "Hard Close Time" : "Rolling Start Time"}
          </Label>
          <Input
            type="datetime-local"
            value={scheduledLocal}
            onChange={(e) =>
              update({
                scheduledAt: new Date(e.target.value).toISOString(),
              })
            }
          />
        </div>

        {/* Stagger */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Stagger Per Lot
          </Label>
          <Select
            value={String(schedule.staggerSecondsPerLot)}
            onValueChange={(v) =>
              update({
                staggerSecondsPerLot: Number(v) as 10 | 20 | 30 | 60,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGGER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Each lot closes this many seconds after the previous lot.
          </p>
        </div>

        {/* Sniping */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Allow Anti-Sniping Extension
            </Label>
            <Switch
              checked={schedule.snipingEnabled}
              onCheckedChange={(v) => update({ snipingEnabled: v })}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            When enabled, a bid placed in the final seconds extends the lot's closing time to give other bidders a fair chance to respond.
          </p>

          {schedule.snipingEnabled && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Extension Window (seconds)
                </Label>
                <Input
                  type="number"
                  min={30}
                  max={300}
                  value={schedule.extensionWindowSeconds}
                  onChange={(e) =>
                    update({ extensionWindowSeconds: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Max Extensions
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={schedule.extensionMaxCount}
                  onChange={(e) =>
                    update({ extensionMaxCount: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
