import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function OrderDetail() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });

  const { data: order, isLoading, error } = useQuery<any>({
    queryKey: [`/api/orders/${id}`],
    enabled: !!id,
  });

  const { data: pdfPreview } = useQuery<string>({
    queryKey: [`/api/orders/${id}/pdf-preview`],
    enabled: !!id && !!order,
  });

  const { data: attachments = [] } = useQuery<any[]>({
    queryKey: [`/api/orders/${id}/attachments`],
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, actualDelivery }: { status: string; actualDelivery?: string }) => {
      const response = await apiRequest("PUT", `/api/orders/${id}/status`, { status, actualDelivery });
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

  const updatePaymentStatusMutation = useMutation({
    mutationFn: async (paymentStatus: string) => {
      const response = await apiRequest("PUT", `/api/orders/${id}/payment-status`, { paymentStatus });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}`] });
      toast({
        title: t('orders.paymentStatusUpdated'),
        description: t('orders.paymentStatusUpdateDescription'),
      });
    },
  });

  const handleStatusChange = (value: string) => {
    if (value === "delivered") {
      setIsDeliveryDialogOpen(true);
    } else {
      updateStatusMutation.mutate({ status: value });
    }
  };

  const handleConfirmDelivery = () => {
    updateStatusMutation.mutate({ status: "delivered", actualDelivery: selectedDeliveryDate });
    setIsDeliveryDialogOpen(false);
  };

  const handleDownloadDocx = async () => {
    try {
      const response = await apiRequest("GET", `/api/orders/${id}/document`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${order.orderNumber}_contract.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error && error.message.includes('404') ? t('orders.documentNotFound') : t('orders.downloadFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleDownloadAttachment = async (attachment: any) => {
    try {
      const response = await apiRequest("GET", `/api/orders/${id}/attachments/${attachment.id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('orders.downloadFailed'),
        variant: 'destructive',
      });
    }
  };

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
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadDocx}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {t('orders.downloadDocx')}
        </Button>
        <h1 className="text-2xl font-bold">{t('orders.orderNumber')} {order.orderNumber}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('orders.orderInformation')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t('orders.orderNumber')}</label>
                <p>{order.orderNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium">{t('createOrder.projectName')}</label>
                <p>{order.projectName || t('common.tbd')}</p>
              </div>
              <div>
                <label className="text-sm font-medium">{t('createOrder.signingDate')}</label>
                <p>{order.signingDate ? new Date(order.signingDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                }) : t('common.tbd')}</p>
              </div>
              <div>
                <label className="text-sm font-medium">{t('orders.estimatedDelivery')}</label>
                <p>{order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                }) : t('common.tbd')}</p>
              </div>
              {order.status === 'delivered' && order.actualDelivery && (
                <div>
                  <label className="text-sm font-medium">{t('orders.actualDeliveryDate')}</label>
                  <p>{new Date(order.actualDelivery).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">{t('createOrder.designer')}</label>
                <p>{order.designer || t('common.tbd')}</p>
              </div>
              <div>
                <label className="text-sm font-medium">{t('createOrder.salesRep')}</label>
                <p>{order.salesRep || t('common.tbd')}</p>
              </div>
              <div>
                <label className="text-sm font-medium">{t('createOrder.buyerCompany')}</label>
                <p>{order.buyerCompanyName || t('common.tbd')}</p>
              </div>
              <div>
                <label className="text-sm font-medium">{t('orders.totalValue')}</label>
                <p><strong>¥{Number(order.totalValue).toLocaleString()}</strong></p>
              </div>
              <div>
                <label className="text-sm font-medium">{t('orders.orderStatus')}</label>
                <div className="mt-1">
                  <Select
                    value={order.status}
                    onValueChange={handleStatusChange}
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
                <label className="text-sm font-medium">{t('orders.paymentStatus')}</label>
                <div className="mt-1">
                  <Select
                    value={order.paymentStatus}
                    onValueChange={(value) => updatePaymentStatusMutation.mutate(value)}
                    disabled={updatePaymentStatusMutation.isPending}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">{t('orders.unpaid')}</SelectItem>
                      <SelectItem value="partiallyPaid">{t('orders.partiallyPaid')}</SelectItem>
                      <SelectItem value="fullyPaid">{t('orders.fullyPaid')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t('orders.createdAt')}</label>
                <p>{new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}</p>
              </div>
            </div>
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

        {attachments.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {attachments.map((attachment: any) => (
                  <div key={attachment.id} className="flex justify-between items-center p-2 border rounded">
                    <span>{attachment.fileName}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadAttachment(attachment)}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {pdfPreview && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('createOrder.contractPreview')}</CardTitle>
            </CardHeader>
            <CardContent>
              <iframe
                src={`data:application/pdf;base64,${pdfPreview}`}
                className="w-full h-[2000px] border"
                title={t('createOrder.contractPreview')}
              />
            </CardContent>
          </Card>
        )}

        <Dialog open={isDeliveryDialogOpen} onOpenChange={setIsDeliveryDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t('orders.confirmDeliveryDate')}</DialogTitle>
              <DialogDescription>
                {t('orders.confirmDeliveryDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="delivery-date" className="text-right">
                  {t('orders.deliveryDate')}
                </Label>
                <Input
                  id="delivery-date"
                  type="date"
                  value={selectedDeliveryDate}
                  onChange={(e) => setSelectedDeliveryDate(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeliveryDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelivery}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? t('common.loading') : t('orders.confirmDelivery')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}