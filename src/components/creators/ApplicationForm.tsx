import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PortfolioLinksField } from "./PortfolioLinksField";
import { toast } from "sonner";

export function ApplicationForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roleRequested, setRoleRequested] = useState<"artist" | "writer" | "both">("artist");
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please log in to submit an application");
      navigate("/auth");
      return;
    }

    if (portfolioLinks.length === 0) {
      toast.error("Please add at least one portfolio link");
      return;
    }

    if (!bio.trim()) {
      toast.error("Please provide a bio");
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("creator_applications")
        .insert({
          user_id: user.id,
          role_requested: roleRequested,
          portfolio_links: portfolioLinks,
          bio: bio.trim(),
          status: "pending"
        });

      if (error) throw error;

      toast.success("Application submitted successfully!");
      navigate("/creators/dashboard");
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label>I want to apply as:</Label>
        <RadioGroup value={roleRequested} onValueChange={(v) => setRoleRequested(v as any)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="artist" id="artist" />
            <Label htmlFor="artist" className="font-normal">Artist (create & sell original art)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="writer" id="writer" />
            <Label htmlFor="writer" className="font-normal">Writer (launch crowdfunding projects)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="both" id="both" />
            <Label htmlFor="both" className="font-normal">Both Artist & Writer</Label>
          </div>
        </RadioGroup>
      </div>

      <PortfolioLinksField
        links={portfolioLinks}
        onChange={setPortfolioLinks}
        disabled={submitting}
      />

      <div className="space-y-3">
        <Label htmlFor="bio">Bio / About You</Label>
        <Textarea
          id="bio"
          placeholder="Tell us about your work, experience, and what you'd like to create..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={submitting}
          rows={6}
        />
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  );
}
