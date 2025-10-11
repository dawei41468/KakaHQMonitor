import { useEffect, useState } from "react"
import { LoginForm } from "@/components/login-form"
import { useAuth } from "@/lib/auth"
import { useLocation } from "wouter"
import { useToast } from "@/hooks/use-toast"
import { useSettings } from "@/lib/settings"
import i18n from "@/lib/i18n"
import { useTranslation } from "react-i18next"

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const [loginTheme, setLoginTheme] = useState<string>("light");

  useEffect(() => {
    if (!settings) return;

    // Apply login theme locally to this page only
    let themeToApply = settings.loginTheme;
    if (settings.loginTheme === 'system') {
      themeToApply = window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light';
    }
    setLoginTheme(themeToApply);

    // Change language globally (this is fine since language is app-wide)
    const previousLanguage = i18n.language;
    i18n.changeLanguage(settings.loginLanguage);

    return () => {
      i18n.changeLanguage(previousLanguage);
    };
  }, [settings]);

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      toast({
        title: t('login.welcomeToast'),
        description: t('login.loginSuccess'),
      });
      setLocation("/dashboard");
    } catch (error) {
      toast({
        title: t('login.loginFailed'),
        description: error instanceof Error ? error.message : t('login.invalidCredentials'),
        variant: "destructive",
      });
    }
  }

  const handleForgotPassword = () => {
    toast({
      title: t('login.passwordReset'),
      description: t('login.contactAdmin'),
    });
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${loginTheme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <LoginForm
        onLogin={handleLogin}
        onForgotPassword={handleForgotPassword}
        theme={loginTheme as 'light' | 'dark'}
      />
    </div>
  )
}