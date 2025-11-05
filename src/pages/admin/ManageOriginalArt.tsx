import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Edit, Trash2, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface OriginalArt {
  id: string;
  created_at: string;
  updated_at: string;
  image_url: string;
  title: string;
  artist_name: string;
  description: string | null;
  date_created: string | null;
  medium: string | null;
  dimensions: string | null;
  tags: string[] | null;
  for_sale: boolean;
  price: number | null;
  provenance: string | null;
  visibility: string;
}

const ManageOriginalArt = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<OriginalArt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<OriginalArt | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const url = new URL(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-original-art`
      );
      if (search) url.searchParams.append("search", search);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }

      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast({
        title: "Error",
        description: "Failed to load original art items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [search]);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-original-art/${deleteId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }

      toast({
        title: "Success",
        description: "Original art deleted successfully",
      });

      setItems(items.filter((item) => item.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete art item",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!editItem) return;

    if (editItem.for_sale && !editItem.price) {
      toast({
        title: "Validation Error",
        description: "Price is required when item is for sale",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-original-art/${editItem.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: editItem.title,
            artist_name: editItem.artist_name,
            description: editItem.description,
            date_created: editItem.date_created,
            medium: editItem.medium,
            dimensions: editItem.dimensions,
            tags: editItem.tags,
            for_sale: editItem.for_sale,
            price: editItem.price,
            provenance: editItem.provenance,
            visibility: editItem.visibility,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update item");
      }

      const updated = await response.json();
      setItems(items.map((item) => (item.id === updated.id ? updated : item)));
      setEditItem(null);

      toast({
        title: "Success",
        description: "Original art updated successfully",
      });
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: "Failed to update art item",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Manage Original Art</CardTitle>
            <Button onClick={() => navigate("/admin/original-art/upload")}>
              <Plus className="mr-2 h-4 w-4" />
              Upload New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or artist..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No items found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>For Sale</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-12 w-12 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>{item.artist_name}</TableCell>
                    <TableCell>
                      <Badge variant={item.for_sale ? "default" : "secondary"}>
                        {item.for_sale ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.price ? `$${item.price}` : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={item.visibility === "public" ? "default" : "outline"}>
                        {item.visibility}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(item.updated_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditItem(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this original art item and its image.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Sheet */}
      <Sheet open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Original Art</SheetTitle>
          </SheetHeader>
          {editItem && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editItem.title}
                  onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Artist Name</Label>
                <Input
                  value={editItem.artist_name}
                  onChange={(e) => setEditItem({ ...editItem, artist_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editItem.description || ""}
                  onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Date Created</Label>
                <Input
                  type="date"
                  value={editItem.date_created || ""}
                  onChange={(e) => setEditItem({ ...editItem, date_created: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Medium</Label>
                <Input
                  value={editItem.medium || ""}
                  onChange={(e) => setEditItem({ ...editItem, medium: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Dimensions</Label>
                <Input
                  value={editItem.dimensions || ""}
                  onChange={(e) => setEditItem({ ...editItem, dimensions: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <Input
                  value={editItem.tags?.join(", ") || ""}
                  onChange={(e) =>
                    setEditItem({
                      ...editItem,
                      tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                    })
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={editItem.for_sale}
                  onCheckedChange={(checked) => setEditItem({ ...editItem, for_sale: checked })}
                />
                <Label>For Sale</Label>
              </div>

              {editItem.for_sale && (
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editItem.price || ""}
                    onChange={(e) =>
                      setEditItem({ ...editItem, price: parseFloat(e.target.value) })
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Provenance</Label>
                <Textarea
                  value={editItem.provenance || ""}
                  onChange={(e) => setEditItem({ ...editItem, provenance: e.target.value })}
                />
              </div>

              <Button onClick={handleUpdate} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ManageOriginalArt;
