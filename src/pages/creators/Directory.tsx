import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function Directory() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("creator_public_profiles")
        .select(`
          *,
          creator_applications!creator_public_profiles_creator_application_id_fkey (
            creator_type,
            tier
          )
        `)
        .eq("is_visible", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error loading profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(profile =>
    profile.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.short_bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.creator_applications?.creator_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-12">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-12 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Creators Directory</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover talented artists, writers, and creators on GrailSeeker
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search creators..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Creators Grid */}
      {filteredProfiles.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {searchTerm ? "No creators found matching your search." : "No creators to display yet."}
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProfiles.map((profile) => {
            const app = profile.creator_applications;
            return (
              <Link key={profile.id} to={`/creators/${profile.public_slug}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
                        <AvatarFallback className="text-2xl">
                          {profile.display_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-2 w-full">
                        <h3 className="font-semibold text-lg">{profile.display_name}</h3>
                        
                        <div className="flex flex-wrap gap-2 justify-center">
                          {app?.creator_type && (
                            <Badge variant="secondary" className="capitalize text-xs">
                              {app.creator_type.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {app?.tier && (
                            <Badge 
                              variant="outline"
                              className={`text-xs ${
                                app.tier === 'gold' ? 'border-yellow-500 text-yellow-500' :
                                app.tier === 'silver' ? 'border-gray-400 text-gray-400' :
                                'border-orange-700 text-orange-700'
                              }`}
                            >
                              {app.tier.charAt(0).toUpperCase() + app.tier.slice(1)}
                            </Badge>
                          )}
                        </div>
                        
                        {profile.short_bio && (
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {profile.short_bio}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
