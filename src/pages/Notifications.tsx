import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import { useAuth } from "@/contexts/AuthContext";
import { useNotificationQueue } from "@/hooks/useNotificationQueue";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Clock, Trophy, Package, TrendingUp, CheckCheck, Inbox, Heart, ArrowUpRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "auction_ending":
      return <Clock className="h-5 w-5 text-orange-500" />;
    case "auction_won":
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case "auction_ended":
      return <Package className="h-5 w-5 text-blue-500" />;
    case "outbid":
      return <ArrowUpRight className="h-5 w-5 text-destructive" />;
    case "new_listing":
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    case "price_drop":
      return <Heart className="h-5 w-5 text-pink-500" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
};

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotificationQueue();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Notifications | Grail Seeker</title>
        <meta name="description" content="View your auction alerts, winner notifications, and updates" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Notifications</h1>
              <p className="text-muted-foreground">
                Stay updated on your auctions, sales, and followed sellers
              </p>
            </div>
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline" size="sm">
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read ({unreadCount})
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Loading notifications...</p>
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 px-4">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <Inbox className="h-7 w-7 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-1.5">You're all caught up</h2>
              <p className="text-sm text-muted-foreground text-center max-w-xs mb-1">
                Notifications about orders, messages, and account updates will appear here.
              </p>
              <p className="text-xs text-muted-foreground/70 text-center max-w-xs">
                You'll only see notifications when something needs your attention.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`transition-all hover:shadow-md ${
                  !notification.sent ? "border-primary/50 bg-accent/20" : ""
                }`}
              >
                <CardContent className="p-6">
                  <Link
                    to={notification.link || "#"}
                    onClick={() => !notification.sent && markAsRead(notification.id)}
                    className="block"
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              {notification.title}
                              {!notification.sent && (
                                <Badge variant="default" className="text-xs">New</Badge>
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm">{notification.message}</p>
                        {notification.data?.checkout_url && (
                          <Button 
                            size="sm" 
                            className="mt-2"
                            onClick={(e) => {
                              e.preventDefault();
                              window.open(notification.data.checkout_url, '_blank');
                            }}
                          >
                            Complete Purchase
                          </Button>
                        )}
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
