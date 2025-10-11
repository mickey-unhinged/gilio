import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import StudentRequests from "./pages/StudentRequests";
import NewTicket from "./pages/NewTicket";
import TicketDetail from "./pages/TicketDetail";
import AdminDashboard from "./pages/AdminDashboard";
import Announcements from "./pages/Announcements";
import Profile from "./pages/Profile";
import Help from "./pages/Help";
import AdminManagement from "./pages/AdminManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/requests" element={<StudentRequests />} />
            <Route path="/student/requests/new" element={<NewTicket />} />
            <Route path="/student/requests/:id" element={<TicketDetail />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/tickets" element={<AdminDashboard />} />
            <Route path="/admin/tickets/:id" element={<TicketDetail />} />
            <Route path="/admin/announcements" element={<Announcements />} />
            <Route path="/admin/users" element={<AdminManagement />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/help" element={<Help />} />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
