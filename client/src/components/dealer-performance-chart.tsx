import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { useTranslation } from "react-i18next"

// todo: remove mock data
const mockDealerData = [
  { name: "Shenzhen", orders: 245, revenue: 580000, onTimeRate: 92 },
  { name: "Guangzhou", orders: 198, revenue: 450000, onTimeRate: 88 },
  { name: "Foshan", orders: 167, revenue: 380000, onTimeRate: 85 },
  { name: "Hangzhou", orders: 134, revenue: 320000, onTimeRate: 90 },
  { name: "Chengdu", orders: 123, revenue: 295000, onTimeRate: 87 }
]

const pieColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"]

interface DealerPerformanceChartProps {
  onDealerClick?: (dealerName: string) => void
}

export function DealerPerformanceChart({
  onDealerClick = (dealer) => console.log(`Clicked on ${dealer}`)
}: DealerPerformanceChartProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.revenueByTerritory')}</CardTitle>
          <CardDescription>{t('dashboard.monthlyRevenueComparison')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockDealerData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(value: number) => [`¥${value.toLocaleString()}`, t('dashboard.totalRevenue')]}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px"
                }}
              />
              <Bar 
                dataKey="revenue" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                onClick={(data) => onDealerClick(data.name)}
                style={{ cursor: "pointer" }}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.orderDistribution')}</CardTitle>
          <CardDescription>{t('dashboard.orderVolumeByTerritory')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={mockDealerData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="orders"
                  onClick={(data) => onDealerClick(data.name)}
                  style={{ cursor: "pointer" }}
                >
                  {mockDealerData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value}`, t('dashboard.totalOrders')]}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="space-y-2">
              {mockDealerData.map((dealer, index) => (
                <div 
                  key={dealer.name}
                  className="flex items-center justify-between p-2 rounded hover-elevate cursor-pointer"
                  onClick={() => onDealerClick(dealer.name)}
                  data-testid={`dealer-${dealer.name.toLowerCase()}`}
                >
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: pieColors[index % pieColors.length] }}
                    />
                    <span className="text-sm font-medium">{dealer.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">{dealer.orders}</span>
                    <Badge variant={dealer.onTimeRate >= 90 ? "default" : "secondary"}>
                      {dealer.onTimeRate}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}