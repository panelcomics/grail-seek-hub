import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, Send } from "lucide-react";
import { postTradeMessage } from "@/lib/trades/postTradeMessage";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface TradeMessage {
  id: string;
  trade_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender_username?: string;
}

interface TradeMessageThreadProps {
  tradeId: string;
  buyerId: string;
  sellerId: string;
}

export function TradeMessageThread({ tradeId, buyerId, sellerId }: TradeMessageThreadProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<TradeMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    
    // Set up realtime subscription
    const channel = supabase
      .channel(`trade-messages-${tradeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trade_messages',
          filter: `trade_id=eq.${tradeId}`
        },
        async (payload) => {
          console.log("[TRADE-CHAT] New message received via realtime:", payload);
          const newMsg = payload.new as TradeMessage;
          
          // Fetch sender username
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("user_id", newMsg.sender_id)
            .single();
          
          setMessages(prev => [...prev, {
            ...newMsg,
            sender_username: profile?.username || "Anonymous"
          }]);
          
          // Auto-scroll to bottom
          setTimeout(() => scrollToBottom(), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tradeId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("trade_messages")
        .select("id, trade_id, sender_id, message, created_at")
        .eq("trade_id", tradeId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[TRADE-CHAT] Error loading messages:", error);
        toast.error("Failed to load messages");
        return;
      }

      // Fetch sender usernames
      const messagesWithUsernames = await Promise.all(
        (data || []).map(async (msg) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("user_id", msg.sender_id)
            .single();
          
          return {
            ...msg,
            sender_username: profile?.username || "Anonymous"
          };
        })
      );

      setMessages(messagesWithUsernames);
    } catch (error) {
      console.error("[TRADE-CHAT] Exception loading messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    setIsSending(true);
    
    const result = await postTradeMessage({
      tradeId,
      senderId: user.id,
      message: newMessage,
    });

    setIsSending(false);

    if (result.ok) {
      setNewMessage("");
      // Message will be added via realtime subscription
    } else {
      toast.error(result.error || "Failed to send message");
    }
  };

  const isMyMessage = (senderId: string) => senderId === user?.id;

  const getSenderLabel = (senderId: string, username?: string) => {
    if (senderId === user?.id) return "You";
    if (senderId === buyerId) return username || "Buyer";
    if (senderId === sellerId) return username || "Seller";
    return username || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-3">Trade Negotiation</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Discuss trade details with the {user?.id === buyerId ? "seller" : "buyer"}
        </p>
      </div>

      <Separator />

      {/* Messages List */}
      <ScrollArea className="h-[300px] pr-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No messages yet. Start the conversation!
          </p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isMine = isMyMessage(msg.sender_id);
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-xs font-medium ${isMine ? "text-primary" : "text-muted-foreground"}`}>
                      {getSenderLabel(msg.sender_id, msg.sender_username)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      isMine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="space-y-2">
        <Textarea
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          className="min-h-[80px] resize-none"
          disabled={isSending}
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSendMessage}
            disabled={isSending || !newMessage.trim()}
            size="sm"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
