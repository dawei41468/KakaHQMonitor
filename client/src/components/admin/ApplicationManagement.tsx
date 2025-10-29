import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/lib/settings";
import { ApplicationSetting } from "@shared/schema";

/**
 * Application Management Component
 * Handles application-wide settings configuration
 */
function ApplicationManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { refreshSettings } = useSettings();

  const { data: settings, isLoading } = useQuery<ApplicationSetting[]>({
    queryKey: ['/api/admin/application-settings'],
    queryFn: () => apiRequest('GET', '/api/admin/application-settings').then(res => res.json()),
  });

  const [formData, setFormData] = useState({
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
  });

  useEffect(() => {
    if (settings) {
      const newFormData = { ...formData };
      settings.forEach((setting: ApplicationSetting) => {
        if (setting.key === 'loginTheme') {
          newFormData.loginTheme = setting.value as string;
        } else if (setting.key === 'loginLanguage') {
          newFormData.loginLanguage = setting.value as string;
        } else if (setting.key === 'recentOrdersLimit') {
          newFormData.recentOrdersLimit = setting.value as number;
        } else if (setting.key === 'dashboardVisibility') {
          newFormData.dashboardVisibility = setting.value as typeof newFormData.dashboardVisibility;
        }
      });
      setFormData(newFormData);
    }
  }, [settings]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const response = await apiRequest('PUT', `/api/admin/application-settings/${key}`, { value });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/application-settings'] });
      refreshSettings(); // Refresh the global settings context
      toast({
        title: t('application.settingsSaved'),
        description: t('application.settingsUpdated'),
      });
    },
  });

  const handleSave = () => {
    // Update all settings
    const updates = [
      updateSettingMutation.mutateAsync({ key: 'loginTheme', value: formData.loginTheme }),
      updateSettingMutation.mutateAsync({ key: 'loginLanguage', value: formData.loginLanguage }),
      updateSettingMutation.mutateAsync({ key: 'recentOrdersLimit', value: formData.recentOrdersLimit }),
      updateSettingMutation.mutateAsync({ key: 'dashboardVisibility', value: formData.dashboardVisibility }),
    ];

    Promise.all(updates).catch((_error) => {
      toast({
        title: t('common.error'),
        description: t('application.settingsSaveError'),
        variant: 'destructive',
      });
    });
  };

  const updateVisibility = (component: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      dashboardVisibility: {
        ...prev.dashboardVisibility,
        standard: {
          ...prev.dashboardVisibility.standard,
          [component]: value
        }
      }
    }));
  };

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      {/* Login Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('application.loginSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="loginTheme">{t('application.theme')}</Label>
              <Select
                value={formData.loginTheme}
                onValueChange={(value) => setFormData(prev => ({ ...prev, loginTheme: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t('application.light')}</SelectItem>
                  <SelectItem value="dark">{t('application.dark')}</SelectItem>
                  <SelectItem value="system">{t('application.system')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="loginLanguage">{t('application.language')}</Label>
              <Select
                value={formData.loginLanguage}
                onValueChange={(value) => setFormData(prev => ({ ...prev, loginLanguage: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('application.english')}</SelectItem>
                  <SelectItem value="zh">{t('application.chinese')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Visibility */}
      <Card>
        <CardHeader>
          <CardTitle>{t('application.dashboardVisibility')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* TopBar */}
          <div>
            <h4 className="font-medium mb-3">{t('application.topBar')}</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="ordersButton"
                  checked={formData.dashboardVisibility.standard.ordersButton}
                  onCheckedChange={(checked) => updateVisibility('ordersButton', checked)}
                />
                <Label htmlFor="ordersButton">{t('nav.orders')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="inventoryButton"
                  checked={formData.dashboardVisibility.standard.inventoryButton}
                  onCheckedChange={(checked) => updateVisibility('inventoryButton', checked)}
                />
                <Label htmlFor="inventoryButton">{t('nav.inventory')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="alertsButton"
                  checked={formData.dashboardVisibility.standard.alertsButton}
                  onCheckedChange={(checked) => updateVisibility('alertsButton', checked)}
                />
                <Label htmlFor="alertsButton">{t('alerts.alertsNotifications')}</Label>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div>
            <h4 className="font-medium mb-3">{t('application.metrics')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="totalRevenueCard"
                  checked={formData.dashboardVisibility.standard.totalRevenueCard}
                  onCheckedChange={(checked) => updateVisibility('totalRevenueCard', checked)}
                />
                <Label htmlFor="totalRevenueCard">{t('dashboard.totalRevenue')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="totalOrdersCard"
                  checked={formData.dashboardVisibility.standard.totalOrdersCard}
                  onCheckedChange={(checked) => updateVisibility('totalOrdersCard', checked)}
                />
                <Label htmlFor="totalOrdersCard">{t('dashboard.totalOrders')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="avgLeadTimeCard"
                  checked={formData.dashboardVisibility.standard.avgLeadTimeCard}
                  onCheckedChange={(checked) => updateVisibility('avgLeadTimeCard', checked)}
                />
                <Label htmlFor="avgLeadTimeCard">{t('dashboard.avgLeadTime')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="activeDealersCard"
                  checked={formData.dashboardVisibility.standard.activeDealersCard}
                  onCheckedChange={(checked) => updateVisibility('activeDealersCard', checked)}
                />
                <Label htmlFor="activeDealersCard">{t('dashboard.activeDealers')}</Label>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div>
            <h4 className="font-medium mb-3">{t('alerts.alertsNotifications')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="activeAlertsCard"
                  checked={formData.dashboardVisibility.standard.activeAlertsCard}
                  onCheckedChange={(checked) => updateVisibility('activeAlertsCard', checked)}
                />
                <Label htmlFor="activeAlertsCard">{t('dashboard.activeAlerts')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="lowStockItemsCard"
                  checked={formData.dashboardVisibility.standard.lowStockItemsCard}
                  onCheckedChange={(checked) => updateVisibility('lowStockItemsCard', checked)}
                />
                <Label htmlFor="lowStockItemsCard">{t('dashboard.lowStockItems')}</Label>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div>
            <h4 className="font-medium mb-3">{t('application.charts')}</h4>
            <div className="flex items-center space-x-2">
              <Switch
                id="dealerPerformanceChart"
                checked={formData.dashboardVisibility.standard.dealerPerformanceChart}
                onCheckedChange={(checked) => updateVisibility('dealerPerformanceChart', checked)}
              />
              <Label htmlFor="dealerPerformanceChart">{t('dashboard.revenueByTerritory')}</Label>
            </div>
          </div>

          {/* Tables */}
          <div>
            <h4 className="font-medium mb-3">{t('application.tables')}</h4>
            <div className="flex items-center space-x-2">
              <Switch
                id="recentOrdersTable"
                checked={formData.dashboardVisibility.standard.recentOrdersTable}
                onCheckedChange={(checked) => updateVisibility('recentOrdersTable', checked)}
              />
              <Label htmlFor="recentOrdersTable">{t('orders.recentOrders')}</Label>
            </div>
          </div>

          {/* Panels */}
          <div>
            <h4 className="font-medium mb-3">{t('application.panels')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="alertsPanel"
                  checked={formData.dashboardVisibility.standard.alertsPanel}
                  onCheckedChange={(checked) => updateVisibility('alertsPanel', checked)}
                />
                <Label htmlFor="alertsPanel">{t('alerts.alertsNotifications')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="inventoryOverview"
                  checked={formData.dashboardVisibility.standard.inventoryOverview}
                  onCheckedChange={(checked) => updateVisibility('inventoryOverview', checked)}
                />
                <Label htmlFor="inventoryOverview">{t('inventory.inventoryOverview')}</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders Limit */}
      <Card>
        <CardHeader>
          <CardTitle>{t('application.recentOrdersSettings')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Label htmlFor="recentOrdersLimit">{t('application.ordersToShow')}</Label>
            <Input
              id="recentOrdersLimit"
              type="number"
              min="5"
              max="50"
              value={formData.recentOrdersLimit}
              onChange={(e) => setFormData(prev => ({ ...prev, recentOrdersLimit: parseInt(e.target.value) || 20 }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettingMutation.isPending}>
          {updateSettingMutation.isPending ? t('common.saving') : t('application.saveSettings')}
        </Button>
      </div>
    </div>
  );
}

export default ApplicationManagement;