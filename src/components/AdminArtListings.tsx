import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Flag, Shield, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ArtListing {
  id: string;
  title: string;
  subcategory: string;
  has_coa: boolean;
  coa_file_url: string | null;
  authenticity_flagged: boolean;
  flagged_reason: string | null;
  image_url: string;
  is_creator_owner: boolean;
  is_original_physical: boolean;
  claim_sale_id: string;
}

export const AdminArtListings = () => {
  const [listings, setListings] = useState<ArtListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");

  useEffect(() => {
    fetchArtListings();
  }, []);

  const fetchArtListings = async () => {
    try {
      const { data, error } = await supabase
        .from("claim_sale_items")
        .select("*")
        .eq("category", "art")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error("Error fetching art listings:", error);
      toast.error("Failed to load art listings");
    } finally {
      setLoading(false);
    }
  };

  const handleFlag = async (listingId: string) => {
    if (!flagReason.trim()) {
      toast.error("Please provide a reason for flagging");
      return;
    }

    setFlaggingId(listingId);
    try {
      const { error: updateError } = await supabase
        .from("claim_sale_items")
        .update({
          authenticity_flagged: true,
          flagged_reason: flagReason,
          flagged_at: new Date().toISOString(),
        })
        .eq("id", listingId);

      if (updateError) throw updateError;

      const { error: flagError } = await supabase
        .from("art_listing_flags")
        .insert({
          listing_id: listingId,
          flagged_by: (await supabase.auth.getUser()).data.user?.id,
          reason: flagReason,
        });

      if (flagError) throw flagError;

      toast.success("Listing flagged for review");
      setFlagReason("");
      await fetchArtListings();
    } catch (error) {
      console.error("Error flagging listing:", error);
      toast.error("Failed to flag listing");
    } finally {
      setFlaggingId(null);
    }
  };

  const handleUnflag = async (listingId: string) => {
    setFlaggingId(listingId);
    try {
      const { error } = await supabase
        .from("claim_sale_items")
        .update({
          authenticity_flagged: false,
          flagged_reason: null,
          flagged_at: null,
        })
        .eq("id", listingId);

      if (error) throw error;

      toast.success("Flag removed");
      await fetchArtListings();
    } catch (error) {
      console.error("Error unflagging listing:", error);
      toast.error("Failed to remove flag");
    } finally {
      setFlaggingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Original Art & Sketches Listings</CardTitle>
          <CardDescription>
            Review and flag art listings for authenticity concerns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {listings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No art listings found
              </p>
            ) : (
              listings.map((listing) => (
                <Card key={listing.id} className={listing.authenticity_flagged ? "border-destructive" : ""}>
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <img
                        src={listing.image_url}
                        alt={listing.title}
                        className="w-24 h-32 object-cover rounded"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{listing.title}</h3>
                            <p className="text-sm text-muted-foreground capitalize">
                              {listing.subcategory?.replace(/_/g, " ")}
                            </p>
                          </div>
                          {listing.authenticity_flagged && (
                            <Badge variant="destructive">
                              <Flag className="h-3 w-3 mr-1" />
                              Flagged
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-2 text-sm">
                          <Badge variant={listing.is_creator_owner ? "default" : "destructive"}>
                            {listing.is_creator_owner ? "✓" : "✗"} Owner Confirmed
                          </Badge>
                          <Badge variant={listing.is_original_physical ? "default" : "destructive"}>
                            {listing.is_original_physical ? "✓" : "✗"} Original Physical
                          </Badge>
                          <Badge variant={listing.has_coa ? "default" : "secondary"}>
                            {listing.has_coa ? (
                              <>
                                <Shield className="h-3 w-3 mr-1" />
                                COA Provided
                              </>
                            ) : (
                              "No COA"
                            )}
                          </Badge>
                        </div>

                        {listing.coa_file_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={listing.coa_file_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View COA
                            </a>
                          </Button>
                        )}

                        {listing.flagged_reason && (
                          <div className="p-2 bg-destructive/10 rounded text-sm">
                            <strong>Flag Reason:</strong> {listing.flagged_reason}
                          </div>
                        )}

                        <div className="flex gap-2">
                          {listing.authenticity_flagged ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnflag(listing.id)}
                              disabled={flaggingId === listing.id}
                            >
                              {flaggingId === listing.id && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Remove Flag
                            </Button>
                          ) : (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Flag className="h-3 w-3 mr-1" />
                                  Flag for Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Flag Listing for Authenticity Review</DialogTitle>
                                  <DialogDescription>
                                    Provide a reason for flagging this listing
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="reason">Reason</Label>
                                    <Textarea
                                      id="reason"
                                      value={flagReason}
                                      onChange={(e) => setFlagReason(e.target.value)}
                                      placeholder="Describe the authenticity concern..."
                                      rows={4}
                                    />
                                  </div>
                                  <Button
                                    onClick={() => handleFlag(listing.id)}
                                    disabled={flaggingId === listing.id}
                                    className="w-full"
                                  >
                                    {flaggingId === listing.id && (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Submit Flag
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          <Button variant="outline" size="sm" asChild>
                            <a href={`/item/${listing.id}`} target="_blank" rel="noopener noreferrer">
                              View Listing
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
