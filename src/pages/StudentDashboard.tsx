import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
}

const StudentDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setTickets(data || []);
    } catch (error: any) {
      toast.error('Error loading tickets');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Clock className="h-4 w-4" />;
      case 'In Progress':
        return <AlertCircle className="h-4 w-4" />;
      case 'Resolved':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return null;
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

  if (authLoading || loading) {
    return (
      <Layout title="Student Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const stats = {
    total: tickets.length,
    pending: tickets.filter((t) => t.status === 'Pending').length,
    inProgress: tickets.filter((t) => t.status === 'In Progress').length,
    resolved: tickets.filter((t) => t.status === 'Resolved').length,
  };

  return (
    <Layout title="Home">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary to-secondary rounded-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">Welcome Back!</h2>
          <p className="opacity-90">Need help? Submit a request and we'll assist you.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
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

        {/* Recent Requests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Requests</CardTitle>
                <CardDescription>Your latest support tickets</CardDescription>
              </div>
              <Button onClick={() => navigate('/student/requests/new')} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No requests yet</p>
                <p className="text-sm mt-2">Create your first request to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => navigate(`/student/requests/${ticket.id}`)}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className={`mt-1 h-2 w-2 rounded-full ${getStatusColor(ticket.status)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {ticket.category}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {getStatusIcon(ticket.status)}
                          <span>{ticket.status}</span>
                        </div>
                      </div>
                      <p className="text-sm line-clamp-2">{ticket.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default StudentDashboard;
