import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileImageUploadProps {
  currentImageUrl: string | null;
  userId: string;
  onImageUploaded: (url: string) => void;
}

export function ProfileImageUpload({
  currentImageUrl,
  userId,
  onImageUploaded,
}: ProfileImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Profile image must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("profile-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("profile-images")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ profile_image_url: publicUrl })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      onImageUploaded(publicUrl);
      toast({
        title: "Profile image updated",
        description: "Your profile image has been successfully updated",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload profile image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className="h-32 w-32">
        <AvatarImage src={currentImageUrl || undefined} />
        <AvatarFallback>
          <Camera className="h-12 w-12 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>

      <input
        type="file"
        accept="image/*"
        className="hidden"
        id="profile-image-upload"
        onChange={handleFileUpload}
        disabled={uploading}
      />

      <Button
        variant="outline"
        onClick={() => document.getElementById("profile-image-upload")?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Camera className="mr-2 h-4 w-4" />
            Change Profile Image
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground">
        JPG or PNG, max 2MB
      </p>
    </div>
  );
}
