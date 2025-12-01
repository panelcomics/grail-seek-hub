import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Rocket, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function HeroSection() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLaunchProject = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate('/crowdfund/launch');
  };

  const scrollToCampaigns = () => {
    const element = document.getElementById('campaigns');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-24 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Comic Crowdfunding Reimagined</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Fund Your Next
            <span className="block text-primary mt-2">Comic Grail</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Support independent comic creators and bring epic stories to life. 
            Join a community of collectors backing the next generation of comics.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button
              size="lg"
              onClick={scrollToCampaigns}
              className="text-lg h-14 px-8 shadow-lg hover:shadow-xl"
            >
              Explore Campaigns
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleLaunchProject}
              className="text-lg h-14 px-8 border-2"
            >
              <Rocket className="w-5 h-5 mr-2" />
              Launch a Project
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary">$2.4M+</div>
              <div className="text-sm text-muted-foreground mt-1">Funded</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary">150+</div>
              <div className="text-sm text-muted-foreground mt-1">Projects</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary">5K+</div>
              <div className="text-sm text-muted-foreground mt-1">Backers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
