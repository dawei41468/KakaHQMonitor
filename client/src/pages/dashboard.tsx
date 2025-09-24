import { DashboardHeader } from "@/components/dashboard-header"
import { MetricCard } from "@/components/metric-card"
import { DealerPerformanceChart } from "@/components/dealer-performance-chart"
import { AlertsPanel } from "@/components/alerts-panel"
import { RecentOrdersTable } from "@/components/recent-orders-table"
import { InventoryOverview } from "@/components/inventory-overview"
import { DollarSign, Package, Clock, Users } from "lucide-react"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto p-6 space-y-6">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Revenue"
            value="¥2,450,000"
            change={{ value: 12, trend: "up", timeframe: "last month" }}
            icon={DollarSign}
            description="Monthly revenue target: ¥2,500,000"
          />
          <MetricCard
            title="Total Orders"
            value="1,247"
            change={{ value: 8, trend: "up", timeframe: "last month" }}
            icon={Package}
            description="Active orders: 156"
          />
          <MetricCard
            title="Avg Lead Time"
            value="12.5 days"
            change={{ value: 5, trend: "down", timeframe: "last month" }}
            icon={Clock}
            description="Target: 10 days"
          />
          <MetricCard
            title="Active Dealers"
            value="5"
            icon={Users}
            description="All territories covered"
          />
        </div>

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