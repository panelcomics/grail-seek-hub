import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Globe, Mail } from "lucide-react";
import { FaTwitter, FaInstagram, FaLinkedin } from "react-icons/fa";

export default function CreatorProfile() {
  const { slug } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [slug]);

  const loadProfile = async () => {
    if (!slug) return;

    try {
      const { data, error } = await supabase
        .from("creator_public_profiles")
        .select(`
          *,
          creator_applications!creator_public_profiles_creator_application_id_fkey (
            creator_type,
            tier,
            portfolio_links,
            requested_access
          )
        `)
        .eq("public_slug", slug)
        .eq("is_visible", true)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container max-w-4xl mx-auto py-12 text-center space-y-4">
        <h1 className="text-3xl font-bold">Creator Not Found</h1>
        <p className="text-muted-foreground">This creator profile doesn't exist or is not public.</p>
        <Button asChild>
          <Link to="/creators">Browse All Creators</Link>
        </Button>
      </div>
    );
  }

  const app = profile.creator_applications;
  const socialLinks = profile.social_links || {};

  return (
    <div className="container max-w-4xl mx-auto py-12 space-y-8">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <Avatar className="w-32 h-32">
          <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
          <AvatarFallback className="text-3xl">
            {profile.display_name?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">{profile.display_name}</h1>
            <div className="flex flex-wrap gap-2">
              {app?.creator_type && (
                <Badge variant="secondary" className="capitalize">
                  {app.creator_type.replace(/_/g, ' ')}
                </Badge>
              )}
              {app?.tier && (
                <Badge 
                  variant="outline"
                  className={
                    app.tier === 'gold' ? 'border-yellow-500 text-yellow-500' :
                    app.tier === 'silver' ? 'border-gray-400 text-gray-400' :
                    'border-orange-700 text-orange-700'
                  }
                >
                  {app.tier.charAt(0).toUpperCase() + app.tier.slice(1)} Creator
                </Badge>
              )}
            </div>
          </div>

          {/* Social Links */}
          <div className="flex flex-wrap gap-3">
            {socialLinks.twitter && (
              <a
                href={socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <FaTwitter className="w-5 h-5" />
              </a>
            )}
            {socialLinks.instagram && (
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <FaInstagram className="w-5 h-5" />
              </a>
            )}
            {socialLinks.linkedin && (
              <a
                href={socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <FaLinkedin className="w-5 h-5" />
              </a>
            )}
            {socialLinks.website && (
              <a
                href={socialLinks.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Globe className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Bio Section */}
      {profile.short_bio && (
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{profile.short_bio}</p>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Links */}
      {app?.portfolio_links && app.portfolio_links.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {app.portfolio_links.map((link: string, i: number) => (
                <a
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  {link}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Featured Links */}
      {profile.featured_links && profile.featured_links.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Featured Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profile.featured_links.map((link: any, i: number) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  {link.title || link.url}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* What They Do on GrailSeeker */}
      {app?.requested_access && app.requested_access.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>On GrailSeeker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {app.requested_access.map((access: string, i: number) => (
                <Badge key={i} variant="outline">
                  {access.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
