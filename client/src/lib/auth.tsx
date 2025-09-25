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

  const login = async (email: string, password: string) => {
    const response = await apiRequest('POST', '/api/auth/login', { email, password });
    const data = await response.json();

    localStorage.setItem('accessToken', data.accessToken);
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
      const response = await apiRequest('POST', '/api/auth/refresh');
      const data = await response.json();

      localStorage.setItem('accessToken', data.accessToken);
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