import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, X, ExternalLink } from "lucide-react";

interface PortfolioLinksFieldProps {
  links: string[];
  onChange: (links: string[]) => void;
  disabled?: boolean;
}

export function PortfolioLinksField({ links, onChange, disabled }: PortfolioLinksFieldProps) {
  const [newLink, setNewLink] = useState("");

  const addLink = () => {
    if (newLink.trim() && !links.includes(newLink.trim())) {
      onChange([...links, newLink.trim()]);
      setNewLink("");
    }
  };

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <Label>Portfolio Links</Label>
      
      <div className="flex gap-2">
        <Input
          placeholder="https://your-portfolio.com"
          value={newLink}
          onChange={(e) => setNewLink(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addLink())}
          disabled={disabled}
        />
        <Button type="button" onClick={addLink} disabled={disabled || !newLink.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {links.length > 0 && (
        <div className="space-y-2">
          {links.map((link, index) => (
            <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <a 
                href={link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate flex-1"
              >
                {link}
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeLink(index)}
                disabled={disabled}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
