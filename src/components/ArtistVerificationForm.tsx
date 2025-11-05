import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Upload, Paintbrush } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const ArtistVerificationForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sampleImages, setSampleImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [coaFile, setCoaFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    artistName: "",
    portfolioUrl: "",
    instagramUrl: "",
    aboutArtist: "",
    confirmedCreator: false,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (sampleImages.length + files.length > 3) {
      toast.error("Maximum 3 sample images allowed");
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    setSampleImages(prev => [...prev, ...validFiles]);
    validFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      setImageUrls(prev => [...prev, url]);
    });
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imageUrls[index]);
    setSampleImages(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.artistName) {
      toast.error("Please enter your artist name");
      return;
    }

    if (sampleImages.length === 0) {
      toast.error("Please upload at least 1 sample artwork");
      return;
    }

    if (!formData.confirmedCreator) {
      toast.error("Please confirm you are the creator of the submitted works");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload sample images
      const uploadedUrls: string[] = [];
      for (let i = 0; i < sampleImages.length; i++) {
        const file = sampleImages[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${user?.id}/samples/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("artist-verification")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("artist-verification")
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      // Upload COA/signature if provided
      let coaUrl = null;
      if (coaFile) {
        const fileExt = coaFile.name.split(".").pop();
        const fileName = `${user?.id}/coa/${Date.now()}.${fileExt}`;

        const { error: coaError } = await supabase.storage
          .from("artist-verification")
          .upload(fileName, coaFile);

        if (coaError) throw coaError;

        const { data: { publicUrl } } = supabase.storage
          .from("artist-verification")
          .getPublicUrl(fileName);

        coaUrl = publicUrl;
      }

      // Create application
      const { error: appError } = await supabase
        .from("artist_applications")
        .insert({
          user_id: user?.id,
          artist_name: formData.artistName,
          portfolio_url: formData.portfolioUrl || null,
          instagram_url: formData.instagramUrl || null,
          sample_images: uploadedUrls,
          coa_signature_url: coaUrl,
          about_artist: formData.aboutArtist || null,
          confirmed_creator: formData.confirmedCreator,
        });

      if (appError) throw appError;

      // Send admin notification
      await supabase.functions.invoke("send-notification-email", {
        body: {
          type: "artist_application",
          data: {
            artistName: formData.artistName,
            userEmail: user?.email,
          },
        },
      });

      toast.success("Artist verification application submitted! We'll review it soon.");
      navigate("/settings");
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paintbrush className="h-5 w-5" />
          Apply for Verified Artist Status
        </CardTitle>
        <CardDescription>
          Get verified to showcase your original artwork with a trusted creator badge
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="artistName">Artist Name or Pseudonym *</Label>
            <Input
              id="artistName"
              value={formData.artistName}
              onChange={(e) => setFormData(prev => ({ ...prev, artistName: e.target.value }))}
              placeholder="Your artist name"
              required
            />
          </div>

          <div>
            <Label htmlFor="portfolioUrl">Portfolio Link</Label>
            <Input
              id="portfolioUrl"
              type="url"
              value={formData.portfolioUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, portfolioUrl: e.target.value }))}
              placeholder="https://yourportfolio.com"
            />
          </div>

          <div>
            <Label htmlFor="instagramUrl">Instagram Handle (optional)</Label>
            <Input
              id="instagramUrl"
              type="url"
              value={formData.instagramUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, instagramUrl: e.target.value }))}
              placeholder="https://instagram.com/yourhandle"
            />
          </div>

          <div>
            <Label htmlFor="aboutArtist">About the Artist</Label>
            <Textarea
              id="aboutArtist"
              value={formData.aboutArtist}
              onChange={(e) => setFormData(prev => ({ ...prev, aboutArtist: e.target.value }))}
              placeholder="Tell us about your artistic journey, style, and inspirations..."
              rows={4}
            />
          </div>

          <div>
            <Label>Sample Artwork * (1-3 images, max 5MB each)</Label>
            <div className="mt-2">
              <label htmlFor="samples" className="cursor-pointer">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Click to upload sample artwork
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sampleImages.length}/3 images uploaded
                  </p>
                </div>
                <input
                  id="samples"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>

            {imageUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {imageUrls.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={url}
                      alt={`Sample ${idx + 1}`}
                      className="w-full h-32 object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="coa">Optional: COA or Signature Sample</Label>
            <Input
              id="coa"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && file.size > 5 * 1024 * 1024) {
                  toast.error("File must be under 5MB");
                  return;
                }
                setCoaFile(file || null);
              }}
              className="mt-2"
            />
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="confirmed"
              checked={formData.confirmedCreator}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, confirmedCreator: checked as boolean }))}
              className="mt-1"
            />
            <Label htmlFor="confirmed" className="font-normal cursor-pointer">
              I am the creator of all submitted works and understand that false claims may result in account suspension.
            </Label>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Application...
              </>
            ) : (
              "Submit Application"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
