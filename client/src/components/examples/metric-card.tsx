import { DollarSign, Package, Clock, Users } from "lucide-react"
import { MetricCard } from "../metric-card"

export default function MetricCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      <MetricCard
        title="Total Revenue"
        value="¥2,450,000"
        change={{ value: 12, trend: "up", timeframe: "last month" }}
        icon={DollarSign}
        description="Monthly revenue target: ¥2,500,000"
      />
      <MetricCard
        title="Orders"
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
  )
}