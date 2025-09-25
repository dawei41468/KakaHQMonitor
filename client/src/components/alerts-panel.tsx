import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, Package, Clock, CheckCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useAlerts } from "@/hooks/use-dashboard"
import type { Alert as AlertType } from "@shared/schema"

interface Alert {
  id: string
  type: "lowStock" | "delay" | "critical" | "info"
  title: string
  message: string
  priority: "high" | "medium" | "low"
  timestamp: string
  resolved?: boolean
}


const alertIcons = {
  lowStock: Package,
  delay: Clock,
  critical: AlertTriangle,
  info: CheckCircle
}

const priorityColors = {
  high: "destructive",
  medium: "secondary",
  low: "outline"
} as const

interface AlertsPanelProps {
  onResolveAlert?: (alertId: string) => void
  onViewAll?: () => void
}

export function AlertsPanel({
  onResolveAlert = (id) => console.log(`Resolving alert ${id}`),
  onViewAll = () => console.log("View all alerts")
}: AlertsPanelProps) {
  const { t } = useTranslation();
  const { data: alertsData = { items: [] } } = useAlerts(false);
  const alerts: AlertType[] = (alertsData as { items: AlertType[] }).items || [];
  const formattedAlerts = alerts.map(alert => ({ ...alert, timestamp: new Date(alert.createdAt).toLocaleString() }));
  const activeAlerts = formattedAlerts.filter(alert => !alert.resolved)
  const resolvedAlerts = formattedAlerts.filter(alert => alert.resolved)

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t('alerts.alertsNotifications')}</CardTitle>
            <CardDescription>
              {activeAlerts.length} {t('alerts.requireAttention')}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewAll}
            data-testid="button-view-all-alerts"
          >
            {t('alerts.viewAll')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          <div className="space-y-1 p-4">
            {activeAlerts.map((alert) => {
              const Icon = alertIcons[alert.type as keyof typeof alertIcons]
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-start space-x-3 p-3 rounded-lg border transition-colors hover-elevate",
                    alert.priority === "high" && "bg-destructive/5 border-destructive/20"
                  )}
                  data-testid={`alert-${alert.id}`}
                >
                  <Icon className={cn(
                    "h-4 w-4 mt-0.5 flex-shrink-0",
                    alert.priority === "high" && "text-destructive",
                    alert.priority === "medium" && "text-orange-500",
                    alert.priority === "low" && "text-muted-foreground"
                  )} />
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">
                        {alert.title}
                      </p>
                      <Badge
                        variant={priorityColors[alert.priority as keyof typeof priorityColors]}
                        className="text-xs"
                      >
                        {t(`admin.${alert.priority}`)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {alert.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {alert.timestamp}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => onResolveAlert(alert.id)}
                        data-testid={`button-resolve-${alert.id}`}
                      >
                        <X className="h-3 w-3 mr-1" />
                        {t('alerts.resolve')}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {resolvedAlerts.length > 0 && (
              <>
                <div className="pt-4 pb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">{t('alerts.recentResolved')}</h4>
                </div>
                {resolvedAlerts.slice(0, 2).map((alert) => {
                  const Icon = alertIcons[alert.type as keyof typeof alertIcons]
                  return (
                    <div
                      key={alert.id}
                      className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/30 opacity-75"
                      data-testid={`resolved-alert-${alert.id}`}
                    >
                      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none line-through">
                          {alert.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {alert.message}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {t('alerts.resolvedAt', { timestamp: alert.timestamp })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
            
            {activeAlerts.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{t('alerts.noActiveAlerts')}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}