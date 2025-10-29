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
import { Color, InsertColor } from "@shared/schema";

/**
 * Color Management Component
 */
function ColorManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: result, isLoading } = useQuery({
    queryKey: ['/api/admin/colors'],
    queryFn: () => apiRequest('GET', '/api/admin/colors').then(res => res.json()),
  });
  const colors = result?.items || [];
  const total = result?.total || 0;

  const [newColor, setNewColor] = useState({ name: '' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<Partial<Color> | null>(null);

  const createColorMutation = useMutation({
    mutationFn: async (colorData: InsertColor) => {
      const response = await apiRequest('POST', '/api/admin/colors', colorData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/colors'] });
      queryClient.invalidateQueries({ queryKey: ['colors'] });
      setIsAddDialogOpen(false);
      setNewColor({ name: '' });
    },
  });

  const updateColorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertColor> }) => {
      const response = await apiRequest('PUT', `/api/admin/colors/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/colors'] });
      queryClient.invalidateQueries({ queryKey: ['colors'] });
    },
  });

  const deleteColorMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/colors/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/colors'] });
      queryClient.invalidateQueries({ queryKey: ['colors'] });
    },
  });

  const reorderColorsMutation = useMutation({
    mutationFn: async (items: Color[]) => {
      const response = await apiRequest('PUT', '/api/admin/colors/reorder', { items });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/colors'] });
      queryClient.invalidateQueries({ queryKey: ['colors'] });
    },
  });

  const handleReorder = (reorderedItems: Color[]) => {
    reorderColorsMutation.mutate(reorderedItems);
  };

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{t('admin.totalColors', { count: total })}</p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.addColor')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.addNewColor')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('admin.name')}</Label>
                <Input
                  value={newColor.name}
                  onChange={(e) => setNewColor({ name: e.target.value })}
                />
              </div>
              <Button onClick={() => createColorMutation.mutate(newColor)} disabled={createColorMutation.isPending}>
                {createColorMutation.isPending ? t('admin.creating') : t('admin.createColor')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <SortableList<Color>
        items={colors}
        onReorder={handleReorder}
        renderItem={(color: Color) => (
          <div className="flex items-center justify-between w-full">
            <div>
              <div className="font-medium">{color.name}</div>
              <div className="text-sm text-muted-foreground">
                Created: {new Date(color.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="flex space-x-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setEditingColor({ ...color })}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('admin.editColor')}</DialogTitle>
                    <DialogDescription>{t('admin.editColorDescription')}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>{t('admin.name')}</Label>
                      <Input
                        value={editingColor?.name || ''}
                        onChange={(e) => setEditingColor({ ...editingColor, name: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (editingColor && editingColor.id) {
                          updateColorMutation.mutate({ id: editingColor.id, data: { name: editingColor.name } });
                          setEditingColor(null);
                        }
                      }}
                      disabled={updateColorMutation.isPending}
                    >
                      {updateColorMutation.isPending ? t('admin.updating') : t('admin.update')}
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
                    <AlertDialogTitle>{t('admin.deleteColor')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('admin.confirmDeleteColor', { color: color.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteColorMutation.mutate(color.id)}>
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

export default ColorManagement;