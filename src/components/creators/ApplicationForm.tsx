import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PortfolioLinksField } from "./PortfolioLinksField";
import { toast } from "sonner";

export function ApplicationForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [creatorType, setCreatorType] = useState("artist");
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState({ website: "", twitter: "", instagram: "" });
  const [bio, setBio] = useState("");
  const [requestedAccess, setRequestedAccess] = useState<string[]>([]);
  const [sampleFiles, setSampleFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSampleFiles(prev => [...prev, ...files].slice(0, 5)); // Max 5 files
    }
  };

  const removeFile = (index: number) => {
    setSampleFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleAccess = (access: string) => {
    setRequestedAccess(prev => 
      prev.includes(access) 
        ? prev.filter(a => a !== access)
        : [...prev, access]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please sign in to submit an application");
      navigate("/auth");
      return;
    }

    // Validation
    if (!fullName.trim()) {
      toast.error("Please provide your full name");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      toast.error("Please provide a valid email address");
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

    if (requestedAccess.length === 0) {
      toast.error("Please select what you want to do on GrailSeeker");
      return;
    }

    if (!agreedToTerms) {
      toast.error("Please agree to the terms");
      return;
    }

    setSubmitting(true);
    setUploading(true);

    try {
      // Upload sample files if any
      const uploadedFileUrls: string[] = [];
      
      if (sampleFiles.length > 0) {
        for (const file of sampleFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError, data } = await supabase.storage
            .from('creator-samples')
            .upload(fileName, file);

          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('creator-samples')
            .getPublicUrl(fileName);
          
          uploadedFileUrls.push(publicUrl);
        }
      }

      // Insert application with type assertion for new fields
      const { error } = await supabase
        .from("creator_applications")
        .insert({
          user_id: user.id,
          full_name: fullName.trim(),
          email: email.trim(),
          creator_type: creatorType,
          portfolio_links: portfolioLinks,
          social_links: socialLinks as any,
          bio: bio.trim(),
          requested_access: requestedAccess as any,
          sample_files: uploadedFileUrls as any,
          status: "pending" as any,
          role_requested: creatorType as any // Keep for backwards compatibility
        } as any);

      if (error) throw error;

      // Send notification email
      await supabase.functions.invoke('creator-notify', {
        body: { 
          type: 'submitted',
          userId: user.id,
          fullName: fullName.trim(),
          email: email.trim(),
          creatorType: creatorType
        }
      });

      toast.success("✅ Application received! We'll review this shortly and reach out if we need anything else. Most creators hear back quickly.");
      navigate("/creators/apply"); // Redirect to show status card
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label htmlFor="fullName">Full Name *</Label>
        <input
          id="fullName"
          type="text"
          className="w-full px-4 py-2 rounded-md border border-border bg-background"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={submitting}
          required
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="email">Email Address *</Label>
        <input
          id="email"
          type="email"
          className="w-full px-4 py-2 rounded-md border border-border bg-background"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          required
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="creatorType">What best describes what you create? *</Label>
        <select
          id="creatorType"
          className="w-full px-4 py-2 rounded-md border border-border bg-background"
          value={creatorType}
          onChange={(e) => setCreatorType(e.target.value)}
          disabled={submitting}
        >
          <option value="artist">Artist</option>
          <option value="writer">Writer</option>
          <option value="colorist">Colorist</option>
          <option value="cover_artist">Cover Artist</option>
          <option value="publisher">Publisher</option>
          <option value="grailfunding_creator">GrailFunding Creator</option>
        </select>
        <p className="text-xs text-muted-foreground">Select all that apply</p>
      </div>

      <PortfolioLinksField
        links={portfolioLinks}
        onChange={setPortfolioLinks}
        disabled={submitting}
      />

      <div className="space-y-3">
        <Label>Social Media Links (Optional)</Label>
        <div className="space-y-2">
          <input
            type="url"
            placeholder="Website URL"
            className="w-full px-4 py-2 rounded-md border border-border bg-background"
            value={socialLinks.website}
            onChange={(e) => setSocialLinks(prev => ({ ...prev, website: e.target.value }))}
            disabled={submitting}
          />
          <input
            type="url"
            placeholder="Twitter/X URL"
            className="w-full px-4 py-2 rounded-md border border-border bg-background"
            value={socialLinks.twitter}
            onChange={(e) => setSocialLinks(prev => ({ ...prev, twitter: e.target.value }))}
            disabled={submitting}
          />
          <input
            type="url"
            placeholder="Instagram URL"
            className="w-full px-4 py-2 rounded-md border border-border bg-background"
            value={socialLinks.instagram}
            onChange={(e) => setSocialLinks(prev => ({ ...prev, instagram: e.target.value }))}
            disabled={submitting}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label htmlFor="sampleFiles">Upload Sample Files (Optional, max 5)</Label>
        <input
          id="sampleFiles"
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          multiple
          onChange={handleFileChange}
          disabled={submitting || sampleFiles.length >= 5}
          className="w-full px-4 py-2 rounded-md border border-border bg-background"
        />
        {sampleFiles.length > 0 && (
          <div className="space-y-2">
            {sampleFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={submitting}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label htmlFor="bio">Tell us a little about what you create *</Label>
        <Textarea
          id="bio"
          placeholder="Tell us about your work and what you'd like to create..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={submitting}
          rows={6}
        />
        <p className="text-xs text-muted-foreground">Just a few sentences is perfect.</p>
      </div>

      <div className="space-y-3">
        <Label>What do you want to do on GrailSeeker? *</Label>
        <div className="space-y-2">
          {[
            { id: 'original_art', label: 'Sell Original Art' },
            { id: 'comics', label: 'Sell Comics' },
            { id: 'slabs', label: 'Sell Slabs' },
            { id: 'grailfunding', label: 'Launch GrailFunding Campaigns' }
          ].map(option => (
            <label key={option.id} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requestedAccess.includes(option.id)}
                onChange={() => toggleAccess(option.id)}
                disabled={submitting}
                className="rounded"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="terms"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          disabled={submitting}
          className="rounded"
        />
        <Label htmlFor="terms" className="font-normal cursor-pointer">
          I confirm that all submitted work is my own and I agree to GrailSeeker terms. *
        </Label>
      </div>

      <Button type="submit" disabled={submitting || uploading} className="w-full">
        {uploading ? "Uploading files..." : submitting ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  );
}
