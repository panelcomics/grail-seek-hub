import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

/**
 * Legacy SellComic page - now redirects to unified ManageBook page
 * Kept for backward compatibility with old bookmarks/links
 */
export default function SellComic() {
  const { comicId } = useParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (comicId) {
      navigate(`/inventory/${comicId}`, { replace: true });
    } else {
      navigate("/my-inventory", { replace: true });
    }
  }, [comicId, navigate]);

  return (
    <main className="flex-1 container py-8 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </main>
  );
}
