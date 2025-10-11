import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiRequest } from './queryClient';

interface DashboardVisibility {
  standard: {
    ordersButton: boolean;
    inventoryButton: boolean;
    alertsButton: boolean;
    totalRevenueCard: boolean;
    totalOrdersCard: boolean;
    avgLeadTimeCard: boolean;
    activeDealersCard: boolean;
    activeAlertsCard: boolean;
    lowStockItemsCard: boolean;
    dealerPerformanceChart: boolean;
    recentOrdersTable: boolean;
    alertsPanel: boolean;
    inventoryOverview: boolean;
  };
}

interface ApplicationSettings {
  loginTheme: 'light' | 'dark' | 'system';
  loginLanguage: 'en' | 'zh';
  dashboardVisibility: DashboardVisibility;
  recentOrdersLimit: number;
}

interface SettingsContextType {
  settings: ApplicationSettings | null;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: ApplicationSettings = {
  loginTheme: 'light',
  loginLanguage: 'zh',
  recentOrdersLimit: 20,
  dashboardVisibility: {
    standard: {
      ordersButton: true,
      inventoryButton: true,
      alertsButton: true,
      totalRevenueCard: true,
      totalOrdersCard: true,
      avgLeadTimeCard: true,
      activeDealersCard: true,
      activeAlertsCard: true,
      lowStockItemsCard: true,
      dealerPerformanceChart: true,
      recentOrdersTable: true,
      alertsPanel: true,
      inventoryOverview: true
    }
  }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ApplicationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const response = await apiRequest('GET', '/api/application-settings');
      const settingsData = await response.json();

      const parsedSettings: ApplicationSettings = { ...defaultSettings };

      settingsData.forEach((setting: any) => {
        if (setting.key === 'loginTheme') {
          parsedSettings.loginTheme = setting.value;
        } else if (setting.key === 'loginLanguage') {
          parsedSettings.loginLanguage = setting.value;
        } else if (setting.key === 'recentOrdersLimit') {
          parsedSettings.recentOrdersLimit = setting.value;
        } else if (setting.key === 'dashboardVisibility') {
          parsedSettings.dashboardVisibility = setting.value;
        }
      });

      setSettings(parsedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use defaults if settings can't be loaded
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, isLoading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}