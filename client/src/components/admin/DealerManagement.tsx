import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";

/**
 * Dealer Management Component
 * Handles dealer CRUD operations with pagination
 */
function DealerManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data: result, isLoading } = useQuery({
    queryKey: ['/api/admin/dealers', page],
    queryFn: () => apiRequest('GET', `/api/admin/dealers?limit=${limit}&offset=${(page - 1) * limit}`).then(res => res.json()),
  });
  const dealers = result?.items || [];
  const total = result?.total || 0;

  const [newDealer, setNewDealer] = useState({ name: '', territory: '', contactEmail: '', contactPhone: '' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const createDealerMutation = useMutation({
    mutationFn: async (dealerData: any) => {
      const response = await apiRequest('POST', '/api/admin/dealers', dealerData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dealers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dealers'] });
      setIsAddDialogOpen(false);
      setNewDealer({ name: '', territory: '', contactEmail: '', contactPhone: '' });
    },
  });

  const updateDealerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/admin/dealers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dealers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dealers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/overview'] });
      setIsEditDialogOpen(false);
      setEditingDealer(null);
    },
  });

  const deleteDealerMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/dealers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dealers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dealers'] });
    },
  });

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{t('admin.totalDealers', { count: total })}</p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.addDealer')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.addNewDealer')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t('common.name')}</Label>
                <Input
                  id="name"
                  value={newDealer.name}
                  onChange={(e) => setNewDealer({ ...newDealer, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="territory">{t('admin.territory')}</Label>
                <Input
                  id="territory"
                  value={newDealer.territory}
                  onChange={(e) => setNewDealer({ ...newDealer, territory: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contactEmail">{t('admin.contactEmail')}</Label>
                <Input
                  id="contactEmail"
                  value={newDealer.contactEmail}
                  onChange={(e) => setNewDealer({ ...newDealer, contactEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">{t('admin.contactPhone')}</Label>
                <Input
                  id="contactPhone"
                  value={newDealer.contactPhone}
                  onChange={(e) => setNewDealer({ ...newDealer, contactPhone: e.target.value })}
                />
              </div>
              <Button onClick={() => createDealerMutation.mutate(newDealer)} disabled={createDealerMutation.isPending}>
                {createDealerMutation.isPending ? t('admin.creating') : t('admin.createDealer')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('common.name')}</TableHead>
            <TableHead>{t('admin.territory')}</TableHead>
            <TableHead>{t('admin.contactEmail')}</TableHead>
            <TableHead>{t('admin.contactPhone')}</TableHead>
            <TableHead>{t('admin.created')}</TableHead>
            <TableHead>{t('admin.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dealers?.map((dealer: any) => (
            <TableRow key={dealer.id}>
              <TableCell>{dealer.name}</TableCell>
              <TableCell>{dealer.territory}</TableCell>
              <TableCell>{dealer.contactEmail || '-'}</TableCell>
              <TableCell>{dealer.contactPhone || '-'}</TableCell>
              <TableCell>{new Date(dealer.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditingDealer({ ...dealer });
                        setIsEditDialogOpen(true);
                      }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('admin.editDealer')}</DialogTitle>
                        <DialogDescription>{t('admin.editDealerDescription')}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>{t('common.name')}</Label>
                          <Input
                            value={editingDealer?.name || ''}
                            onChange={(e) => setEditingDealer({ ...editingDealer, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>{t('admin.territory')}</Label>
                          <Input
                            value={editingDealer?.territory || ''}
                            onChange={(e) => setEditingDealer({ ...editingDealer, territory: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>{t('admin.contactEmail')}</Label>
                          <Input
                            value={editingDealer?.contactEmail || ''}
                            onChange={(e) => setEditingDealer({ ...editingDealer, contactEmail: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>{t('admin.contactPhone')}</Label>
                          <Input
                            value={editingDealer?.contactPhone || ''}
                            onChange={(e) => setEditingDealer({ ...editingDealer, contactPhone: e.target.value })}
                          />
                        </div>
                        <Button
                          onClick={() => {
                            if (editingDealer) {
                              updateDealerMutation.mutate({
                                id: editingDealer.id,
                                data: {
                                  name: editingDealer.name,
                                  territory: editingDealer.territory,
                                  contactEmail: editingDealer.contactEmail,
                                  contactPhone: editingDealer.contactPhone
                                }
                              });
                            }
                          }}
                          disabled={updateDealerMutation.isPending}
                        >
                          {updateDealerMutation.isPending ? t('admin.updating') : t('admin.update')}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.deleteDealer')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('admin.confirmDeleteDealer', { dealer: dealer.name })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteDealerMutation.mutate(dealer.id)}>
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

export default DealerManagement;