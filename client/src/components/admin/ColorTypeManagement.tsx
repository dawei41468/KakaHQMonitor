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
import { ColorType, InsertColorType } from "@shared/schema";

/**
 * Color Type Management Component
 */
function ColorTypeManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: result, isLoading } = useQuery({
    queryKey: ['/api/admin/color-types'],
    queryFn: () => apiRequest('GET', '/api/admin/color-types').then(res => res.json()),
  });
  const colorTypes = result?.items || [];
  const total = result?.total || 0;

  const [newColorType, setNewColorType] = useState({ name: '' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingColorType, setEditingColorType] = useState<Partial<ColorType> | null>(null);

  const createColorTypeMutation = useMutation({
    mutationFn: async (colorTypeData: InsertColorType) => {
      const response = await apiRequest('POST', '/api/admin/color-types', colorTypeData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/color-types'] });
      queryClient.invalidateQueries({ queryKey: ['color-types'] });
      setIsAddDialogOpen(false);
      setNewColorType({ name: '' });
    },
  });

  const updateColorTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertColorType> }) => {
      const response = await apiRequest('PUT', `/api/admin/color-types/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/color-types'] });
      queryClient.invalidateQueries({ queryKey: ['color-types'] });
    },
  });

  const deleteColorTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/color-types/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/color-types'] });
      queryClient.invalidateQueries({ queryKey: ['color-types'] });
    },
  });

  const reorderColorTypesMutation = useMutation({
    mutationFn: async (items: ColorType[]) => {
      const response = await apiRequest('PUT', '/api/admin/color-types/reorder', { items });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/color-types'] });
      queryClient.invalidateQueries({ queryKey: ['color-types'] });
    },
  });

  const handleReorder = (reorderedItems: ColorType[]) => {
    reorderColorTypesMutation.mutate(reorderedItems);
  };

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{t('admin.totalColorTypes', { count: total })}</p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.addColorType')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.addNewColorType')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('admin.name')}</Label>
                <Input
                  value={newColorType.name}
                  onChange={(e) => setNewColorType({ name: e.target.value })}
                />
              </div>
              <Button onClick={() => createColorTypeMutation.mutate(newColorType)} disabled={createColorTypeMutation.isPending}>
                {createColorTypeMutation.isPending ? t('admin.creating') : t('admin.createColorType')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <SortableList<ColorType>
        items={colorTypes}
        onReorder={handleReorder}
        renderItem={(colorType: ColorType) => (
          <div className="flex items-center justify-between w-full">
            <div>
              <div className="font-medium">{colorType.name}</div>
              <div className="text-sm text-muted-foreground">
                Created: {new Date(colorType.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="flex space-x-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setEditingColorType({ ...colorType })}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('admin.editColorType')}</DialogTitle>
                    <DialogDescription>{t('admin.editColorTypeDescription')}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>{t('admin.name')}</Label>
                      <Input
                        value={editingColorType?.name || ''}
                        onChange={(e) => setEditingColorType({ ...editingColorType, name: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (editingColorType && editingColorType.id) {
                          updateColorTypeMutation.mutate({ id: editingColorType.id, data: { name: editingColorType.name } });
                          setEditingColorType(null);
                        }
                      }}
                      disabled={updateColorTypeMutation.isPending}
                    >
                      {updateColorTypeMutation.isPending ? t('admin.updating') : t('admin.update')}
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
                    <AlertDialogTitle>{t('admin.deleteColorType')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('admin.confirmDeleteColorType', { colorType: colorType.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteColorTypeMutation.mutate(colorType.id)}>
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

export default ColorTypeManagement;