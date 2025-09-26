import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@shared/schema";

export default function OrderDetail() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: order, isLoading, error } = useQuery<any>({
    queryKey: [`/api/orders/${id}`],
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest("PUT", `/api/orders/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}`] });
      toast({
        title: t('orders.statusUpdated'),
        description: t('orders.statusUpdateDescription'),
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t('orders.failedToLoadOrder')}</p>
            <Button onClick={() => navigate('/orders')} className="mt-4">
              {t('orders.backToOrders')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusLabels = {
    received: t('orders.received'),
    sentToFactory: t('orders.sentToFactory'),
    inProduction: t('orders.inProduction'),
    delivered: t('orders.delivered')
  };

  const statusColors = {
    received: "secondary",
    sentToFactory: "outline",
    inProduction: "default",
    delivered: "default"
  } as const;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/orders')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('orders.backToOrders')}
        </Button>
        <h1 className="text-2xl font-bold">{t('orders.orderNumber')} {order.orderNumber}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('orders.orderInformation')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('orders.orderNumber')}</label>
              <p>{order.orderNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium">{t('common.status')}</label>
              <div className="mt-1">
                <Select
                  value={order.status}
                  onValueChange={(value) => updateStatusMutation.mutate(value)}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">{t('orders.received')}</SelectItem>
                    <SelectItem value="sentToFactory">{t('orders.sentToFactory')}</SelectItem>
                    <SelectItem value="inProduction">{t('orders.inProduction')}</SelectItem>
                    <SelectItem value="delivered">{t('orders.delivered')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t('orders.dealer')}</label>
              <p>{order.dealer?.name || 'Unknown'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">{t('orders.totalValue')}</label>
              <p>¥{Number(order.totalValue).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium">{t('orders.createdAt')}</label>
              <p>{new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}</p>
            </div>
            {order.estimatedDelivery && (
              <div>
                <label className="text-sm font-medium">{t('orders.estimatedDelivery')}</label>
                <p>{new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('orders.contractDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.projectName && (
              <div>
                <label className="text-sm font-medium">{t('createOrder.projectName')}</label>
                <p>{order.projectName}</p>
              </div>
            )}
            {order.signingDate && (
              <div>
                <label className="text-sm font-medium">{t('createOrder.signingDate')}</label>
                <p>{new Date(order.signingDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}</p>
              </div>
            )}
            {order.designer && (
              <div>
                <label className="text-sm font-medium">{t('createOrder.designer')}</label>
                <p>{order.designer}</p>
              </div>
            )}
            {order.salesRep && (
              <div>
                <label className="text-sm font-medium">{t('createOrder.salesRep')}</label>
                <p>{order.salesRep}</p>
              </div>
            )}
            {order.buyerCompanyName && (
              <div>
                <label className="text-sm font-medium">{t('createOrder.buyerCompany')}</label>
                <p>{order.buyerCompanyName}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {order.items && order.items.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('orders.orderItems')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 border rounded">
                    <span>{item.item} x{item.quantity}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}