import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to top of page on every route change.
 * Must be placed inside <BrowserRouter>.
 */
export function ScrollToTopOnNavigate() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
