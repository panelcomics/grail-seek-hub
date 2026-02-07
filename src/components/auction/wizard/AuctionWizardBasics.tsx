import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuctionEventType } from "@/config/auctionEventTypes";

interface Props {
  name: string;
  onNameChange: (v: string) => void;
  type: AuctionEventType;
  onTypeChange: (v: AuctionEventType) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  coverImageUrl: string;
  onCoverImageUrlChange: (v: string) => void;
}

export function AuctionWizardBasics({
  name,
  onNameChange,
  type,
  onTypeChange,
  description,
  onDescriptionChange,
  coverImageUrl,
  onCoverImageUrlChange,
}: Props) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold">
          Step 1 — Basics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="event-name" className="text-sm font-medium">
            Event Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="event-name"
            placeholder="e.g. Friday Night Grails"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Event Type</Label>
          <Select
            value={type}
            onValueChange={(v) => onTypeChange(v as AuctionEventType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="event">Event</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="event-desc" className="text-sm font-medium">
            Description (optional)
          </Label>
          <Textarea
            id="event-desc"
            placeholder="Brief description of this auction event"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cover-url" className="text-sm font-medium">
            Cover Image URL (optional)
          </Label>
          <Input
            id="cover-url"
            placeholder="https://..."
            value={coverImageUrl}
            onChange={(e) => onCoverImageUrlChange(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Preview only — image upload will be available later.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
