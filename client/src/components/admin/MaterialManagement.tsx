import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { Material, InsertMaterial } from "@shared/schema";

/**
 * Material Management Component
 * Handles material CRUD operations with pagination
 */
function MaterialManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data: result, isLoading } = useQuery<{ items: Material[], total: number }>({
    queryKey: ['/api/admin/materials', page],
    queryFn: () => apiRequest('GET', `/api/admin/materials?limit=${limit}&offset=${(page - 1) * limit}`).then(res => res.json()),
  });
  const materials = result?.items || [];
  const total = result?.total || 0;

  const [newMaterial, setNewMaterial] = useState({ name: '', category: '', currentStock: 0, maxStock: 100, threshold: 20, unit: 'units' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Partial<Material> | null>(null);
  const [newStocks, setNewStocks] = useState<Record<string, number>>({});

  const createMaterialMutation = useMutation({
    mutationFn: async (materialData: InsertMaterial) => {
      const response = await apiRequest('POST', '/api/admin/materials', materialData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/materials'] });
      setIsAddDialogOpen(false);
      setNewMaterial({ name: '', category: '', currentStock: 0, maxStock: 100, threshold: 20, unit: 'units' });
    },
  });

  const updateMaterialMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertMaterial> }) => {
      const response = await apiRequest('PUT', `/api/admin/materials/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/materials'] });
    },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/materials/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete material');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/materials'] });
    },
  });

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{t('admin.totalMaterials', { count: total })}</p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.addMaterial')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.addNewMaterial')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('common.name')}</Label>
                <Input value={newMaterial.name} onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })} />
              </div>
              <div>
                <Label>{t('admin.category')}</Label>
                <Input value={newMaterial.category} onChange={(e) => setNewMaterial({ ...newMaterial, category: e.target.value })} />
              </div>
              <div>
                <Label>{t('admin.currentStock')}</Label>
                <Input type="number" value={newMaterial.currentStock} onChange={(e) => setNewMaterial({ ...newMaterial, currentStock: Number(e.target.value) })} />
              </div>
              <div>
                <Label>{t('admin.maxStock')}</Label>
                <Input type="number" value={newMaterial.maxStock} onChange={(e) => setNewMaterial({ ...newMaterial, maxStock: Number(e.target.value) })} />
              </div>
              <div>
                <Label>{t('admin.threshold')}</Label>
                <Input type="number" value={newMaterial.threshold} onChange={(e) => setNewMaterial({ ...newMaterial, threshold: Number(e.target.value) })} />
              </div>
              <div>
                <Label>{t('admin.unit')}</Label>
                <Input value={newMaterial.unit} onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })} />
              </div>
              <Button onClick={() => createMaterialMutation.mutate(newMaterial)} disabled={createMaterialMutation.isPending}>
                {createMaterialMutation.isPending ? t('admin.creating') : t('admin.createMaterial')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('common.name')}</TableHead>
            <TableHead>{t('admin.category')}</TableHead>
            <TableHead>{t('admin.currentStock')}</TableHead>
            <TableHead>{t('admin.maxStock')}</TableHead>
            <TableHead>{t('admin.unit')}</TableHead>
            <TableHead>{t('admin.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials?.map((material: Material) => (
            <TableRow key={material.id}>
              <TableCell>{material.name}</TableCell>
              <TableCell>{material.category}</TableCell>
              <TableCell>{material.currentStock}</TableCell>
              <TableCell>{material.maxStock}</TableCell>
              <TableCell>{material.unit}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setEditingMaterial({ ...material })}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('admin.editMaterial')}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>{t('common.name')}</Label>
                          <Input
                            value={editingMaterial?.name || ''}
                            onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>{t('admin.category')}</Label>
                          <Input
                            value={editingMaterial?.category || ''}
                            onChange={(e) => setEditingMaterial({ ...editingMaterial, category: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>{t('admin.maxStock')}</Label>
                          <Input
                            type="number"
                            value={editingMaterial?.maxStock || 0}
                            onChange={(e) => setEditingMaterial({ ...editingMaterial, maxStock: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>{t('admin.threshold')}</Label>
                          <Input
                            type="number"
                            value={editingMaterial?.threshold || 0}
                            onChange={(e) => setEditingMaterial({ ...editingMaterial, threshold: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>{t('admin.unit')}</Label>
                          <Input
                            value={editingMaterial?.unit || ''}
                            onChange={(e) => setEditingMaterial({ ...editingMaterial, unit: e.target.value })}
                          />
                        </div>
                        <Button
                          onClick={() => {
                            if (editingMaterial && editingMaterial.id) {
                              updateMaterialMutation.mutate({
                                id: editingMaterial.id,
                                data: {
                                  name: editingMaterial.name,
                                  category: editingMaterial.category,
                                  maxStock: editingMaterial.maxStock,
                                  threshold: editingMaterial.threshold,
                                  unit: editingMaterial.unit
                                }
                              });
                              setEditingMaterial(null);
                            }
                          }}
                          disabled={updateMaterialMutation.isPending}
                        >
                          {updateMaterialMutation.isPending ? t('admin.updating') : t('admin.update')}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      placeholder={t('admin.newStock')}
                      className="w-20"
                      value={newStocks[material.id] || material.currentStock}
                      onChange={(e) => setNewStocks(prev => ({ ...prev, [material.id]: Number(e.target.value) }))}
                    />
                    <Button variant="outline" size="sm" onClick={() => updateMaterialMutation.mutate({ id: material.id, data: { currentStock: newStocks[material.id] || material.currentStock } })}>
                      {t('admin.updateStock')}
                    </Button>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.deleteMaterial')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('admin.confirmDeleteMaterial', { material: material.name })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMaterialMutation.mutate(material.id)}>
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

export default MaterialManagement;