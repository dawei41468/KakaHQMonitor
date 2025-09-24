import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    trend: "up" | "down"
    timeframe?: string
  }
  icon?: LucideIcon
  description?: string
  className?: string
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  description,
  className
}: MetricCardProps) {
  return (
    <Card className={cn("hover-elevate", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </div>
        
        {change && (
          <div className="flex items-center space-x-2 mt-2">
            <Badge 
              variant={change.trend === "up" ? "default" : "destructive"}
              className="flex items-center space-x-1"
            >
              {change.trend === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{Math.abs(change.value)}%</span>
            </Badge>
            {change.timeframe && (
              <span className="text-xs text-muted-foreground">
                vs {change.timeframe}
              </span>
            )}
          </div>
        )}
        
        {description && (
          <p className="text-xs text-muted-foreground mt-2">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}