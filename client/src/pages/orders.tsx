import { Button } from "@/components/ui/button";
import { OrdersDataTable } from "@/components/orders-data-table";
import { CreateOrderForm } from "@/components/create-order-form";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

export default function Orders() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [dataTable, setDataTable] = React.useState<any>(null);

  const deleteMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest("DELETE", `/api/orders/${orderId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dealers'] });
      dataTable?.fetchData();
    },
  });

  const handleDeleteOrder = (orderId: string) => {
    if (confirm('Are you sure you want to delete this order?')) {
      deleteMutation.mutate(orderId);
    }
  };

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
        <h1 className="text-2xl font-bold">{t('orders.allOrders')}</h1>
        <CreateOrderForm onOrderCreated={() => dataTable?.fetchData()} />
      </div>

      <OrdersDataTable onOrderClick={(id) => navigate(`/orders/${id}`)} onEditClick={(id) => navigate(`/orders/${id}/edit`)} onDeleteClick={handleDeleteOrder} onReady={(table) => setDataTable(table)} />
    </div>
  );
}