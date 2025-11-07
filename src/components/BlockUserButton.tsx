import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Ban } from "lucide-react";

interface BlockUserButtonProps {
  userId: string;
  userName?: string;
  onBlock?: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const BlockUserButton = ({
  userId,
  userName = "this user",
  onBlock,
  variant = "destructive",
  size = "sm",
}: BlockUserButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleBlock = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const { error } = await supabase
        .from("user_blocks")
        .insert({
          blocker_user_id: user.id,
          blocked_user_id: userId,
        });

      if (error) {
        if (error.code === "23505") { // Unique constraint violation
          toast.info("User is already blocked");
        } else {
          throw error;
        }
      } else {
        toast.success(`You have blocked ${userName}. They can no longer message or send offers.`);
        onBlock?.();
      }
    } catch (error: any) {
      console.error("Error blocking user:", error);
      toast.error(error.message || "Failed to block user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <Ban className="h-4 w-4" />
          Block User
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block {userName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This user will no longer be able to send you messages or trade offers.
            You can unblock them later from your settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleBlock} disabled={loading}>
            {loading ? "Blocking..." : "Block User"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
