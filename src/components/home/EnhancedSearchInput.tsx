import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SearchSuggestion {
  id: string;
  title: string;
  subtitle?: string;
}

const POPULAR_SEARCHES = [
  "Amazing Spider-Man #300",
  "Hulk 181",
  "Ultimate Fallout 4",
  "Batman 423",
  "X-Men keys",
];

export function EnhancedSearchInput() {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch autosuggest results
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data: inventoryData, error } = await supabase
          .from("inventory_items")
          .select("id, title, series, issue_number, grade, cgc_grade")
          .or(`title.ilike.%${searchQuery}%,series.ilike.%${searchQuery}%,issue_number.ilike.%${searchQuery}%`)
          .eq("listing_status", "active")
          .limit(5);

        if (error) throw error;

        const suggestions: SearchSuggestion[] = (inventoryData || []).map((item) => {
          const subtitle = [
            item.cgc_grade && `CGC ${item.cgc_grade}`,
            item.grade,
          ]
            .filter(Boolean)
            .join(" • ");

          return {
            id: item.id,
            title: item.title || `${item.series} ${item.issue_number ? `#${item.issue_number}` : ""}`.trim(),
            subtitle: subtitle || undefined,
          };
        });

        setSuggestions(suggestions);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.title);
    navigate(`/search?q=${encodeURIComponent(suggestion.title)}`);
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const handlePopularSearchClick = (search: string) => {
    setSearchQuery(search);
    navigate(`/search?q=${encodeURIComponent(search)}`);
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowDropdown(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay to allow click events on dropdown items
    setTimeout(() => {
      if (!inputRef.current?.matches(':focus')) {
        setShowDropdown(false);
      }
    }, 200);
  };

  const showPopularSearches = isFocused && !searchQuery.trim();
  const showSuggestions = isFocused && searchQuery.trim() && suggestions.length > 0;

  return (
    <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative">
      <div className="relative">
        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground z-10" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Hunt: ASM 300, Hulk 181, CGC 9.8 slabs..."
          className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-4 rounded-full border-2 border-border bg-white text-sm sm:text-lg focus:border-primary focus:outline-none min-h-[44px] sm:min-h-[48px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] focus:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all"
        />
      </div>

      {/* Dropdown */}
      {showDropdown && (showPopularSearches || showSuggestions) && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-border rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.18)] overflow-hidden z-[100] max-h-[320px] overflow-y-auto"
        >
          {showPopularSearches && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Popular searches
              </div>
              {POPULAR_SEARCHES.map((search, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handlePopularSearchClick(search)}
                  className="w-full text-left px-3 py-2.5 hover:bg-accent rounded-lg transition-colors flex items-center gap-2 group"
                >
                  <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm sm:text-base">{search}</span>
                </button>
              ))}
            </div>
          )}

          {showSuggestions && (
            <div className="p-2">
              {isLoading ? (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  Loading suggestions...
                </div>
              ) : (
                suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-3 py-2.5 hover:bg-accent rounded-lg transition-colors"
                  >
                    <div className="text-sm sm:text-base font-medium">{suggestion.title}</div>
                    {suggestion.subtitle && (
                      <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        {suggestion.subtitle}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
