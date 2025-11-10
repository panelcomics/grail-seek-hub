import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ShippingTier {
  id: string;
  tier_name: string;
  cost: number;
  min_items: number;
  max_items: number;
  country: string;
}

export const ShippingPresets = () => {
  const { user } = useAuth();
  const [tiers, setTiers] = useState<ShippingTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<ShippingTier | null>(null);
  
  const [formData, setFormData] = useState({
    tier_name: "",
    cost: "",
    min_items: "1",
    max_items: "15",
    country: "US",
  });

  useEffect(() => {
    if (user) {
      fetchTiers();
    }
  }, [user]);

  const fetchTiers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("shipping_tiers")
        .select("*")
        .eq("seller_id", user?.id)
        .order("min_items", { ascending: true });

      if (error) throw error;
      setTiers(data || []);
    } catch (error) {
      console.error("Error fetching shipping tiers:", error);
      toast.error("Failed to load shipping tiers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tier_name || !formData.cost || !formData.min_items || !formData.max_items) {
      toast.error("Please fill in all fields");
      return;
    }

    if (parseInt(formData.max_items) < parseInt(formData.min_items)) {
      toast.error("Max items must be greater than or equal to min items");
      return;
    }

    try {
      const tierData = {
        seller_id: user?.id,
        tier_name: formData.tier_name,
        cost: parseFloat(formData.cost),
        min_items: parseInt(formData.min_items),
        max_items: parseInt(formData.max_items),
        country: formData.country,
      };

      if (editingTier) {
        const { error } = await supabase
          .from("shipping_tiers")
          .update(tierData)
          .eq("id", editingTier.id);

        if (error) throw error;
        toast.success("Shipping tier updated!");
      } else {
        const { error } = await supabase
          .from("shipping_tiers")
          .insert(tierData);

        if (error) throw error;
        toast.success("Shipping tier created!");
      }

      setIsDialogOpen(false);
      setEditingTier(null);
      setFormData({
        tier_name: "",
        cost: "",
        min_items: "1",
        max_items: "15",
        country: "US",
      });
      fetchTiers();
    } catch (error) {
      console.error("Error saving shipping tier:", error);
      toast.error("Failed to save shipping tier");
    }
  };

  const handleEdit = (tier: ShippingTier) => {
    setEditingTier(tier);
    setFormData({
      tier_name: tier.tier_name,
      cost: tier.cost.toString(),
      min_items: tier.min_items.toString(),
      max_items: tier.max_items.toString(),
      country: tier.country,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shipping tier?")) return;

    try {
      const { error } = await supabase
        .from("shipping_tiers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Shipping tier deleted!");
      fetchTiers();
    } catch (error) {
      console.error("Error deleting shipping tier:", error);
      toast.error("Failed to delete shipping tier");
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTier(null);
    setFormData({
      tier_name: "",
      cost: "",
      min_items: "1",
      max_items: "15",
      country: "US",
    });
  };

  if (isLoading) {
    return <p className="text-center text-muted-foreground py-8">Loading shipping tiers...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Shipping Presets</h2>
          <p className="text-muted-foreground">Manage your shipping tiers for claim sales</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingTier(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTier ? "Edit" : "Add"} Shipping Tier</DialogTitle>
              <DialogDescription>
                Create preset shipping costs for your claim sales
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tier_name">Tier Name *</Label>
                <Input
                  id="tier_name"
                  value={formData.tier_name}
                  onChange={(e) => setFormData({ ...formData, tier_name: e.target.value })}
                  placeholder="e.g., 1-15 books"
                  required
                />
              </div>

              <div>
                <Label htmlFor="cost">Cost ($) *</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="12.00"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_items">Min Items *</Label>
                  <Input
                    id="min_items"
                    type="number"
                    min="1"
                    value={formData.min_items}
                    onChange={(e) => setFormData({ ...formData, min_items: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="max_items">Max Items *</Label>
                  <Input
                    id="max_items"
                    type="number"
                    min="1"
                    value={formData.max_items}
                    onChange={(e) => setFormData({ ...formData, max_items: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="US"
                />
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleDialogClose} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingTier ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {tiers.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No shipping tiers yet. Add one to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tiers.map((tier) => (
            <Card key={tier.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{tier.tier_name}</CardTitle>
                    <CardDescription>
                      {tier.min_items}-{tier.max_items} items • {tier.country}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(tier)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(tier.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">${tier.cost.toFixed(2)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
