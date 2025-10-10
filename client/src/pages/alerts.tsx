import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, AlertTriangle, Package, Clock, CheckCircle, X, Filter } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAlerts } from "@/hooks/use-dashboard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import type { Alert as AlertType } from "@shared/schema";

const alertIcons = {
  lowStock: Package,
  delay: Clock,
  critical: AlertTriangle,
  info: CheckCircle
};

const priorityColors = {
  high: "destructive",
  medium: "secondary",
  low: "outline"
} as const;

// Helper function to translate alert titles and messages
function translateAlertContent(title: string, message: string, t: any) {
  // Translate known alert titles
  const titleTranslations: Record<string, string> = {
    "Payment Required Before Shipping": t('alerts.alertTitles.paymentRequired'),
    "Order Due Very Soon": t('alerts.alertTitles.orderDueVerySoon'),
    "Order Overdue": t('alerts.alertTitles.orderOverdue'),
    "Order Stuck in Production": t('alerts.alertTitles.orderStuck')
  };

  const translatedTitle = titleTranslations[title] || title;

  // For messages, we could add more complex translation logic if needed
  // For now, return the message as-is since it contains dynamic data
  return {
    title: translatedTitle,
    message: message
  };
}

export default function Alerts() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [includeResolved, setIncludeResolved] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data: alertsData = { items: [] } } = useAlerts(includeResolved);
  const alerts: AlertType[] = (alertsData as { items: AlertType[] }).items || [];

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

  const unresolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await apiRequest('PUT', `/api/alerts/${alertId}/unresolve`);
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

  // Filter alerts based on selected filters
  const filteredAlerts = alerts.filter(alert => {
    if (typeFilter !== "all" && alert.type !== typeFilter) return false;
    if (priorityFilter !== "all" && alert.priority !== priorityFilter) return false;
    return true;
  });

  const activeAlerts = filteredAlerts.filter(alert => !alert.resolved);
  const resolvedAlerts = filteredAlerts.filter(alert => alert.resolved);

  const formattedAlerts = filteredAlerts.map(alert => ({
    ...alert,
    timestamp: new Date(alert.createdAt).toLocaleString(),
    resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString() : null
  }));

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.backToDashboard')}
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t('alerts.allAlerts')}</h1>
          <p className="text-muted-foreground">
            {t('alerts.manageAndMonitorAlerts')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {t('alerts.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('alerts.showResolved')}:</label>
              <Button
                variant={includeResolved ? "default" : "outline"}
                size="sm"
                onClick={() => setIncludeResolved(!includeResolved)}
              >
                {includeResolved ? t('common.yes') : t('common.no')}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('admin.type')}:</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('alerts.allTypes')}</SelectItem>
                  <SelectItem value="lowStock">{t('admin.lowStock')}</SelectItem>
                  <SelectItem value="delay">{t('admin.delay')}</SelectItem>
                  <SelectItem value="critical">{t('admin.critical')}</SelectItem>
                  <SelectItem value="info">{t('admin.info')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('admin.priority')}:</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('alerts.allPriorities')}</SelectItem>
                  <SelectItem value="high">{t('admin.high')}</SelectItem>
                  <SelectItem value="medium">{t('admin.medium')}</SelectItem>
                  <SelectItem value="low">{t('admin.low')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            {t('alerts.activeAlerts')} ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="resolved" disabled={!includeResolved}>
            {t('alerts.resolvedAlerts')} ({resolvedAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('alerts.activeAlerts')}</CardTitle>
              <CardDescription>
                {activeAlerts.length} {t('alerts.requireAttention')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                <div className="space-y-1 p-4">
                  {activeAlerts.map((alert) => {
                    const Icon = alertIcons[alert.type as keyof typeof alertIcons];
                    const formattedAlert = formattedAlerts.find(fa => fa.id === alert.id);
                    const { title: translatedTitle, message: translatedMessage } = translateAlertContent(alert.title, alert.message, t);
                    return (
                      <div
                        key={alert.id}
                        className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors hover-elevate ${
                          alert.priority === "high" ? "bg-destructive/5 border-destructive/20" : ""
                        }`}
                      >
                        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                          alert.priority === "high" ? "text-destructive" :
                          alert.priority === "medium" ? "text-orange-500" :
                          "text-muted-foreground"
                        }`} />

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium leading-none">
                              {translatedTitle}
                            </p>
                            <Badge
                              variant={priorityColors[alert.priority as keyof typeof priorityColors]}
                              className="text-xs"
                            >
                              {t(`admin.${alert.priority}`)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {translatedMessage}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {formattedAlert?.timestamp}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => handleResolveAlert(alert.id)}
                              disabled={resolveAlertMutation.isPending}
                            >
                              <X className="h-3 w-3 mr-1" />
                              {t('alerts.resolve')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

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
        </TabsContent>

        <TabsContent value="resolved" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('alerts.resolvedAlerts')}</CardTitle>
              <CardDescription>
                {resolvedAlerts.length} {t('alerts.previouslyResolved')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                <div className="space-y-1 p-4">
                  {resolvedAlerts.map((alert) => {
                    const Icon = alertIcons[alert.type as keyof typeof alertIcons];
                    const formattedAlert = formattedAlerts.find(fa => fa.id === alert.id);
                    const { title: translatedTitle, message: translatedMessage } = translateAlertContent(alert.title, alert.message, t);
                    return (
                      <div
                        key={alert.id}
                        className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/30 opacity-75"
                      >
                        <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none line-through">
                            {translatedTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {translatedMessage}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {t('alerts.resolvedAt', { timestamp: formattedAlert?.resolvedAt })}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {t('alerts.resolved')}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => unresolveAlertMutation.mutate(alert.id)}
                                disabled={unresolveAlertMutation.isPending}
                              >
                                {t('alerts.undo')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {resolvedAlerts.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">{t('alerts.noResolvedAlerts')}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}