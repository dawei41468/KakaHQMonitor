import { LoginForm } from "@/components/login-form"
import { useAuth } from "@/lib/auth"
import { useLocation } from "wouter"
import { useToast } from "@/hooks/use-toast"

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      toast({
        title: "Welcome back!",
        description: "Successfully logged into Kaka HQ Dashboard",
      });
      setLocation("/dashboard");
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Invalid email or password",
        variant: "destructive",
      });
    }
  }

  const handleForgotPassword = () => {
    toast({
      title: "Password Reset",
      description: "Please contact your administrator for password reset.",
    });
  }

  return (
    <LoginForm 
      onLogin={handleLogin}
      onForgotPassword={handleForgotPassword}
    />
  )
}