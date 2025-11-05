import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2 } from "lucide-react";

const InviteArtist = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: "Validation Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Check if user exists
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', email)
        .maybeSingle();

      if (!profiles) {
        toast({
          title: "Error",
          description: "User not found. They must sign up first.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if user already has artist role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', profiles.user_id)
        .eq('role', 'artist')
        .maybeSingle();

      if (existingRole) {
        toast({
          title: "Already Invited",
          description: "This user already has the artist role",
        });
        setLoading(false);
        return;
      }

      // Assign artist role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: profiles.user_id,
          role: 'artist',
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `Artist role assigned to ${email}`,
      });

      setEmail("");
    } catch (error) {
      console.error("Invite error:", error);
      toast({
        title: "Error",
        description: "Failed to invite artist",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Invite Artist</CardTitle>
          <CardDescription>
            Grant artist permissions to upload their original art
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">User Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="artist@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                The user must have an account before you can invite them
              </p>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inviting...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invite
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteArtist;
