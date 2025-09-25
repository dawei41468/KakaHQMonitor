import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if accessing protected routes while unauthenticated
  if (!user && location !== "/" && location !== "/login") {
    navigate("/");
    return null;
  }

  // Redirect to dashboard if authenticated user is on login page
  if (user && (location === "/" || location === "/login")) {
    navigate("/dashboard");
    return null;
  }

  return (
    <Switch>
      <Route path="/" component={user ? Dashboard : Login} />
      <Route path="/login" component={user ? Dashboard : Login} />
      <Route path="/dashboard" component={user ? Dashboard : Login} />
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
