import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Search, Download, Upload, Loader2, Edit2, Save, X, Filter, DollarSign } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { exportInventoryToCSV, downloadCSV } from "@/lib/csvUtils";
import { CSVImportModal } from "@/components/CSVImportModal";
import { ListItemModal } from "@/components/ListItemModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface InventoryItem {
  id: string;
  title: string;
  issue_number: string | null;
  grade: string | null;
  private_location: string | null;
  private_notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function MyInventory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLocation, setEditLocation] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const uniqueLocations = Array.from(new Set(items.map(i => i.private_location).filter(Boolean))) as string[];

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchInventory();
  }, [user, navigate]);

  useEffect(() => {
    let filtered = items;

    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.issue_number?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (locationFilter !== "all") {
      filtered = filtered.filter(item => item.private_location === locationFilter);
    }

    setFilteredItems(filtered);
  }, [search, locationFilter, items]);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setItems(data || []);
      setFilteredItems(data || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (items.length === 0) {
      toast.error("No items to export");
      return;
    }

    const csv = exportInventoryToCSV(items);
    const filename = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(filename, csv);
    toast.success("Inventory exported!");
  };

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditLocation(item.private_location || "");
    setEditNotes(item.private_notes || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLocation("");
    setEditNotes("");
  };

  const saveEdit = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          private_location: editLocation || null,
          private_notes: editNotes || null,
        })
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.map(item => 
        item.id === itemId 
          ? { ...item, private_location: editLocation || null, private_notes: editNotes || null }
          : item
      ));

      toast.success("Updated!");
      cancelEdit();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error("Failed to update");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container py-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>My Inventory</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={handleExport} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => setImportModalOpen(true)} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Import CSV
                </Button>
                <Button onClick={() => navigate("/scanner")} className="gap-2">
                  Scan New Comic
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex gap-3 flex-col md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or issue..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {uniqueLocations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {search || locationFilter !== "all"
                    ? "No items found matching your filters"
                    : "Your inventory is empty. Scan a comic to get started!"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{item.title}</h3>
                            {item.issue_number && (
                              <p className="text-sm text-muted-foreground">Issue #{item.issue_number}</p>
                            )}
                            {item.grade && (
                              <p className="text-sm text-muted-foreground">Grade: {item.grade}</p>
                            )}
                          </div>
                          {editingId !== item.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(item)}
                              className="gap-2"
                            >
                              <Edit2 className="h-4 w-4" />
                              Edit
                            </Button>
                          )}
                        </div>

                        {editingId === item.id ? (
                          <div className="space-y-3 border-t pt-3">
                            <div>
                              <label className="text-sm font-medium">Location</label>
                              <Input
                                value={editLocation}
                                onChange={(e) => setEditLocation(e.target.value)}
                                placeholder="Box A, Shelf 2, etc."
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Notes</label>
                              <Textarea
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                placeholder="Condition notes, purchase info, etc."
                                rows={2}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={() => saveEdit(item.id)} size="sm" className="gap-2">
                                <Save className="h-4 w-4" />
                                Save
                              </Button>
                              <Button onClick={cancelEdit} variant="outline" size="sm" className="gap-2">
                                <X className="h-4 w-4" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {item.private_location && (
                              <div className="text-sm">
                                <span className="font-medium">Location:</span>{" "}
                                <span className="text-muted-foreground">{item.private_location}</span>
                              </div>
                            )}
                            {item.private_notes && (
                              <div className="text-sm">
                                <span className="font-medium">Notes:</span>{" "}
                                <span className="text-muted-foreground">{item.private_notes}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />

      <CSVImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImportComplete={fetchInventory}
      />

      {selectedItem && (
        <ListItemModal
          open={listModalOpen}
          onOpenChange={setListModalOpen}
          inventoryItem={selectedItem}
          onSuccess={fetchInventory}
        />
      )}
    </div>
  );
}
