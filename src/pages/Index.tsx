import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Hero from "@/components/Hero";
import FeaturedShops from "@/components/FeaturedShops";
import LocalDiscovery from "@/components/LocalDiscovery";
import EventsCarousel from "@/components/EventsCarousel";
import SellerSpotlight from "@/components/SellerSpotlight";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .gte("start_date", new Date().toISOString())
      .order("start_date", { ascending: true })
      .limit(6);
    
    setEvents(data || []);
  };

  return (
    <>
      <Helmet>
        <title>GrailSeeker - Rare Book & Comic Marketplace</title>
        <meta 
          name="description" 
          content="Discover, trade, and collect rare books and comics. Connect with collectors and dealers nationwide." 
        />
      </Helmet>

      <div className="min-h-screen">
        <Hero />
        
        <section id="trending-listings" className="py-12 bg-background">
          <div className="container mx-auto px-4">
            <FeaturedShops />
          </div>
        </section>

        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <SellerSpotlight />
          </div>
        </section>

        <section id="local-discovery" className="py-12 bg-background">
          <div className="container mx-auto px-4">
            <LocalDiscovery 
              onCitySelect={setSelectedCity}
              selectedCity={selectedCity}
            />
          </div>
        </section>

        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <EventsCarousel events={events} />
          </div>
        </section>
      </div>
    </>
  );
}
