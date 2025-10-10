import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";

/**
 * Order Management Component
 * Handles order status updates with pagination
 */
function OrderManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const { data: result, isLoading } = useQuery<{ items: any[], total: number }>({
    queryKey: ['/api/admin/orders', page],
    queryFn: () => apiRequest('GET', `/api/admin/orders?limit=${limit}&offset=${(page - 1) * limit}`).then(res => res.json()),
    placeholderData: (previousData) => previousData,
  });
  const orders = result?.items || [];
  const total = result?.total || 0;

  const totalPages = Math.ceil(total / limit);

  const getVisiblePages = (current: number, totalPages: number, maxVisible: number = 5) => {
    const pages: (number | string)[] = [];
    const half = Math.floor(maxVisible / 2);

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let start = Math.max(2, current - half);
      let end = Math.min(totalPages - 1, current + half);

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const visiblePages = getVisiblePages(page, totalPages);

  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, [page]);

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/admin/orders/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
    },
  });

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">{t('admin.totalOrders', { count: total })}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.orderNumber')}</TableHead>
            <TableHead>{t('orders.dealer')}</TableHead>
            <TableHead>{t('common.status')}</TableHead>
            <TableHead>{t('admin.totalValue')}</TableHead>
            <TableHead>{t('admin.created')}</TableHead>
            <TableHead>{t('admin.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders?.map((order: any) => (
            <TableRow key={order.id}>
              <TableCell>{order.orderNumber}</TableCell>
              <TableCell>{order.dealerName || order.dealerId}</TableCell>
              <TableCell>
                <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                  {t(`orders.${order.status}`)}
                </Badge>
              </TableCell>
              <TableCell>${order.totalValue}</TableCell>
              <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Select
                    value={order.status}
                    onValueChange={(value) => updateOrderMutation.mutate({ id: order.id, data: { status: value } })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received">{t('orders.received')}</SelectItem>
                      <SelectItem value="sentToFactory">{t('orders.sentToFactory')}</SelectItem>
                      <SelectItem value="inProduction">{t('orders.inProduction')}</SelectItem>
                      <SelectItem value="delivered">{t('orders.delivered')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setEditingOrder({ ...order })}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('admin.editOrderDetails')}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>{t('admin.notes')}</Label>
                          <Input
                            value={editingOrder?.notes || ''}
                            onChange={(e) => setEditingOrder({ ...editingOrder, notes: e.target.value })}
                          />
                        </div>
                        <Button
                          onClick={() => {
                            if (editingOrder) {
                              updateOrderMutation.mutate({ id: editingOrder.id, data: { notes: editingOrder.notes } });
                              setEditingOrder(null);
                            }
                          }}
                          disabled={updateOrderMutation.isPending}
                        >
                          {updateOrderMutation.isPending ? t('admin.updating') : t('admin.update')}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage(Math.max(1, page - 1))}
                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {visiblePages.map((p, index) => (
              <PaginationItem key={index}>
                {p === '...' ? (
                  <span className="px-3 py-2">...</span>
                ) : (
                  <PaginationLink
                    onClick={() => setPage(p as number)}
                    isActive={p === page}
                    className="cursor-pointer"
                  >
                    {p}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(Math.min(Math.ceil(total / limit), page + 1))}
                className={page === Math.ceil(total / limit) ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}

export default OrderManagement;