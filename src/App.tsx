import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Footer from "./components/Footer";
import Index from "./pages/Index";
import ItemDetail from "./pages/ItemDetail";
import Auth from "./pages/Auth";
import Scanner from "./pages/Scanner";
import ResultDetail from "./pages/scanner/ResultDetail";
import Portfolio from "./pages/Portfolio";
import Deals from "./pages/Deals";
import Profile from "./pages/Profile";
import TradeBoard from "./pages/TradeBoard";
import Events from "./pages/Events";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Settings from "./pages/Settings";
import ArtistVerification from "./pages/ArtistVerification";
import CreateClaimSale from "./pages/CreateClaimSale";
import ClaimSaleDetail from "./pages/ClaimSaleDetail";
import SellerDashboard from "./pages/SellerDashboard";
import Dashboard from "./pages/Dashboard";
import MyOrders from "./pages/MyOrders";
import Messages from "./pages/Messages";
import OrderDetail from "./pages/OrderDetail";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import Watchlist from "./pages/Watchlist";
import Leaderboard from "./pages/Leaderboard";
import AdminFeaturedShops from "./pages/AdminFeaturedShops";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminSettings from "./pages/admin/Settings";
import UploadOriginalArt from "./pages/admin/UploadOriginalArt";
import ManageOriginalArt from "./pages/admin/ManageOriginalArt";
import InviteArtist from "./pages/admin/InviteArtist";
import MyOriginalArt from "./pages/artist/MyOriginalArt";
import MyCollection from "./pages/MyCollection";
import MyInventory from "./pages/MyInventory";
import SellerStats from "./pages/SellerStats";
import MyAccount from "./pages/MyAccount";
import Sellers from "./pages/Sellers";
import SellerProfile from "./pages/SellerProfile";
import FeesPolicy from "./pages/FeesPolicy";
import Help from "./pages/Help";
import DevScanTest from "./pages/DevScanTest";
import SellComic from "./pages/SellComic";
import Marketplace from "./pages/Marketplace";
import ListingDetail from "./pages/ListingDetail";
import Orders from "./pages/Orders";
import Search from "./pages/Search";
import { ModalProvider } from "./contexts/ModalContext";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const hideFooter = location.pathname === "/auth";

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/item/:id" element={<ItemDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/search" element={<Search />} />
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/scanner/result" element={<ResultDetail />} />
            <Route path="/sell/:comicId" element={<SellComic />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/trade-board" element={<TradeBoard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/artist-verification" element={<ArtistVerification />} />
            <Route path="/sell/claim-sale" element={<CreateClaimSale />} />
            <Route path="/claim-sale/:id" element={<ClaimSaleDetail />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/seller/dashboard" element={<SellerDashboard />} />
            <Route path="/order/:id" element={<OrderDetail />} />
            <Route path="/checkout/:orderId" element={<Checkout />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/admin/featured-shops" element={<AdminFeaturedShops />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/original-art/upload" element={<UploadOriginalArt />} />
            <Route path="/admin/original-art/manage" element={<ManageOriginalArt />} />
            <Route path="/admin/invite-artist" element={<InviteArtist />} />
            <Route path="/artist/my-art" element={<MyOriginalArt />} />
            <Route path="/my-collection" element={<MyCollection />} />
            <Route path="/my-inventory" element={<MyInventory />} />
            <Route path="/inventory" element={<MyInventory />} />
            <Route path="/sell/stats" element={<SellerStats />} />
            <Route path="/my-account" element={<MyAccount />} />
            <Route path="/sellers" element={<Sellers />} />
            <Route path="/seller/:slug" element={<SellerProfile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/fees" element={<FeesPolicy />} />
            <Route path="/help" element={<Help />} />
            <Route path="/dev/scan-test" element={<DevScanTest />} />
            <Route path="/market" element={<Marketplace />} />
            <Route path="/marketplace" element={<Marketplace />} /> {/* redirect old route */}
            <Route path="/l/:id" element={<ListingDetail />} />
            <Route path="/listing/:id" element={<ListingDetail />} /> {/* redirect old route */}
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        {!hideFooter && <Footer />}
      </div>
    );
  };

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ModalProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ModalProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
