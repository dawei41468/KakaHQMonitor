import { DashboardHeader } from "@/components/dashboard-header"
import { MetricCard } from "@/components/metric-card"
import { DealerPerformanceChart } from "@/components/dealer-performance-chart"
import { AlertsPanel } from "@/components/alerts-panel"
import { RecentOrdersTable } from "@/components/recent-orders-table"
import { InventoryOverview } from "@/components/inventory-overview"
import { useDashboardOverview } from "@/hooks/use-dashboard"
import { DollarSign, Package, Clock, Users, AlertTriangle, Boxes } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocation } from "wouter"

export default function Dashboard() {
  const [, navigate] = useLocation();
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
              <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Failed to load dashboard data. Please try refreshing the page.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metrics = overview?.metrics;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onProfileClick={() => navigate('/profile')} />
      
      <main className="container mx-auto p-6 space-y-6">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Revenue"
            value={`¥${metrics?.totalRevenue?.toLocaleString() || '0'}`}
            icon={DollarSign}
            description={`From ${metrics?.totalOrders || 0} orders`}
          />
          <MetricCard
            title="Total Orders"
            value={metrics?.totalOrders?.toString() || '0'}
            icon={Package}
            description={`${metrics?.activeOrders || 0} active orders`}
          />
          <MetricCard
            title="Avg Lead Time"
            value={`${metrics?.avgLeadTime || 0} days`}
            icon={Clock}
            description="Target: 10 days"
          />
          <MetricCard
            title="Active Dealers"
            value={metrics?.activeDealers?.toString() || '0'}
            icon={Users}
            description="All territories covered"
          />
        </div>

        {/* Alert Summary */}
        {(metrics?.activeAlerts || 0) > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricCard
              title="Active Alerts"
              value={metrics?.activeAlerts?.toString() || '0'}
              icon={AlertTriangle}
              description="Require attention"
            />
            <MetricCard
              title="Low Stock Items"
              value={metrics?.lowStockItems?.toString() || '0'}
              icon={Boxes}
              description="Below threshold"
            />
          </div>
        )}

        {/* Dealer Performance Charts */}
        <DealerPerformanceChart />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders Table - Takes 2 columns */}
          <div className="lg:col-span-2">
            <RecentOrdersTable />
          </div>
          
          {/* Sidebar with Alerts and Inventory */}
          <div className="space-y-6">
            <AlertsPanel />
            <InventoryOverview />
          </div>
        </div>
      </main>
    </div>
  )
}