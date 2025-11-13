import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Search, Download, Upload, Loader2, Edit2, Save, X, Filter, DollarSign, CheckSquare, Square } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { exportInventoryToCSV, downloadCSV } from "@/lib/csvUtils";
import { CSVImportModal } from "@/components/CSVImportModal";
import { ListItemModal } from "@/components/ListItemModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StorageManagement } from "@/components/StorageManagement";
import { BulkActionsBar } from "@/components/BulkActionsBar";
import { formatDistanceToNow } from "date-fns";
import { CollectionSidebar } from "@/components/CollectionSidebar";

interface InventoryItem {
  id: string;
  title: string;
  issue_number: string | null;
  grade: string | null;
  private_location: string | null;
  private_notes: string | null;
  details: string | null;
  created_at: string;
  updated_at: string;
  listing_status: string;
  listed_price: number | null;
  storage_container_id: string | null;
  publisher: string | null;
  series: string | null;
}

export default function MyInventory() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [publisherFilter, setPublisherFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [containerFilter, setContainerFilter] = useState(searchParams.get("container") || "all");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLocation, setEditLocation] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [containers, setContainers] = useState<{ id: string; name: string }[]>([]);

  const uniqueLocations = Array.from(new Set(items.map(i => i.private_location).filter(Boolean))) as string[];
  const uniquePublishers = Array.from(new Set(items.map(i => i.publisher).filter(Boolean))) as string[];
  const uniqueGrades = Array.from(new Set(items.map(i => i.grade).filter(Boolean))) as string[];

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchInventory();
    fetchContainers();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    let filtered = items;

    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(search.toLowerCase()) ||
          item.issue_number?.toLowerCase().includes(search.toLowerCase()) ||
          item.series?.toLowerCase().includes(search.toLowerCase()) ||
          item.details?.toLowerCase().includes(search.toLowerCase()) ||
          item.private_notes?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (locationFilter !== "all") {
      filtered = filtered.filter(item => item.private_location === locationFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(item => item.listing_status === statusFilter);
    }

    if (publisherFilter !== "all") {
      filtered = filtered.filter(item => item.publisher === publisherFilter);
    }

    if (gradeFilter !== "all") {
      filtered = filtered.filter(item => item.grade === gradeFilter);
    }

    if (containerFilter !== "all") {
      filtered = filtered.filter(item => item.storage_container_id === containerFilter);
    }

    setFilteredItems(filtered);
  }, [search, locationFilter, statusFilter, publisherFilter, gradeFilter, containerFilter, items]);

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

  const fetchContainers = async () => {
    const { data } = await supabase
      .from("storage_containers")
      .select("id, name")
      .order("name");
    setContainers(data || []);
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

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(item => item.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "listed": return "bg-success/10 border-success";
      case "sold": return "bg-destructive/10 border-destructive";
      default: return "bg-background";
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout>
      <main className="flex-1 container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main Content */}
          <div className="order-2 lg:order-1">
            <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="storage">Boxes & Shelves</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory">
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
                <div className="mb-6 space-y-3">
                  <div className="flex gap-3 flex-col md:flex-row">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by title, series, or issue..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="not_listed">Not Listed</SelectItem>
                        <SelectItem value="listed">Listed</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={publisherFilter} onValueChange={setPublisherFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Publisher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Publishers</SelectItem>
                        {uniquePublishers.map((pub) => (
                          <SelectItem key={pub} value={pub}>{pub}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={gradeFilter} onValueChange={setGradeFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Grades</SelectItem>
                        {uniqueGrades.map((grade) => (
                          <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={containerFilter} onValueChange={setContainerFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Container" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Containers</SelectItem>
                        {containers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {uniqueLocations.map((loc) => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filteredItems.length > 0 && (
                  <div className="mb-4 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSelectAll}
                      className="gap-2"
                    >
                      {selectedIds.length === filteredItems.length ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      {selectedIds.length > 0 ? `${selectedIds.length} selected` : "Select All"}
                    </Button>
                  </div>
                )}

                {filteredItems.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      {search || locationFilter !== "all" || statusFilter !== "all" || publisherFilter !== "all" || gradeFilter !== "all" || containerFilter !== "all"
                        ? "No items found matching your filters"
                        : "Your inventory is empty. Scan a comic to get started!"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredItems.map((item) => (
                      <Card key={item.id} className={getStatusColor(item.listing_status)}>
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start gap-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleSelect(item.id)}
                                className="p-0 h-auto"
                              >
                                {selectedIds.includes(item.id) ? (
                                  <CheckSquare className="h-5 w-5" />
                                ) : (
                                  <Square className="h-5 w-5" />
                                )}
                              </Button>
                              <div className="flex-1">
                                <h3 className="font-semibold">{item.title}</h3>
                                {item.issue_number && (
                                  <p className="text-sm text-muted-foreground">Issue #{item.issue_number}</p>
                                )}
                                {item.details && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {item.details.length > 60 ? `${item.details.substring(0, 60)}...` : item.details}
                                  </p>
                                )}
                                {item.grade && (
                                  <p className="text-sm text-muted-foreground">Grade: {item.grade}</p>
                                )}
                                {item.listed_price && (
                                  <p className="text-sm font-semibold text-primary">${item.listed_price}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  Updated {formatDistanceToNow(new Date(item.updated_at))} ago
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/sell/${item.id}`)}
                                  className="gap-2"
                                >
                                  <DollarSign className="h-4 w-4" />
                                  List
                                </Button>
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
          </TabsContent>

          <TabsContent value="storage">
            <Card>
              <CardContent className="pt-6">
                <StorageManagement />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sidebar */}
      <aside className="order-1 lg:order-2">
        <CollectionSidebar />
      </aside>
    </div>
      </main>

      <BulkActionsBar 
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
        onActionComplete={() => {
          fetchInventory();
          setSelectedIds([]);
        }}
      />

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
    </AppLayout>
  );
}
