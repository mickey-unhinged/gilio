import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Megaphone } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

const Announcements = () => {
  const { user, userRole } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();

    // Subscribe to new announcements
    const channel = supabase
      .channel('announcements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
        },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for each announcement
      const announcementsWithProfiles = await Promise.all(
        (data || []).map(async (announcement) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', announcement.posted_by)
            .single();

          return {
            ...announcement,
            profiles: profile || { full_name: 'Administrator' },
          };
        })
      );

      setAnnouncements(announcementsWithProfiles);
    } catch (error: any) {
      toast.error('Error loading announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const message = formData.get('message') as string;

    try {
      const { error } = await supabase
        .from('announcements')
        .insert([
          {
            title,
            message,
            posted_by: user.id,
          },
        ]);

      if (error) throw error;

      toast.success('Announcement posted!');
      setOpen(false);
      fetchAnnouncements();
      e.currentTarget.reset();
    } catch (error: any) {
      toast.error('Error posting announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const isAdmin = userRole === 'admin';

  if (loading) {
    return (
      <Layout title="Announcements">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Announcements">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Announcements</h2>
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Announcement</DialogTitle>
                  <DialogDescription>
                    Post a new announcement for all students
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="Announcement title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Announcement message"
                      rows={4}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting} className="flex-1">
                      Post
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {announcements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No announcements yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{announcement.title}</CardTitle>
                  <CardDescription>
                    Posted by {announcement.profiles.full_name} •{' '}
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{announcement.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Announcements;
