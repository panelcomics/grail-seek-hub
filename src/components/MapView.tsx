import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = "pk.eyJ1IjoicGFuZWxjb21pY3MiLCJhIjoiY21oazN1ejQyMTljbTJycG52eDhtMjV6dSJ9.c14SkJOPY5BzBOJBPD4Mmg";

interface MapViewProps {
  items: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title: string;
    price: number;
  }>;
  events: Array<{
    id: string;
    latitude: number;
    longitude: number;
    name: string;
    city: string;
  }>;
  center?: [number, number];
  zoom?: number;
}

const MapView = ({ items, events, center = [-98.5795, 39.8283], zoom = 4 }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: center,
      zoom: zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add event markers
    events.forEach((event) => {
      const el = document.createElement("div");
      el.className = "w-8 h-8 bg-destructive rounded-full border-2 border-background shadow-lg cursor-pointer flex items-center justify-center text-xs font-bold";
      el.innerHTML = "🎪";
      
      new mapboxgl.Marker(el)
        .setLngLat([event.longitude, event.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <h3 class="font-bold text-sm">${event.name}</h3>
              <p class="text-xs text-muted-foreground">${event.city}</p>
            </div>`
          )
        )
        .addTo(map.current!);
    });

    // Add item markers
    items.forEach((item) => {
      const el = document.createElement("div");
      el.className = "w-6 h-6 bg-primary rounded-full border-2 border-background shadow-md cursor-pointer";
      
      new mapboxgl.Marker(el)
        .setLngLat([item.longitude, item.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <h3 class="font-semibold text-xs">${item.title}</h3>
              <p class="text-sm font-bold text-primary">$${item.price}</p>
            </div>`
          )
        )
        .addTo(map.current!);
    });

    return () => {
      map.current?.remove();
    };
  }, [items, events, center, zoom]);

  return <div ref={mapContainer} className="w-full h-[500px] rounded-lg overflow-hidden" />;
};

export default MapView;
