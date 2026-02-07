import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Bell, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AuctionReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auctionId: string;
  auctionTitle: string;
}

type ReminderOption = "1hour" | "15min" | "5min";

const REMINDER_OPTIONS: { key: ReminderOption; label: string }[] = [
  { key: "1hour", label: "1 hour before" },
  { key: "15min", label: "15 minutes before" },
  { key: "5min", label: "5 minutes before" },
];

function getStorageKey(auctionId: string, userId?: string): string {
  const prefix = userId ?? "anon";
  return `auction-reminder-${prefix}-${auctionId}`;
}

function loadReminders(auctionId: string, userId?: string): ReminderOption[] {
  try {
    const raw = localStorage.getItem(getStorageKey(auctionId, userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveReminders(auctionId: string, reminders: ReminderOption[], userId?: string) {
  localStorage.setItem(getStorageKey(auctionId, userId), JSON.stringify(reminders));
}

export function AuctionReminderModal({
  open,
  onOpenChange,
  auctionId,
  auctionTitle,
}: AuctionReminderModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ReminderOption[]>([]);

  useEffect(() => {
    if (open) {
      setSelected(loadReminders(auctionId, user?.id));
    }
  }, [open, auctionId, user?.id]);

  const toggle = (key: ReminderOption) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = () => {
    saveReminders(auctionId, selected, user?.id);
    onOpenChange(false);
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Sign In Required
            </DialogTitle>
            <DialogDescription>
              Please sign in to set auction reminders.
            </DialogDescription>
          </DialogHeader>
          <Button className="w-full gap-2" onClick={() => navigate("/auth")}>
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Remind Me
          </DialogTitle>
          <DialogDescription className="text-xs">
            Get notified before <span className="font-medium">{auctionTitle}</span> ends.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {REMINDER_OPTIONS.map((opt) => (
            <div key={opt.key} className="flex items-center gap-2">
              <Checkbox
                id={opt.key}
                checked={selected.includes(opt.key)}
                onCheckedChange={() => toggle(opt.key)}
              />
              <Label htmlFor={opt.key} className="text-sm cursor-pointer">
                {opt.label}
              </Label>
            </div>
          ))}
        </div>

        {/* Disabled option */}
        <div className="pt-2 border-t border-border/40">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 opacity-50">
                  <Checkbox disabled />
                  <Label className="text-sm text-muted-foreground">
                    Also remind me when similar keys are ending
                  </Label>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Coming soon — not available in preview mode.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Button onClick={handleSave} className="w-full mt-2" size="sm">
          Save Reminders
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Retrieve all auction reminders from localStorage for admin preview.
 */
export function getAllReminders(): {
  auctionId: string;
  userId: string;
  reminders: ReminderOption[];
}[] {
  const results: { auctionId: string; userId: string; reminders: ReminderOption[] }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("auction-reminder-")) {
      const parts = key.replace("auction-reminder-", "").split("-");
      // format: userId-auctionId parts
      const userId = parts[0] ?? "anon";
      const auctionId = parts.slice(1).join("-");
      try {
        const reminders = JSON.parse(localStorage.getItem(key) || "[]");
        if (reminders.length > 0) {
          results.push({ auctionId, userId, reminders });
        }
      } catch {
        // skip
      }
    }
  }
  return results;
}
