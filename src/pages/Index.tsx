import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageCircle, GraduationCap, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && userRole) {
      if (userRole === 'admin') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    }
  }, [user, userRole, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-secondary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-secondary flex flex-col items-center justify-center p-4 text-white">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="h-10 w-10" />
          </div>
          <GraduationCap className="h-16 w-16" />
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">Gilio</h1>
          <p className="text-xl font-medium opacity-90">Simplifying Student Support</p>
          <p className="text-lg opacity-75 max-w-md mx-auto">
            Get fast, organized assistance from your university administration
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Button
            onClick={() => navigate('/auth')}
            size="lg"
            className="bg-white text-primary hover:bg-white/90 font-semibold"
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h3 className="font-semibold mb-2">Submit Issues</h3>
            <p className="text-sm opacity-80">
              Report portal problems, academic concerns, and more
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h3 className="font-semibold mb-2">Track Progress</h3>
            <p className="text-sm opacity-80">
              Monitor your requests in real-time with status updates
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h3 className="font-semibold mb-2">Get Support</h3>
            <p className="text-sm opacity-80">
              Chat directly with administration for quick resolutions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
