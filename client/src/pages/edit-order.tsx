import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useTranslation } from "react-i18next";
import { CreateOrderForm } from "@/components/create-order-form";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import * as React from "react";

export default function EditOrder() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const params = useParams();
  const orderId = params.id;

  const { data: order, isLoading } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
    queryFn: () => apiRequest("GET", `/api/orders/${orderId}`).then(res => res.json()),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('orders.orderNotFound')}</h1>
          <Button onClick={() => navigate('/orders')}>
            {t('orders.backToOrders')}
          </Button>
        </div>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold">{t('orders.editOrder')}</h1>
      </div>

      <CreateOrderForm order={order} onOrderCreated={() => navigate('/orders')} isDialog={false} />
    </div>
  );
}