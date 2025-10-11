import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, Bell, User, LogOut, HelpCircle, Moon, Sun, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LayoutProps {
  children: ReactNode;
  title: string;
}

const Layout = ({ children, title }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const navItems = userRole === 'admin' 
    ? [
        { icon: Home, label: 'Dashboard', path: '/admin' },
        { icon: FileText, label: 'Tickets', path: '/admin/tickets' },
        { icon: Users, label: 'Users', path: '/admin/users' },
        { icon: HelpCircle, label: 'Help', path: '/help' },
      ]
    : [
        { icon: Home, label: 'Home', path: '/student' },
        { icon: FileText, label: 'Requests', path: '/student/requests' },
        { icon: Bell, label: 'Announcements', path: '/announcements' },
        { icon: User, label: 'Profile', path: '/profile' },
      ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">{title}</h1>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary-foreground hover:bg-primary/90"
                >
                  {theme === 'dark' ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {userRole === 'admin' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/profile')}
                className="text-primary-foreground hover:bg-primary/90"
              >
                <User className="h-5 w-5" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-primary-foreground hover:bg-primary/90"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-7xl mx-auto p-4">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg">
        <div className="max-w-7xl mx-auto px-2 py-2">
          <div className="flex justify-around items-center">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${
                  isActive(item.path)
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
