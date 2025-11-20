import { useEffect, useState } from "react";

const TICKER_MESSAGES = [
  "🔥 AF #15 9.8 ending in 4h 22m – Current bid $48,200",
  "💎 Hulk #181 9.6 ending soon $12,350",
  "⚡ ASM #300 9.4 – 2h left – Bid: $8,900",
  "🎯 Spawn #1 Black & White CGC 9.8 – 6h remaining – $4,200",
  "🔴 Batman #1 (1940) CGC 3.5 – Ending today – $18,500",
  "⭐ X-Men #1 CGC 9.2 – Last chance – $22,100",
];

export function LiveAuctionsTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % TICKER_MESSAGES.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#E60000] text-white py-1.5 md:py-2 px-3 md:px-4 overflow-hidden border-y border-red-700/30">
      <div className="container mx-auto">
        <div className="flex items-center justify-center gap-2 md:gap-3 animate-in fade-in-0 duration-500" key={currentIndex}>
          <span className="text-xs md:text-sm lg:text-base font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-full ticker-scroll">
            {TICKER_MESSAGES[currentIndex]}
          </span>
          <span className="hidden md:inline text-xs lg:text-sm opacity-80 whitespace-nowrap">
            • +12 more ending today
          </span>
        </div>
      </div>
    </div>
  );
}
