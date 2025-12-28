// Crowdfunding creator dashboard — post update modal
import { useState } from "react";
import { FileText, Package, Truck, Rocket, Image } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UpdateType = "launch" | "progress" | "preview" | "production" | "shipping";

interface PostUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { title: string; body: string; updateType?: UpdateType }) => Promise<void>;
  isSubmitting?: boolean;
}

const updateTypes: { value: UpdateType; label: string; icon: React.ReactNode }[] = [
  { value: "launch", label: "Launch Update", icon: <Rocket className="h-4 w-4" /> },
  { value: "progress", label: "Progress Update", icon: <FileText className="h-4 w-4" /> },
  { value: "preview", label: "Preview", icon: <Image className="h-4 w-4" /> },
  { value: "production", label: "Production Update", icon: <Package className="h-4 w-4" /> },
  { value: "shipping", label: "Shipping Update", icon: <Truck className="h-4 w-4" /> },
];

export function PostUpdateModal({ 
  open, 
  onOpenChange, 
  onSubmit,
  isSubmitting = false 
}: PostUpdateModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [updateType, setUpdateType] = useState<UpdateType | undefined>();

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    
    await onSubmit({ title: title.trim(), body: body.trim(), updateType });
    
    // Reset form
    setTitle("");
    setBody("");
    setUpdateType(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Post Update</DialogTitle>
          <DialogDescription>
            Keep your backers informed about campaign progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Update title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              placeholder="Share your update with backers..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              No minimum length required.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Update Type (optional)</Label>
            <Select 
              value={updateType} 
              onValueChange={(v) => setUpdateType(v as UpdateType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {updateTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      {type.icon}
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!title.trim() || !body.trim() || isSubmitting}
          >
            {isSubmitting ? "Posting..." : "Post Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
