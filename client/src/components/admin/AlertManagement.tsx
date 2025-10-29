import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { Alert, InsertAlert } from "@shared/schema";

/**
 * Alert Management Component
 * Handles alert CRUD operations with pagination
 */
function AlertManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data: result, isLoading } = useQuery<{ items: Alert[], total: number }>({
    queryKey: ['/api/admin/alerts?includeResolved=true', page],
    queryFn: () => apiRequest('GET', `/api/admin/alerts?includeResolved=true&limit=${limit}&offset=${(page - 1) * limit}`).then(res => res.json()),
  });
  const alerts = result?.items || [];
  const total = result?.total || 0;

  const [newAlert, setNewAlert] = useState<InsertAlert>({ type: 'info', title: '', message: '', priority: 'medium' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const createAlertMutation = useMutation({
    mutationFn: async (alertData: InsertAlert) => {
      const response = await apiRequest('POST', '/api/admin/alerts', alertData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts?includeResolved=true'], exact: false });
      setIsAddDialogOpen(false);
      setNewAlert({ type: 'info', title: '', message: '', priority: 'medium' });
    },
  });

  const updateAlertMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { resolved: boolean } }) => {
      const response = await apiRequest('PUT', `/api/admin/alerts/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts?includeResolved=true'], exact: false });
    },
  });

  const deleteAlertMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/alerts/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts?includeResolved=true'], exact: false });
    },
  });

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{t('admin.totalAlerts', { count: total })}</p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.createAlert')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.createManualAlert')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('admin.type')}</Label>
                <Select value={newAlert.type} onValueChange={(value) => setNewAlert({ ...newAlert, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lowStock">{t('admin.lowStock')}</SelectItem>
                    <SelectItem value="delay">{t('admin.delay')}</SelectItem>
                    <SelectItem value="critical">{t('admin.critical')}</SelectItem>
                    <SelectItem value="info">{t('admin.info')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('admin.title')}</Label>
                <Input value={newAlert.title} onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })} />
              </div>
              <div>
                <Label>{t('admin.message')}</Label>
                <Input value={newAlert.message} onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })} />
              </div>
              <div>
                <Label>{t('admin.priority')}</Label>
                <Select value={newAlert.priority} onValueChange={(value) => setNewAlert({ ...newAlert, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('admin.low')}</SelectItem>
                    <SelectItem value="medium">{t('admin.medium')}</SelectItem>
                    <SelectItem value="high">{t('admin.high')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createAlertMutation.mutate(newAlert)} disabled={createAlertMutation.isPending}>
                {createAlertMutation.isPending ? t('admin.creating') : t('admin.createAlert')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.type')}</TableHead>
            <TableHead>{t('admin.title')}</TableHead>
            <TableHead>{t('admin.priority')}</TableHead>
            <TableHead>{t('admin.resolved')}</TableHead>
            <TableHead>{t('admin.created')}</TableHead>
            <TableHead>{t('admin.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts?.map((alert: Alert) => (
            <TableRow key={alert.id}>
              <TableCell>{t(`admin.${alert.type}`)}</TableCell>
              <TableCell>{alert.title}</TableCell>
              <TableCell>
                <Badge variant={alert.priority === 'high' ? 'destructive' : alert.priority === 'medium' ? 'default' : 'secondary'}>
                  {t(`admin.${alert.priority}`)}
                </Badge>
              </TableCell>
              <TableCell>{alert.resolved ? t('admin.resolved') : t('common.active')}</TableCell>
              <TableCell>{new Date(alert.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  {!alert.resolved && (
                    <Button variant="outline" size="sm" onClick={() => updateAlertMutation.mutate({ id: alert.id, data: { resolved: true } })}>
                      {t('alerts.resolve')}
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.deleteAlert')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('admin.confirmDeleteAlert')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteAlertMutation.mutate(alert.id)}>
                          {t('common.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
            {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1).map((p) => (
              <PaginationItem key={p}>
                <PaginationLink
                  onClick={() => setPage(p)}
                  isActive={p === page}
                  className="cursor-pointer"
                >
                  {p}
                </PaginationLink>
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

export default AlertManagement;