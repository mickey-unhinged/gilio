import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';

const NewTicket = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const description = formData.get('description') as string;

    try {
      const { data, error } = await supabase
        .from('tickets')
        .insert([
          {
            student_id: user.id,
            category,
            description,
            status: 'Pending',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success('Request submitted successfully!');
      navigate('/student/requests');
    } catch (error: any) {
      toast.error(error.message || 'Error submitting request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="New Request">
      <Card>
        <CardHeader>
          <CardTitle>Submit a Support Request</CardTitle>
          <CardDescription>
            Describe your issue and we'll help you resolve it
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Portal">Portal Issues</SelectItem>
                  <SelectItem value="Academics">Academic Concerns</SelectItem>
                  <SelectItem value="Housing">Housing & Accommodation</SelectItem>
                  <SelectItem value="Finance">Finance & Fees</SelectItem>
                  <SelectItem value="Other">Other Student Affairs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Please describe your issue in detail..."
                rows={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachment">Attachment (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="attachment"
                  name="attachment"
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  disabled
                />
                <Button type="button" variant="outline" size="icon" disabled>
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                File uploads coming soon
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/student')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !category} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default NewTicket;
