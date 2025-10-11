import { DashboardHeader } from "@/components/dashboard-header"
import { MetricCard } from "@/components/metric-card"
import { DealerPerformanceChart } from "@/components/dealer-performance-chart"
import { AlertsPanel } from "@/components/alerts-panel"
import { RecentOrdersTable } from "@/components/recent-orders-table"
import { InventoryOverview } from "@/components/inventory-overview"
import { useDashboardOverview } from "@/hooks/use-dashboard"
import { useAuth } from "@/lib/auth"
import { useSettings } from "@/lib/settings"
import { DollarSign, Package, Clock, Users, AlertTriangle, Boxes } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocation } from "wouter"
import { useTranslation } from "react-i18next"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"

export default function Dashboard() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { data: overview, isLoading, error } = useDashboardOverview();
  const queryClient = useQueryClient();

  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await apiRequest('PUT', `/api/alerts/${alertId}/resolve`);
      return response.json();
    },
    onSuccess: () => {
      // Immediately invalidate and refetch alert queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/overview'], exact: false });
    },
  });

  const handleResolveAlert = (alertId: string) => {
    resolveAlertMutation.mutate(alertId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">{t('dashboard.errorLoading')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{t('dashboard.failedToLoad')}</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metrics = overview?.metrics;

  // Helper function to check component visibility
  const isComponentVisible = (componentKey: string) => {
    if (user?.role === 'admin') return true; // Admin always sees everything
    if (!settings?.dashboardVisibility?.standard) return true; // Default to visible if no settings
    return settings.dashboardVisibility.standard[componentKey as keyof typeof settings.dashboardVisibility.standard] ?? true;
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader alertCount={metrics?.activeAlerts || 0} onProfileClick={() => navigate('/profile')} />
      
      <main className="container mx-auto p-6 space-y-6">
        {/* Key Metrics Row */}
        {isComponentVisible('totalRevenueCard') || isComponentVisible('totalOrdersCard') || isComponentVisible('avgLeadTimeCard') || isComponentVisible('activeDealersCard') ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isComponentVisible('totalRevenueCard') && (
              <MetricCard
                title={t('dashboard.totalRevenue')}
                value={`¥${metrics?.totalRevenue?.toLocaleString() || '0'}`}
                icon={DollarSign}
                description={t('dashboard.fromOrders', { count: metrics?.totalOrders || 0 })}
              />
            )}
            {isComponentVisible('totalOrdersCard') && (
              <MetricCard
                title={t('dashboard.totalOrders')}
                value={metrics?.totalOrders?.toString() || '0'}
                icon={Package}
                description={t('dashboard.activeOrders', { count: metrics?.activeOrders || 0 })}
              />
            )}
            {isComponentVisible('avgLeadTimeCard') && (
              <MetricCard
                title={t('dashboard.avgLeadTime')}
                value={t('dashboard.days', { count: metrics?.avgLeadTime || 0 })}
                icon={Clock}
                description={t('dashboard.targetDays')}
              />
            )}
            {isComponentVisible('activeDealersCard') && (
              <MetricCard
                title={t('dashboard.activeDealers')}
                value={metrics?.activeDealers?.toString() || '0'}
                icon={Users}
                description={t('dashboard.territoriesCovered')}
              />
            )}
          </div>
        ) : null}

        {/* Alert Summary */}
        {(metrics?.activeAlerts || 0) > 0 && (isComponentVisible('activeAlertsCard') || (isComponentVisible('lowStockItemsCard') && (metrics?.lowStockItems || 0) > 0)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isComponentVisible('activeAlertsCard') && (
              <MetricCard
                title={t('dashboard.activeAlerts')}
                value={metrics?.activeAlerts?.toString() || '0'}
                icon={AlertTriangle}
                description={t('dashboard.requireAttention')}
              />
            )}
            {isComponentVisible('lowStockItemsCard') && (metrics?.lowStockItems || 0) > 0 && (
              <MetricCard
                title={t('dashboard.lowStockItems')}
                value={metrics?.lowStockItems?.toString() || '0'}
                icon={Boxes}
                description={t('dashboard.belowThreshold')}
              />
            )}
          </div>
        )}

        {/* Low Stock Items - Admin Only */}
        {user?.role === 'admin' && (metrics?.lowStockItems || 0) > 0 && (metrics?.activeAlerts || 0) === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricCard
              title={t('dashboard.lowStockItems')}
              value={metrics?.lowStockItems?.toString() || '0'}
              icon={Boxes}
              description={t('dashboard.belowThreshold')}
            />
          </div>
        )}

        {/* Dealer Performance Charts */}
        {isComponentVisible('dealerPerformanceChart') && <DealerPerformanceChart />}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders Table - Takes 2 columns */}
          {isComponentVisible('recentOrdersTable') && (
            <div className="lg:col-span-2">
              <RecentOrdersTable
                onViewAll={() => navigate('/orders')}
                onOrderClick={(id) => navigate(`/orders/${id}`)}
                limit={settings?.recentOrdersLimit || 20}
              />
            </div>
          )}

          {/* Sidebar with Alerts and Inventory */}
          <div className="space-y-6">
            {isComponentVisible('alertsPanel') && (
              <AlertsPanel
                onResolveAlert={handleResolveAlert}
                onViewAll={() => navigate('/alerts')}
              />
            )}
            {isComponentVisible('inventoryOverview') && (
              <InventoryOverview onViewAll={() => navigate('/inventory')} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}