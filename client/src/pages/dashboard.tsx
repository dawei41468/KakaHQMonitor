import { DashboardHeader } from "@/components/dashboard-header"
import { MetricCard } from "@/components/metric-card"
import { DealerPerformanceChart } from "@/components/dealer-performance-chart"
import { AlertsPanel } from "@/components/alerts-panel"
import { RecentOrdersTable } from "@/components/recent-orders-table"
import { InventoryOverview } from "@/components/inventory-overview"
import { useDashboardOverview } from "@/hooks/use-dashboard"
import { useAuth } from "@/lib/auth"
import { DollarSign, Package, Clock, Users, AlertTriangle, Boxes } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocation } from "wouter"
import { useTranslation } from "react-i18next"

export default function Dashboard() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data: overview, isLoading, error } = useDashboardOverview();

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

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader alertCount={metrics?.activeAlerts || 0} onProfileClick={() => navigate('/profile')} />
      
      <main className="container mx-auto p-6 space-y-6">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title={t('dashboard.totalRevenue')}
            value={`¥${metrics?.totalRevenue?.toLocaleString() || '0'}`}
            icon={DollarSign}
            description={t('dashboard.fromOrders', { count: metrics?.totalOrders || 0 })}
          />
          <MetricCard
            title={t('dashboard.totalOrders')}
            value={metrics?.totalOrders?.toString() || '0'}
            icon={Package}
            description={t('dashboard.activeOrders', { count: metrics?.activeOrders || 0 })}
          />
          <MetricCard
            title={t('dashboard.avgLeadTime')}
            value={t('dashboard.days', { count: metrics?.avgLeadTime || 0 })}
            icon={Clock}
            description={t('dashboard.targetDays')}
          />
          <MetricCard
            title={t('dashboard.activeDealers')}
            value={metrics?.activeDealers?.toString() || '0'}
            icon={Users}
            description={t('dashboard.territoriesCovered')}
          />
        </div>

        {/* Alert Summary */}
        {(metrics?.activeAlerts || 0) > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricCard
              title={t('dashboard.activeAlerts')}
              value={metrics?.activeAlerts?.toString() || '0'}
              icon={AlertTriangle}
              description={t('dashboard.requireAttention')}
            />
            <MetricCard
              title={t('dashboard.lowStockItems')}
              value={metrics?.lowStockItems?.toString() || '0'}
              icon={Boxes}
              description={t('dashboard.belowThreshold')}
            />
          </div>
        )}

        {/* Dealer Performance Charts */}
        <DealerPerformanceChart />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders Table - Takes 2 columns */}
          <div className="lg:col-span-2">
            <RecentOrdersTable
              onViewAll={() => navigate('/orders')}
              onOrderClick={(id) => navigate(`/orders/${id}`)}
            />
          </div>

          {/* Sidebar with Alerts and Inventory */}
          <div className="space-y-6">
            <AlertsPanel onViewAll={() => navigate('/alerts')} />
            {user?.role === 'admin' && (
              <InventoryOverview onViewAll={() => navigate('/inventory')} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}