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

/**
 * Region Management Component
 */
function RegionManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: result, isLoading } = useQuery({
    queryKey: ['/api/admin/regions'],
    queryFn: () => apiRequest('GET', '/api/admin/regions').then(res => res.json()),
  });
  const regions = result?.items || [];
  const total = result?.total || 0;

  const [newRegion, setNewRegion] = useState({ name: '' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<any>(null);

  const createRegionMutation = useMutation({
    mutationFn: async (regionData: any) => {
      const response = await apiRequest('POST', '/api/admin/regions', regionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/regions'] });
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      setIsAddDialogOpen(false);
      setNewRegion({ name: '' });
    },
  });

  const updateRegionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/admin/regions/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/regions'] });
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    },
  });

  const deleteRegionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/regions/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/regions'] });
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    },
  });

  const reorderRegionsMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const response = await apiRequest('PUT', '/api/admin/regions/reorder', { items });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/regions'] });
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    },
  });

  const handleReorder = (reorderedItems: any[]) => {
    reorderRegionsMutation.mutate(reorderedItems);
  };

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{t('admin.totalRegions', { count: total })}</p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.addRegion')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.addNewRegion')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('admin.name')}</Label>
                <Input
                  value={newRegion.name}
                  onChange={(e) => setNewRegion({ name: e.target.value })}
                />
              </div>
              <Button onClick={() => createRegionMutation.mutate(newRegion)} disabled={createRegionMutation.isPending}>
                {createRegionMutation.isPending ? t('admin.creating') : t('admin.createRegion')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <SortableList
        items={regions}
        onReorder={handleReorder}
        renderItem={(region: any) => (
          <div className="flex items-center justify-between w-full">
            <div>
              <div className="font-medium">{region.name}</div>
              <div className="text-sm text-muted-foreground">
                Created: {new Date(region.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="flex space-x-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setEditingRegion({ ...region })}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('admin.editRegion')}</DialogTitle>
                    <DialogDescription>{t('admin.editRegionDescription')}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>{t('admin.name')}</Label>
                      <Input
                        value={editingRegion?.name || ''}
                        onChange={(e) => setEditingRegion({ ...editingRegion, name: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (editingRegion) {
                          updateRegionMutation.mutate({ id: editingRegion.id, data: { name: editingRegion.name } });
                          setEditingRegion(null);
                        }
                      }}
                      disabled={updateRegionMutation.isPending}
                    >
                      {updateRegionMutation.isPending ? t('admin.updating') : t('admin.update')}
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
                    <AlertDialogTitle>{t('admin.deleteRegion')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('admin.confirmDeleteRegion', { region: region.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteRegionMutation.mutate(region.id)}>
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

export default RegionManagement;