import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MarketplaceTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MarketplaceTabs({ activeTab, onTabChange }: MarketplaceTabsProps) {
  const tabs = [
    { value: "featured", label: "Featured" },
    { value: "auctions", label: "Live Auctions" },
    { value: "buy-now", label: "Buy Now" },
    { value: "offers", label: "Make Offer" },
    { value: "trade", label: "Trade" },
    { value: "local", label: "Local" },
  ];

  return (
    <div className="bg-muted/30 border-y py-4 px-4 overflow-x-auto">
      <div className="container mx-auto">
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <TabsList className="w-full justify-start md:justify-center flex-nowrap overflow-x-auto">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value}
                className="whitespace-nowrap"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
