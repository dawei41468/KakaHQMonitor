import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import Admin from "@/pages/admin";
import Profile from "@/pages/profile";

function Router() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    // Redirect to login if accessing protected routes while unauthenticated
    if (!user && location !== "/" && location !== "/login" && location !== "/admin") {
      navigate("/");
    }
  }, [user, location, navigate]);

  useEffect(() => {
    // Redirect to dashboard if authenticated user is on login page
    if (user && (location === "/" || location === "/login")) {
      navigate("/dashboard");
    }
  }, [user, location, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={user ? Dashboard : Login} />
      <Route path="/login" component={user ? Dashboard : Login} />
      <Route path="/dashboard" component={user ? Dashboard : Login} />
      <Route path="/profile" component={user ? Profile : Login} />
      <Route path="/admin" component={user && user.role === 'admin' ? Admin : NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
