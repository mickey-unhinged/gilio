import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Send, ArrowLeft } from 'lucide-react';

interface Ticket {
  id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
  student_id: string;
  profiles: {
    full_name: string;
  };
}

interface Chat {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

const TicketDetail = () => {
  const { id } = useParams();
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchTicket();
      fetchChats();
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`ticket-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chats',
            filter: `ticket_id=eq.${id}`,
          },
          () => {
            fetchChats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id, user]);

  const fetchTicket = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (!data) {
        throw new Error('Ticket not found');
      }
      
      // Fetch profile separately
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.student_id)
        .single();
      
      setTicket({
        ...data,
        profiles: profile || { full_name: 'Unknown' },
      });
    } catch (error: any) {
      toast.error('Error loading ticket');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  // When an admin opens a Pending ticket, auto-mark it as In Progress
  useEffect(() => {
    if (userRole === 'admin' && ticket && ticket.status === 'Pending') {
      (async () => {
        try {
          await supabase.from('tickets').update({ status: 'In Progress' }).eq('id', ticket.id);
          setTicket((prev) => (prev ? { ...prev, status: 'In Progress' } : prev));
        } catch (e) {
          // ignore; RLS will prevent if not allowed
        }
      })();
    }
  }, [ticket, userRole]);

  const fetchChats = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles separately for each chat
      const chatsWithProfiles = await Promise.all(
        (data || []).map(async (chat) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', chat.sender_id)
            .single();
          
          return {
            ...chat,
            profiles: profile || { full_name: 'Unknown' },
          };
        })
      );

      setChats(chatsWithProfiles);
    } catch (error: any) {
      console.error('Error loading chats:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || !id) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('chats')
        .insert([
          {
            ticket_id: id,
            sender_id: user.id,
            message: message.trim(),
          },
        ]);

      if (error) throw error;

      setMessage('');
      fetchChats();
    } catch (error: any) {
      toast.error('Error sending message');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success('Status updated');
      fetchTicket();
    } catch (error: any) {
      toast.error('Error updating status');
    }
  };

  if (loading) {
    return (
      <Layout title="Ticket Details">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!ticket) return null;

  const isAdmin = userRole === 'admin';

  return (
    <Layout title="Ticket Details">
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{ticket.category}</Badge>
                  {isAdmin ? (
                    <>
                      <Select value={ticket.status} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Resolved</span>
                        <Switch
                          checked={ticket.status === 'Resolved'}
                          onCheckedChange={(checked) =>
                            handleStatusChange(checked ? 'Resolved' : 'In Progress')
                          }
                        />
                      </div>
                    </>
                  ) : (
                    <Badge>{ticket.status}</Badge>
                  )}
                </div>
                {isAdmin && (
                  <p className="text-sm text-muted-foreground">
                    Student: {ticket.profiles.full_name}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h3 className="font-semibold">Description</h3>
              <p className="text-sm">{ticket.description}</p>
              <p className="text-xs text-muted-foreground">
                Created {new Date(ticket.created_at).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
            <CardDescription>Chat with {isAdmin ? 'student' : 'administration'}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {chats.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  chats.map((chat) => {
                    const isOwn = chat.sender_id === user?.id;
                    return (
                      <div
                        key={chat.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            isOwn
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-xs font-semibold mb-1">
                            {chat.profiles.full_name}
                          </p>
                          <p className="text-sm">{chat.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(chat.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            <form onSubmit={handleSendMessage} className="flex gap-2 mt-4">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={sending}
              />
              <Button type="submit" size="icon" disabled={sending || !message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TicketDetail;
