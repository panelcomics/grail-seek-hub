import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AuctionViewFilter = "events" | "weekly" | "featured";

interface AuctionFilterDropdownProps {
  value: AuctionViewFilter;
  onChange: (value: AuctionViewFilter) => void;
}

const FILTER_OPTIONS: { value: AuctionViewFilter; label: string }[] = [
  { value: "events", label: "Auction Events" },
  { value: "weekly", label: "Weekly Auctions" },
  { value: "featured", label: "Featured Auctions" },
];

export function AuctionFilterDropdown({ value, onChange }: AuctionFilterDropdownProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">View</span>
      <Select value={value} onValueChange={(v) => onChange(v as AuctionViewFilter)}>
        <SelectTrigger className="w-[180px] h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FILTER_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
