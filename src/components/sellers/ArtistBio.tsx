import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Twitter, Instagram, Globe } from "lucide-react";

interface ArtistBioProps {
  artistName: string;
  bio?: string | null;
  notableCredits?: string[] | null; // TODO: Add this field to profiles table when ready
  website?: string | null;
  twitterHandle?: string | null;
  instagramHandle?: string | null;
}

export function ArtistBio({
  artistName,
  bio,
  notableCredits,
  website,
  twitterHandle,
  instagramHandle,
}: ArtistBioProps) {
  // TODO: Once profiles table has social media fields, wire them here
  const hasSocials = website || twitterHandle || instagramHandle;

  return (
    <div className="container mx-auto px-4 -mt-12 relative z-10">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">About {artistName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bio text */}
          {bio ? (
            <p className="text-muted-foreground leading-relaxed">
              {bio}
            </p>
          ) : (
            <p className="text-muted-foreground italic">
              No bio available yet.
            </p>
          )}

          {/* Notable credits - TODO: Add notable_credits field to profiles table */}
          {notableCredits && notableCredits.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                Notable Credits
              </h3>
              <ul className="space-y-2">
                {notableCredits.map((credit, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-foreground">{credit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Social links - TODO: Add social_links JSONB field to profiles table */}
          {hasSocials && (
            <div>
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                Connect
              </h3>
              <div className="flex flex-wrap gap-2">
                {website && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-2"
                  >
                    <a href={website} target="_blank" rel="noopener noreferrer">
                      <Globe className="w-4 h-4" />
                      Website
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </a>
                  </Button>
                )}
                
                {twitterHandle && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-2"
                  >
                    <a 
                      href={`https://twitter.com/${twitterHandle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Twitter className="w-4 h-4" />
                      Twitter
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </a>
                  </Button>
                )}
                
                {instagramHandle && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-2"
                  >
                    <a 
                      href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Instagram className="w-4 h-4" />
                      Instagram
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
