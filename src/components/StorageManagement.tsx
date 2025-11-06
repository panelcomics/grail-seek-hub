import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, QrCode, Save, X } from "lucide-react";
import QRCode from "qrcode";

interface StorageContainer {
  id: string;
  name: string;
  description: string | null;
  qr_code_url: string | null;
  created_at: string;
}

export function StorageManagement() {
  const [containers, setContainers] = useState<StorageContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    fetchContainers();
  }, []);

  const fetchContainers = async () => {
    try {
      const { data, error } = await supabase
        .from("storage_containers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContainers(data || []);
    } catch (error) {
      console.error("Error fetching containers:", error);
      toast.error("Failed to load storage containers");
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (containerId: string, containerName: string) => {
    try {
      const url = `${window.location.origin}/inventory?container=${containerId}`;
      const qrDataUrl = await QRCode.toDataURL(url, { width: 300 });
      
      // Upload QR code to storage
      const fileName = `qr-${containerId}.png`;
      const base64Data = qrDataUrl.split(",")[1];
      const blob = await fetch(`data:image/png;base64,${base64Data}`).then(r => r.blob());
      
      const { error: uploadError } = await supabase.storage
        .from("claim-sale-images")
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("claim-sale-images")
        .getPublicUrl(fileName);

      // Update container with QR code URL
      const { error: updateError } = await supabase
        .from("storage_containers")
        .update({ qr_code_url: urlData.publicUrl })
        .eq("id", containerId);

      if (updateError) throw updateError;

      // Download QR code
      const link = document.createElement("a");
      link.href = qrDataUrl;
      link.download = `${containerName}-QR.png`;
      link.click();

      toast.success("QR code generated and downloaded!");
      fetchContainers();
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Failed to generate QR code");
    }
  };

  const createContainer = async () => {
    if (!newName.trim()) {
      toast.error("Container name is required");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("storage_containers")
        .insert([{ name: newName, description: newDescription, user_id: user.id }]);

      if (error) throw error;

      toast.success("Container created!");
      setCreating(false);
      setNewName("");
      setNewDescription("");
      fetchContainers();
    } catch (error) {
      console.error("Error creating container:", error);
      toast.error("Failed to create container");
    }
  };

  const deleteContainer = async (id: string) => {
    if (!confirm("Delete this container? Items will be unlinked but not deleted.")) return;

    try {
      const { error } = await supabase
        .from("storage_containers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Container deleted!");
      fetchContainers();
    } catch (error) {
      console.error("Error deleting container:", error);
      toast.error("Failed to delete container");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Storage Containers</h2>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Container
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Container</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Container name (e.g., Box A, Shelf 2)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Textarea
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button onClick={createContainer} className="gap-2">
                <Save className="h-4 w-4" />
                Create
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                  setNewDescription("");
                }}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {containers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No storage containers yet. Create one to organize your inventory!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {containers.map((container) => (
            <Card key={container.id}>
              <CardHeader>
                <CardTitle className="text-lg">{container.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {container.description && (
                  <p className="text-sm text-muted-foreground">{container.description}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateQRCode(container.id, container.name)}
                    className="gap-2 flex-1"
                  >
                    <QrCode className="h-4 w-4" />
                    QR Code
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteContainer(container.id)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
