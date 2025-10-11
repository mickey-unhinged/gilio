import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Ticket as TicketIcon } from 'lucide-react';
import { format } from 'date-fns';

interface Ticket {
  id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
  student_id: string;
  profiles?: { full_name: string } | null;
}

const Tickets = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchTickets();
    subscribeToTickets();
  }, [user, userRole]);

  const fetchTickets = async () => {
    try {
      let query = supabase.from('tickets').select(`
        *,
        profiles:student_id (full_name)
      `);

      if (userRole === 'student') {
        query = query.eq('student_id', user?.id);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToTickets = () => {
    const channel = supabase
      .channel('tickets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        fetchTickets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === 'all' ||
      ticket.status.toLowerCase().replace(' ', '-') === activeTab;

    return matchesSearch && matchesTab;
  });

  if (loading) {
    return (
      <Layout title="Tickets">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Support Tickets">
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-6">
            {filteredTickets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <TicketIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No tickets found</p>
                </CardContent>
              </Card>
            ) : (
              filteredTickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/ticket/${ticket.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{ticket.category}</CardTitle>
                        {userRole === 'admin' && ticket.profiles && (
                          <CardDescription>Student: {ticket.profiles.full_name}</CardDescription>
                        )}
                      </div>
                      <Badge
                        variant={
                          ticket.status === 'Resolved'
                            ? 'default'
                            : ticket.status === 'In Progress'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {ticket.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {ticket.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created {format(new Date(ticket.created_at), 'PPp')}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Tickets;
