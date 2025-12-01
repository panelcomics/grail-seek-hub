import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Rocket } from "lucide-react";

interface Campaign {
  id: string;
  slug: string;
  title: string;
  short_tagline: string;
  cover_image_url: string | null;
  category: string;
  funding_goal_cents: number;
  current_pledged_cents: number;
  backers_count: number;
  ends_at: string;
  creator_id: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

interface CampaignCardProps {
  campaign: Campaign;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const navigate = useNavigate();
  
  const percentFunded = Math.min(
    100,
    (campaign.current_pledged_cents / campaign.funding_goal_cents) * 100
  );
  
  const daysRemaining = Math.ceil(
    (new Date(campaign.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      onClick={() => navigate(`/crowdfund/campaign/${campaign.slug}`)}
      className="group cursor-pointer bg-card border rounded-lg overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
    >
      {/* Cover Image */}
      <div className="aspect-[16/10] relative overflow-hidden bg-muted">
        {campaign.cover_image_url ? (
          <img
            src={campaign.cover_image_url}
            alt={campaign.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Rocket className="w-16 h-16 text-muted-foreground opacity-20" />
          </div>
        )}
        
        {/* Category Badge Overlay */}
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="shadow-lg backdrop-blur-sm bg-background/80">
            {campaign.category}
          </Badge>
        </div>
      </div>
      
      <div className="p-5 space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <h3 className="font-bold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {campaign.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {campaign.short_tagline}
          </p>
        </div>

        {/* Creator */}
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={campaign.profiles?.avatar_url} />
            <AvatarFallback className="text-xs">
              {campaign.profiles?.username?.[0]?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            by {campaign.profiles?.username || 'Anonymous'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-secondary/50 h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-700 ease-out rounded-full"
              style={{ width: `${percentFunded}%` }}
            />
          </div>
          
          {/* Funding Stats */}
          <div className="flex justify-between items-baseline">
            <div>
              <span className="font-bold text-lg text-foreground">
                ${(campaign.current_pledged_cents / 100).toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                pledged
              </span>
            </div>
            <span className="text-sm font-medium text-primary">
              {percentFunded.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <span className="font-medium">
            {campaign.backers_count} backer{campaign.backers_count !== 1 ? 's' : ''}
          </span>
          <span className="font-medium">
            {daysRemaining > 0 ? `${daysRemaining} days left` : 'Ended'}
          </span>
        </div>
      </div>
    </div>
  );
}
