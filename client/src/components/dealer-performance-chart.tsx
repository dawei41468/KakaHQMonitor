import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { useTranslation } from "react-i18next"
import { useDealers } from "@/hooks/use-dashboard"

const pieColors = [
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#10b981", // Green
  "#f59e0b", // Yellow/Orange
  "#8b5cf6"  // Purple
]

interface DealerPerformanceChartProps {
  onDealerClick?: (dealerName: string) => void
}

export function DealerPerformanceChart({
  onDealerClick = (dealer) => console.log(`Clicked on ${dealer}`)
}: DealerPerformanceChartProps) {
  const { t } = useTranslation();
  const { data: dealers, isLoading } = useDealers();

  const dealerData = dealers?.map(dealer => ({
    name: dealer.name,
    territory: dealer.territory,
    orders: dealer.performance?.totalOrders || 0,
    revenue: dealer.performance?.revenue || 0,
    onTimeRate: dealer.performance?.onTimeRate || 0
  })) || []

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.revenueByTerritory')}</CardTitle>
            <CardDescription>{t('dashboard.monthlyRevenueComparison')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-muted animate-pulse rounded"></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.orderDistribution')}</CardTitle>
            <CardDescription>{t('dashboard.orderVolumeByTerritory')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-muted animate-pulse rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.revenueByTerritory')}</CardTitle>
          <CardDescription>{t('dashboard.monthlyRevenueComparison')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dealerData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="territory"
                tick={{ fontSize: 12 }}
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
                    data={dealerData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="orders"
                    onClick={(data) => onDealerClick(data.name)}
                    style={{ cursor: "pointer" }}
                  >
                    {dealerData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                <Tooltip
                  formatter={(value: number, _name: string, _props: any) => {
                    const total = dealerData.reduce((sum, d) => sum + d.orders, 0);
                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                    return [`${value} (${percentage}%)`, t('dashboard.totalOrders')];
                  }}
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
              {(() => {
                const totalOrders = dealerData.reduce((sum, d) => sum + d.orders, 0);
                return dealerData.map((dealer, index) => {
                  const percentage = totalOrders > 0 ? ((dealer.orders / totalOrders) * 100).toFixed(1) : '0';
                  return (
                    <div
                      key={dealer.name}
                      className="flex items-center justify-between p-2 rounded hover-elevate cursor-pointer"
                      onClick={() => onDealerClick(dealer.name)}
                      data-testid={`dealer-${dealer.territory.toLowerCase()}`}
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: pieColors[index % pieColors.length] }}
                        />
                        <span className="text-sm font-medium">{dealer.territory}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {dealer.orders} orders ({percentage}%)
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}