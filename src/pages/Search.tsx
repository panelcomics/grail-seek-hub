import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function SearchPage() {
  const [q, setQ] = useState("");
  // TODO: call your search endpoint / Supabase RPC
  
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <div className="mx-auto max-w-screen-md p-4">
          <h1 className="text-2xl font-bold mb-3">Search</h1>
          <Input
            placeholder="Search your collection, marketplace, creators…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {/* results list here */}
          {q && (
            <div className="mt-4 text-muted-foreground text-sm">
              Search results for "{q}" will appear here
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
