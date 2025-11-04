import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ItemDetail from "./pages/ItemDetail";
import Auth from "./pages/Auth";
import Scanner from "./pages/Scanner";
import Portfolio from "./pages/Portfolio";
import Deals from "./pages/Deals";
import Profile from "./pages/Profile";
import TradeBoard from "./pages/TradeBoard";
import Events from "./pages/Events";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Settings from "./pages/Settings";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/item/:id" element={<ItemDetail />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/trade-board" element={<TradeBoard />} />
          <Route path="/events" element={<Events />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/sell/claim-sale" element={<CreateClaimSale />} />
          <Route path="/claim-sale/:id" element={<ClaimSaleDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/seller/dashboard" element={<SellerDashboard />} />
          <Route path="/order/:id" element={<OrderDetail />} />
          <Route path="/checkout/:orderId" element={<Checkout />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
