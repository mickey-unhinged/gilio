import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { UserIcon, Search, ShieldCheck, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  university: string;
  photo_url?: string;
  role?: string;
  is_verified?: boolean;
  ticket_stats?: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
  };
}

interface Ticket {
  id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
}

const AdminManagement = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [pendingAdmins, setPendingAdmins] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [studentTickets, setStudentTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    if (userRole !== 'admin') {
      navigate('/auth');
      return;
    }
    fetchUsers();
  }, [userRole]);

  const fetchUsers = async () => {
    try {
      // Get current admin's university
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('university')
        .eq('id', user?.id)
        .single();

      if (!adminProfile) return;

      // Fetch all profiles from same university
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('university', adminProfile.university)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles and ticket stats for each user
      const usersWithData = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role, is_verified')
            .eq('user_id', profile.id)
            .single();

          // Fetch ticket stats for students
          let ticketStats = { total: 0, pending: 0, inProgress: 0, resolved: 0 };
          if (roleData?.role === 'student') {
            const { data: tickets } = await supabase
              .from('tickets')
              .select('status')
              .eq('student_id', profile.id);

            ticketStats = {
              total: tickets?.length || 0,
              pending: tickets?.filter((t) => t.status === 'Pending').length || 0,
              inProgress: tickets?.filter((t) => t.status === 'In Progress').length || 0,
              resolved: tickets?.filter((t) => t.status === 'Resolved').length || 0,
            };
          }

          return {
            ...profile,
            role: roleData?.role || 'student',
            is_verified: roleData?.is_verified || false,
            ticket_stats: ticketStats,
          };
        })
      );

      setStudents(usersWithData.filter((u) => u.role === 'student' && u.ticket_stats!.total > 0));
      setPendingAdmins(usersWithData.filter((u) => u.role === 'admin' && !u.is_verified));
    } catch (error: any) {
      toast.error('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentTickets = async (studentId: string) => {
    setLoadingTickets(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudentTickets(data || []);
    } catch (error) {
      toast.error('Failed to load tickets');
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleVerifyAdmin = async (adminId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_verified: true })
        .eq('user_id', adminId);

      if (error) throw error;
      toast.success('Admin verified successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to verify admin');
    }
  };

  const handleRejectAdmin = async (adminId: string) => {
    try {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', adminId);

      if (error) throw error;
      toast.success('Admin rejected');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to reject admin');
    }
  };

  const handleStudentClick = (student: UserProfile) => {
    setSelectedStudent(student);
    fetchStudentTickets(student.id);
  };

  const filteredStudents = students.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    students: students.length,
    pending: pendingAdmins.length,
  };

  if (loading) {
    return (
      <Layout title="User Management">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="User Management">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Students with Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.students}</div>
              <p className="text-xs text-muted-foreground mt-1">From your university</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting verification</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="students">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="admins">Pending Admins</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Students with Tickets</CardTitle>
                <CardDescription>Click on a student to view their tickets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-3">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No students found</p>
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleStudentClick(student)}
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={student.photo_url} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <UserIcon className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{student.full_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{student.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">{student.ticket_stats?.total} tickets</Badge>
                          {student.ticket_stats!.pending > 0 && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              {student.ticket_stats?.pending} pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admins" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Admin Verifications</CardTitle>
                <CardDescription>Review and approve admin accounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingAdmins.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No pending verifications</p>
                  </div>
                ) : (
                  pendingAdmins.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={admin.photo_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <ShieldCheck className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{admin.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">{admin.email}</p>
                        <p className="text-xs text-muted-foreground">{admin.university}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleVerifyAdmin(admin.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectAdmin(admin.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedStudent?.full_name}'s Tickets</DialogTitle>
            <DialogDescription>
              {selectedStudent?.ticket_stats?.total} total tickets •{' '}
              {selectedStudent?.ticket_stats?.pending} pending •{' '}
              {selectedStudent?.ticket_stats?.inProgress} in progress •{' '}
              {selectedStudent?.ticket_stats?.resolved} resolved
            </DialogDescription>
          </DialogHeader>

          {loadingTickets ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {studentTickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setSelectedStudent(null);
                    navigate(`/ticket/${ticket.id}`);
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{ticket.category}</CardTitle>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {ticket.description}
                        </p>
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
                    <p className="text-xs text-muted-foreground">
                      Created {format(new Date(ticket.created_at), 'PPp')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminManagement;
