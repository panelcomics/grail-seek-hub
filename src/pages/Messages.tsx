import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toastSuccess, toastError } from "@/lib/toastUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Send, 
  Image as ImageIcon, 
  ArrowLeft,
  Loader2,
  Package
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  sender_id: string;
  text: string;
  image_url: string | null;
  created_at: string;
}

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  sale_id: string;
  last_message_time: string;
  sale_title: string;
  other_user_id: string;
  other_user_email: string;
  is_buyer: boolean;
}

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get("conversation");
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchConversations();
  }, [user, navigate]);

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        selectConversation(conv);
      }
    }
  }, [conversationId, conversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`messages:${selectedConversation.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${selectedConversation.id}`,
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new as Message]);
            scrollToBottom();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      
      // Fetch conversations where user is buyer or seller
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select(`
          id,
          buyer_id,
          seller_id,
          sale_id,
          last_message_time,
          claim_sales (
            title
          )
        `)
        .or(`buyer_id.eq.${user?.id},seller_id.eq.${user?.id}`)
        .order("last_message_time", { ascending: false });

      if (convError) throw convError;

      // Fetch profile info for other users
      const enrichedConvs: Conversation[] = await Promise.all(
        convData?.map(async (conv: any) => {
          const isBuyer = conv.buyer_id === user?.id;
          const otherUserId = isBuyer ? conv.seller_id : conv.buyer_id;
          
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username")
            .eq("user_id", otherUserId)
            .single();

          return {
            id: conv.id,
            buyer_id: conv.buyer_id,
            seller_id: conv.seller_id,
            sale_id: conv.sale_id,
            last_message_time: conv.last_message_time,
            sale_title: conv.claim_sales?.title || "Unknown Sale",
            other_user_id: otherUserId,
            other_user_email: profileData?.username || "User",
            is_buyer: isBuyer,
          };
        }) || []
      );

      setConversations(enrichedConvs);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toastError.generic("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toastError.generic("Failed to load messages");
    }
  };

  const selectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    navigate(`/messages?conversation=${conv.id}`);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    try {
      setIsSending(true);
      
      const { error } = await supabase
        .from("messages")
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user?.id,
          text: newMessage.trim(),
        });

      if (error) throw error;

      // Update conversation last_message_time
      await supabase
        .from("conversations")
        .update({ last_message_time: new Date().toISOString() })
        .eq("id", selectedConversation.id);

      setNewMessage("");
      toastSuccess.messageSent();
    } catch (error: any) {
      console.error("Error sending message:", error);
      toastError.generic("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    try {
      setIsUploading(true);

      // Upload to storage
      const fileName = `${user?.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("chat-images")
        .getPublicUrl(fileName);

      // Send message with image
      const { error } = await supabase
        .from("messages")
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user?.id,
          text: "📷 Image",
          image_url: publicUrl,
        });

      if (error) throw error;

      // Update conversation last_message_time
      await supabase
        .from("conversations")
        .update({ last_message_time: new Date().toISOString() })
        .eq("id", selectedConversation.id);

      toastSuccess.messageSent();
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toastError.uploadFailed();
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-12 px-4 mt-20">
          <p className="text-center text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto mt-20 p-0">
        <div className="flex h-[calc(100vh-5rem)] border rounded-lg overflow-hidden bg-card">
          {/* Conversations List */}
          <div className={`${selectedConversation ? 'hidden md:block' : 'block'} w-full md:w-80 border-r`}>
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Messages</h2>
              <p className="text-sm text-muted-foreground">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <ScrollArea className="h-[calc(100vh-13rem)]">
              {conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No messages yet
                  </p>
                  <Button onClick={() => navigate("/my-orders")} size="sm">
                    View Your Orders
                  </Button>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`w-full p-4 text-left hover:bg-accent transition-colors border-b ${
                      selectedConversation?.id === conv.id ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {conv.other_user_email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium truncate">
                            {conv.other_user_email}
                          </span>
                          <Badge variant="outline" className="text-xs ml-2">
                            {conv.is_buyer ? 'Buyer' : 'Seller'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.sale_title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(conv.last_message_time).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          {selectedConversation ? (
            <div className="flex-1 flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => {
                    setSelectedConversation(null);
                    navigate("/messages");
                  }}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {selectedConversation.other_user_email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">
                    {selectedConversation.other_user_email}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.sale_title}
                  </p>
                </div>
                <Badge variant={selectedConversation.is_buyer ? "default" : "secondary"}>
                  {selectedConversation.is_buyer ? 'You are buyer' : 'You are seller'}
                </Badge>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isMine = message.sender_id === user?.id;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isMine ? 'order-2' : 'order-1'}`}>
                          <div
                            className={`rounded-2xl px-4 py-2 ${
                              isMine
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {message.image_url && (
                              <img
                                src={message.image_url}
                                alt="Uploaded"
                                className="rounded-lg mb-2 max-w-full h-auto cursor-pointer"
                                onClick={() => window.open(message.image_url || '', '_blank')}
                              />
                            )}
                            <p className="text-sm break-words">{message.text}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 px-2">
                            {new Date(message.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t">
                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ImageIcon className="h-5 w-5" />
                    )}
                  </Button>
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={isSending}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || isSending}
                    className="gap-2"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center bg-muted/20">
              <div className="text-center">
                <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
