import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search } from 'lucide-react';

interface Ticket {
  id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
    university: string;
  };
}

const AdminDashboard = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || userRole !== 'admin')) {
      navigate('/auth');
    }
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    if (user && userRole === 'admin') {
      fetchTickets();
    }
  }, [user, userRole]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile info for each ticket
      const ticketsWithProfiles = await Promise.all(
        (data || []).map(async (ticket) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, university')
            .eq('id', ticket.student_id)
            .single();

          return {
            ...ticket,
            profiles: profile || { full_name: 'Unknown', university: 'Unknown' },
          };
        })
      );

      setTickets(ticketsWithProfiles);
    } catch (error: any) {
      toast.error('Error loading tickets');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-500';
      case 'In Progress':
        return 'bg-blue-500';
      case 'Resolved':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesCategory = filter === 'all' || ticket.category === filter;
    const matchesSearch =
      ticket.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.profiles?.university.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const stats = {
    total: tickets.length,
    pending: tickets.filter((t) => t.status === 'Pending').length,
    inProgress: tickets.filter((t) => t.status === 'In Progress').length,
    resolved: tickets.filter((t) => t.status === 'Resolved').length,
  };

  if (authLoading || loading) {
    return (
      <Layout title="Admin Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tickets List */}
        <Card>
          <CardHeader>
            <CardTitle>All Tickets</CardTitle>
            <CardDescription>Manage student support requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tabs value={filter} onValueChange={setFilter} className="w-full">
              <TabsList className="grid grid-cols-3 lg:grid-cols-6 mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="Portal">Portal</TabsTrigger>
                <TabsTrigger value="Academics">Academics</TabsTrigger>
                <TabsTrigger value="Housing">Housing</TabsTrigger>
                <TabsTrigger value="Finance">Finance</TabsTrigger>
                <TabsTrigger value="Other">Other</TabsTrigger>
              </TabsList>

              <TabsContent value={filter} className="space-y-3">
                {filteredTickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No tickets found</p>
                  </div>
                ) : (
                  filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                      className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className={`mt-1 h-2 w-2 rounded-full ${getStatusColor(ticket.status)}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{ticket.category}</Badge>
                          <Badge variant={ticket.status === 'Pending' ? 'destructive' : 'default'}>
                            {ticket.status}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm mb-1">
                          {ticket.profiles?.full_name} - {ticket.profiles?.university}
                        </p>
                        <p className="text-sm line-clamp-2 text-muted-foreground">
                          {ticket.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(ticket.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
