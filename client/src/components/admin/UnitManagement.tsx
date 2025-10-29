import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SortableList } from "@/components/ui/sortable-list";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import type { Unit, InsertUnit } from "@shared/schema";

/**
 * Unit Management Component
 */
function UnitManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: result, isLoading } = useQuery({
    queryKey: ['/api/admin/units'],
    queryFn: () => apiRequest('GET', '/api/admin/units').then(res => res.json()),
  });
  const units = result?.items || [];
  const total = result?.total || 0;

  const [newUnit, setNewUnit] = useState({ name: '' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Partial<Unit> | null>(null);

  const createUnitMutation = useMutation({
    mutationFn: async (unitData: InsertUnit) => {
      const response = await apiRequest('POST', '/api/admin/units', unitData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/units'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setIsAddDialogOpen(false);
      setNewUnit({ name: '' });
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertUnit> }) => {
      const response = await apiRequest('PUT', `/api/admin/units/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/units'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/units/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/units'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
  });

  const reorderUnitsMutation = useMutation({
    mutationFn: async (items: Unit[]) => {
      const response = await apiRequest('PUT', '/api/admin/units/reorder', { items });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/units'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
  });

  const handleReorder = (reorderedItems: Unit[]) => {
    reorderUnitsMutation.mutate(reorderedItems);
  };

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{t('admin.totalUnits', { count: total })}</p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.addUnit')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.addNewUnit')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('admin.name')}</Label>
                <Input
                  value={newUnit.name}
                  onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                />
              </div>
              <Button onClick={() => createUnitMutation.mutate(newUnit)} disabled={createUnitMutation.isPending}>
                {createUnitMutation.isPending ? t('admin.creating') : t('admin.createUnit')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <SortableList<Unit>
        items={units}
        onReorder={handleReorder}
        renderItem={(unit: Unit) => (
          <div className="flex items-center justify-between w-full">
            <div>
              <div className="font-medium">{unit.name}</div>
              <div className="text-sm text-muted-foreground">
                Created: {new Date(unit.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="flex space-x-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setEditingUnit({ ...unit })}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('admin.editUnit')}</DialogTitle>
                    <DialogDescription>{t('admin.editUnitDescription')}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>{t('admin.name')}</Label>
                      <Input
                        value={editingUnit?.name || ''}
                        onChange={(e) => setEditingUnit({ ...editingUnit, name: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (editingUnit && editingUnit.id) {
                          updateUnitMutation.mutate({
                            id: editingUnit.id,
                            data: {
                              name: editingUnit.name
                            }
                          });
                          setEditingUnit(null);
                        }
                      }}
                      disabled={updateUnitMutation.isPending}
                    >
                      {updateUnitMutation.isPending ? t('admin.updating') : t('admin.update')}
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
                    <AlertDialogTitle>{t('admin.deleteUnit')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('admin.confirmDeleteUnit', { unit: unit.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteUnitMutation.mutate(unit.id)}>
                      {t('common.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      />
    </div>
  );
}

export default UnitManagement;