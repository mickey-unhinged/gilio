import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const PendingApproval = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <Layout title="Awaiting Admin Verification">
      <main className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Awaiting Admin Verification</CardTitle>
            <CardDescription>
              Your account was registered as an Admin but is not yet verified by your university. 
              Once a verified admin approves you, you’ll gain access to the admin tools.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you believe this is taking too long, please contact an existing verified admin at your university.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate('/')}>Go Home</Button>
              <Button variant="outline" onClick={signOut}>Sign Out</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
};

export default PendingApproval;
