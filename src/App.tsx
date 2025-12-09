import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import Footer from "./components/Footer";
import Index from "./pages/Index";
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
import AdminVerifiedSellersPage from "./pages/admin/VerifiedSellers";
import ManageSellers from "./pages/admin/ManageSellers";
import UploadOriginalArt from "./pages/admin/UploadOriginalArt";
import ManageOriginalArt from "./pages/admin/ManageOriginalArt";
import InviteArtist from "./pages/admin/InviteArtist";
import ComicVineSync from "./pages/admin/ComicVineSync";
import ComicVineIssuesSync from "./pages/admin/ComicVineIssuesSync";
import MyOriginalArt from "./pages/artist/MyOriginalArt";
import MyCollection from "./pages/MyCollection";
import MyInventory from "./pages/MyInventory";
import SellerStats from "./pages/SellerStats";
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
import EbaySearch from "./pages/EbaySearch";
import TradingPost from "./pages/TradingPost";
import TradeDetail from "./pages/TradeDetail";
import TradeOffers from "./pages/TradeOffers";
import TradeCreate from "./pages/TradeCreate";
import MyTrades from "./pages/MyTrades";
import Sell from "./pages/Sell";
import About from "./pages/About";
import ManageBook from "./pages/ManageBook";
import MyOffersAndTrades from "./pages/MyOffersAndTrades";
import DevTestCheckout from "./pages/DevTestCheckout";
import Onboarding from "./pages/Onboarding";
import SellerSetup from "./pages/SellerSetup";
import SellerOnboarding from "./pages/SellerOnboarding";
import SellerRulesFees from "./pages/SellerRulesFees";
import Crowdfund from "./pages/Crowdfund";
import CrowdfundLaunch from "./pages/CrowdfundLaunch";
import CrowdfundMyProjects from "./pages/CrowdfundMyProjects";
import CampaignDetail from "./pages/CampaignDetail";
import CrowdfundMyPledges from "./pages/CrowdfundMyPledges";
import CreatorApply from "./pages/creators/Apply";
import CreatorDashboard from "./pages/creators/Dashboard";
import CreatorAdmin from "./pages/creators/Admin";
import CreatorProfile from "./pages/creators/CreatorProfile";
import CreatorDirectory from "./pages/creators/Directory";
import SavedSearches from "./pages/SavedSearches";
import Plans from "./pages/Plans";
import EliteDeals from "./pages/elite/Deals";
import HelpFees from "./pages/help/Fees";
import HelpSelling from "./pages/help/Selling";
import HelpTrading from "./pages/help/Trading";
import HelpReturns from "./pages/help/Returns";
import HelpBuyerProtection from "./pages/help/BuyerProtection";
import SettingsNotifications from "./pages/SettingsNotifications";
import { ModalProvider } from "./contexts/ModalContext";
import { BetaBanner } from "./components/BetaBanner";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const hideFooter = location.pathname === "/auth";

  return (
    <div className="flex flex-col min-h-screen">
      <BetaBanner />
      <AppLayout>
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/seller-setup" element={<SellerSetup />} />
            <Route path="/seller-onboarding" element={<SellerOnboarding />} />
            <Route path="/seller-rules-fees" element={<SellerRulesFees />} />
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
            <Route path="/admin/verified-sellers" element={<AdminVerifiedSellersPage />} />
            <Route path="/admin/sellers" element={<AdminVerifiedSellersPage />} />
            <Route path="/admin/manage-sellers" element={<ManageSellers />} />
            <Route path="/admin/original-art/upload" element={<UploadOriginalArt />} />
            <Route path="/admin/original-art/manage" element={<ManageOriginalArt />} />
            <Route path="/admin/invite-artist" element={<InviteArtist />} />
            <Route path="/admin/comicvine-sync" element={<ComicVineSync />} />
            <Route path="/admin/comicvine-issues-sync" element={<ComicVineIssuesSync />} />
            <Route path="/artist/my-art" element={<MyOriginalArt />} />
            <Route path="/my-collection" element={<MyCollection />} />
            <Route path="/my-inventory" element={<MyInventory />} />
            <Route path="/inventory" element={<MyInventory />} />
            <Route path="/inventory/:id" element={<ManageBook />} />
            <Route path="/sell/stats" element={<SellerStats />} />
            
            <Route path="/sellers" element={<Sellers />} />
            <Route path="/seller/:slug" element={<SellerProfile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/fees" element={<FeesPolicy />} />
            <Route path="/help" element={<Help />} />
            <Route path="/about" element={<About />} />
            <Route path="/sell" element={<Sell />} />
            <Route path="/dev/scan-test" element={<DevScanTest />} />
            <Route path="/dev/test-checkout" element={<DevTestCheckout />} />
            <Route path="/market" element={<Marketplace />} />
            <Route path="/marketplace" element={<Marketplace />} /> {/* redirect old route */}
            <Route path="/l/:id" element={<ListingDetail />} />
            <Route path="/listing/:id" element={<ListingDetail />} /> {/* redirect old route */}
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/ebay-search" element={<EbaySearch />} />
            <Route path="/trading-post" element={<TradingPost />} />
            <Route path="/trades" element={<MyTrades />} />
            <Route path="/trade/create" element={<TradeCreate />} />
            <Route path="/trade/:id" element={<TradeDetail />} />
            <Route path="/trade-offers" element={<TradeOffers />} />
            <Route path="/account/offers" element={<MyOffersAndTrades />} />
            <Route path="/crowdfund" element={<Crowdfund />} />
            <Route path="/crowdfund/launch" element={<CrowdfundLaunch />} />
            <Route path="/crowdfund/my-projects" element={<CrowdfundMyProjects />} />
            <Route path="/crowdfund/my-pledges" element={<CrowdfundMyPledges />} />
            <Route path="/crowdfund/campaign/:slug" element={<CampaignDetail />} />
            <Route path="/creators/apply" element={<CreatorApply />} />
            <Route path="/creators/dashboard" element={<CreatorDashboard />} />
            <Route path="/creators/admin" element={<CreatorAdmin />} />
            <Route path="/creators/:slug" element={<CreatorProfile />} />
            <Route path="/creators" element={<CreatorDirectory />} />
            <Route path="/saved-searches" element={<SavedSearches />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/elite/deals" element={<EliteDeals />} />
            <Route path="/help/fees" element={<HelpFees />} />
            <Route path="/help/selling" element={<HelpSelling />} />
            <Route path="/help/trading" element={<HelpTrading />} />
            <Route path="/help/returns" element={<HelpReturns />} />
            <Route path="/help/buyer-protection" element={<HelpBuyerProtection />} />
            <Route path="/settings/notifications" element={<SettingsNotifications />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        {!hideFooter && <Footer />}
      </AppLayout>
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
