import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiRequest } from './queryClient';
import i18n from './i18n';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  theme: string;
  language: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
    }

    setIsLoading(false);
  }, []);

  // Set up proactive token refresh when user is logged in
  useEffect(() => {
    if (!user) return;

    // Refresh token immediately when user logs in
    refreshToken().catch(() => {
      // If refresh fails, logout
      logout();
    });

    // Set up periodic token refresh (every 25 minutes, since access token expires in 30 minutes)
    const refreshInterval = setInterval(() => {
      refreshToken().catch(() => {
        // If refresh fails, logout
        logout();
      });
    }, 25 * 60 * 1000); // 25 minutes

    return () => clearInterval(refreshInterval);
  }, [user]);

  const login = async (email: string, password: string) => {
    const response = await apiRequest('POST', '/api/auth/login', { email, password });
    const data = await response.json();

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));

    setUser(data.user);

    // Set user preferences
    localStorage.setItem('vite-ui-theme', data.user.theme);
    i18n.changeLanguage(data.user.language);
    localStorage.setItem('i18nextLng', data.user.language);

    // Dispatch custom event to update theme
    window.dispatchEvent(new CustomEvent('themeChange'));
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);

    // Reset to default preferences
    localStorage.setItem('vite-ui-theme', 'system');
    i18n.changeLanguage('en');
    localStorage.setItem('i18nextLng', 'en');

    // Dispatch custom event to update theme
    window.dispatchEvent(new CustomEvent('themeChange'));
  };

  const refreshToken = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
      } else {
        // Refresh failed, logout
        logout();
        throw new Error('Session expired');
      }
    } catch (error) {
      logout();
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await apiRequest('PUT', '/api/user/password', { currentPassword, newPassword });
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      refreshToken,
      changePassword,
      setUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}