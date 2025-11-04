import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MessageSquare, MapPin, Eye, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";

interface TradePost {
  id: string;
  user_id: string;
  title: string;
  description: string;
  offering_items: string[];
  seeking_items: string[];
  location_city?: string;
  location_state?: string;
  view_count: number;
  created_at: string;
}

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
}

export default function TradeBoard() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<TradePost[]>([]);
  const [selectedPost, setSelectedPost] = useState<TradePost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [newComment, setNewComment] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [offering, setOffering] = useState("");
  const [seeking, setSeeking] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationState, setLocationState] = useState("");

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('trade_posts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load trade posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('trade_comments')
        .select('*')
        .eq('trade_post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
    }
  };

  const createPost = async () => {
    if (!title || !description || !offering || !seeking) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to create a post');
        navigate('/auth');
        return;
      }

      const { error } = await supabase
        .from('trade_posts')
        .insert({
          user_id: user.id,
          title,
          description,
          offering_items: offering.split(',').map(i => i.trim()),
          seeking_items: seeking.split(',').map(i => i.trim()),
          location_city: locationCity || null,
          location_state: locationState || null
        });

      if (error) throw error;

      toast.success('Trade post created!');
      setDialogOpen(false);
      resetForm();
      fetchPosts();
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error(error.message || 'Failed to create post');
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !selectedPost) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to comment');
        return;
      }

      const { error } = await supabase
        .from('trade_comments')
        .insert({
          trade_post_id: selectedPost.id,
          user_id: user.id,
          comment_text: newComment.trim()
        });

      if (error) throw error;

      setNewComment("");
      fetchComments(selectedPost.id);
      toast.success('Comment added!');
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const openChat = async (post: TradePost) => {
    setSelectedPost(post);
    setChatOpen(true);
    await fetchComments(post.id);
    
    // Increment view count
    await supabase
      .from('trade_posts')
      .update({ view_count: post.view_count + 1 })
      .eq('id', post.id);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setOffering("");
    setSeeking("");
    setLocationCity("");
    setLocationState("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Trade Board</h1>
            <p className="text-muted-foreground">
              Connect with collectors and make trades
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Trade Post</DialogTitle>
                <DialogDescription>
                  List what you're offering and what you're looking for
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Trade X-Men for Jordan RC"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the condition and any details..."
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="offering">Offering * (comma separated)</Label>
                  <Input
                    id="offering"
                    placeholder="e.g., X-Men #94, X-Men #101"
                    value={offering}
                    onChange={(e) => setOffering(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="seeking">Seeking * (comma separated)</Label>
                  <Input
                    id="seeking"
                    placeholder="e.g., Michael Jordan RC, Kobe Bryant RC"
                    value={seeking}
                    onChange={(e) => setSeeking(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="New York"
                      value={locationCity}
                      onChange={(e) => setLocationCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      placeholder="NY"
                      value={locationState}
                      onChange={(e) => setLocationState(e.target.value)}
                    />
                  </div>
                </div>

                <Button onClick={createPost} className="w-full">
                  Create Post
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Trade Posts */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No trade posts yet</p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Post
                </Button>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="mb-2">{post.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            U
                          </AvatarFallback>
                        </Avatar>
                        <span>Trader</span>
                        <span>•</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        {post.location_city && (
                          <>
                            <span>•</span>
                            <MapPin className="h-3 w-3" />
                            <span>{post.location_city}, {post.location_state}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      <span>{post.view_count}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{post.description}</p>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-semibold mb-2">Offering:</p>
                      <div className="flex flex-wrap gap-2">
                        {post.offering_items.map((item, idx) => (
                          <Badge key={idx} variant="secondary">{item}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-2">Seeking:</p>
                      <div className="flex flex-wrap gap-2">
                        {post.seeking_items.map((item, idx) => (
                          <Badge key={idx} variant="outline">{item}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => openChat(post)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Trade Chat
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Trade Chat Dialog */}
        <Dialog open={chatOpen} onOpenChange={setChatOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{selectedPost?.title}</DialogTitle>
              <DialogDescription>Chat with the trader</DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col h-[400px]">
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-4 bg-muted/20 rounded-lg">
                {comments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="text-xs">
                          U
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-background p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">
                            Trader
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm">{comment.comment_text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addComment()}
                />
                <Button onClick={addComment} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
