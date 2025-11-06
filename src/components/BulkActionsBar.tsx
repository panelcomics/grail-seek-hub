import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Trash2, Tag, MapPin, DollarSign } from "lucide-react";

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export function BulkActionsBar({ selectedIds, onClearSelection, onActionComplete }: BulkActionsBarProps) {
  const [action, setAction] = useState<string>("");
  const [containers, setContainers] = useState<{ id: string; name: string }[]>([]);
  const [newLocation, setNewLocation] = useState("");
  const [newPrice, setNewPrice] = useState("");

  useEffect(() => {
    fetchContainers();
  }, []);

  const fetchContainers = async () => {
    const { data } = await supabase
      .from("storage_containers")
      .select("id, name")
      .order("name");
    setContainers(data || []);
  };

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) {
      toast.error("No items selected");
      return;
    }

    try {
      let updateData: any = {};

      switch (action) {
        case "delete":
          if (!confirm(`Delete ${selectedIds.length} items?`)) return;
          const { error: deleteError } = await supabase
            .from("inventory_items")
            .delete()
            .in("id", selectedIds);
          if (deleteError) throw deleteError;
          toast.success(`Deleted ${selectedIds.length} items`);
          break;

        case "mark_listed":
          updateData = { listing_status: "listed" };
          break;

        case "mark_not_listed":
          updateData = { listing_status: "not_listed" };
          break;

        case "update_location":
          if (!newLocation.trim()) {
            toast.error("Enter a location");
            return;
          }
          updateData = { private_location: newLocation };
          break;

        case "move_to_container":
          const containerId = newLocation;
          if (!containerId) {
            toast.error("Select a container");
            return;
          }
          updateData = { storage_container_id: containerId };
          break;

        case "update_price":
          const price = parseFloat(newPrice);
          if (isNaN(price) || price <= 0) {
            toast.error("Enter a valid price");
            return;
          }
          updateData = { listed_price: price };
          break;

        default:
          toast.error("Select an action");
          return;
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from("inventory_items")
          .update(updateData)
          .in("id", selectedIds);

        if (error) throw error;
        toast.success(`Updated ${selectedIds.length} items`);
      }

      onActionComplete();
      onClearSelection();
      setAction("");
      setNewLocation("");
      setNewPrice("");
    } catch (error) {
      console.error("Bulk action error:", error);
      toast.error("Failed to perform bulk action");
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-4 z-50">
      <div className="container flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">{selectedIds.length} selected</span>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select action..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mark_listed">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Mark as Listed
              </div>
            </SelectItem>
            <SelectItem value="mark_not_listed">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Mark as Not Listed
              </div>
            </SelectItem>
            <SelectItem value="update_location">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Update Location
              </div>
            </SelectItem>
            <SelectItem value="move_to_container">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Move to Container
              </div>
            </SelectItem>
            <SelectItem value="update_price">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Set Price
              </div>
            </SelectItem>
            <SelectItem value="delete">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Delete
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {action === "update_location" && (
          <Input
            placeholder="Enter location..."
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            className="w-[200px]"
          />
        )}

        {action === "move_to_container" && (
          <Select value={newLocation} onValueChange={setNewLocation}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select container..." />
            </SelectTrigger>
            <SelectContent>
              {containers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {action === "update_price" && (
          <Input
            type="number"
            step="0.01"
            placeholder="Price..."
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="w-[120px]"
          />
        )}

        <Button onClick={handleBulkAction} className="ml-auto">
          Apply
        </Button>
      </div>
    </div>
  );
}
