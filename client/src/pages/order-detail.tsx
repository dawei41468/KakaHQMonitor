import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, Trash2, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Order, OrderAttachment } from "@shared/schema";
import { ContractPreview } from "@/components/pdf-preview";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface OrderItem {
  item: string;
  quantity: number;
}

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
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [pdfViewerLoading, setPdfViewerLoading] = useState(false);

  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: [`/api/orders/${id}`],
    queryFn: () => apiRequest("GET", `/api/orders/${id}`).then(res => res.json()),
    enabled: !!id,
  });

  const { data: pdfPreview } = useQuery<string>({
    queryKey: [`/api/orders/${id}/pdf-preview`],
    enabled: !!id && !!order,
  });

  const { data: htmlPreviewData } = useQuery({
    queryKey: [`/api/orders/${id}/html-preview`],
    enabled: !!id && !!order,
    queryFn: () => apiRequest("GET", `/api/orders/${id}/html-preview`).then(res => res.json()),
  });

  const { data: attachments = [] } = useQuery<OrderAttachment[]>({
    queryKey: [`/api/orders/${id}/attachments`],
    queryFn: () => apiRequest("GET", `/api/orders/${id}/attachments`).then(res => res.json()),
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
    if (!order) return;
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

  const handleDownloadAttachment = async (attachment: OrderAttachment) => {
    try {
      // Create a temporary anchor element that points to the download URL
      const a = document.createElement('a');
      a.href = `/api/orders/${id}/attachments/${attachment.id}/download`;
      a.download = attachment.fileName;
      a.style.display = 'none';

      // Add to DOM and click to trigger download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('orders.downloadFailed'),
        variant: 'destructive',
      });
    }
  };

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const response = await apiRequest("DELETE", `/api/orders/${id}/attachments/${attachmentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}/attachments`] });
      toast({
        title: t('common.success'),
        description: t('orders.attachmentDeleted'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('orders.attachmentDeleteFailed'),
        variant: 'destructive',
      });
    },
  });

  const handleDeleteAttachment = (attachmentId: string) => {
    setAttachmentToDelete(attachmentId);
  };

  const confirmDeleteAttachment = () => {
    if (attachmentToDelete) {
      deleteAttachmentMutation.mutate(attachmentToDelete);
      setAttachmentToDelete(null);
    }
  };

  const handleViewAttachment = async (attachment: OrderAttachment) => {
    try {
      setPdfViewerLoading(true);
      setPdfViewerOpen(true);

      const response = await apiRequest("GET", `/api/orders/${id}/attachments/${attachment.id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      setPdfViewerUrl(url);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('orders.downloadFailed'),
        variant: 'destructive',
      });
      setPdfViewerOpen(false);
    } finally {
      setPdfViewerLoading(false);
    }
  };

  const closePdfViewer = () => {
    setPdfViewerOpen(false);
    setPdfViewerUrl(null);
    setPdfViewerLoading(false);
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

        {Array.isArray(order.items) && order.items.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('orders.orderItems')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.isArray(order.items) && (order.items as OrderItem[]).map((item, index) => (
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
              <CardTitle>{t('orders.attachments')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {attachments.map((attachment: OrderAttachment) => (
                  <div key={attachment.id} className="flex justify-between items-center p-2 border rounded">
                    <div className="flex flex-col">
                      <span className="font-medium">{attachment.fileName}</span>
                      <span className="text-sm text-gray-500">
                        {(attachment.fileSize / 1024).toFixed(1)} KB • {new Date(attachment.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewAttachment(attachment)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        {t('common.view')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadAttachment(attachment)}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        {t('common.download')}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deleteAttachmentMutation.isPending}
                            className="flex items-center gap-2 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t('common.delete')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('orders.confirmDeleteAttachment')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('orders.confirmDeleteAttachmentDescription')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteAttachment(attachment.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {t('common.delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
              <ContractPreview htmlString={htmlPreviewData?.html} pdfBase64={pdfPreview} height={800} />
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

        {/* PDF Viewer Modal */}
        <Dialog open={pdfViewerOpen} onOpenChange={closePdfViewer}>
          <DialogContent className="sm:max-w-[90vw] max-h-[90vh] w-full">
            <DialogHeader>
              <DialogTitle>{t('orders.attachmentPreview')}</DialogTitle>
              <DialogDescription>
                {t('orders.attachmentPreviewDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-[600px]">
              {pdfViewerLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
                </div>
              ) : pdfViewerUrl ? (
                <iframe
                  src={pdfViewerUrl}
                  className="w-full h-full min-h-[600px] border-0"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {t('common.error')}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closePdfViewer}>
                {t('common.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}