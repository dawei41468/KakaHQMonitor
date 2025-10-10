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
 * Category Management Component
 */
function CategoryManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: result, isLoading } = useQuery({
    queryKey: ['/api/admin/categories'],
    queryFn: () => apiRequest('GET', '/api/admin/categories').then(res => res.json()),
  });
  const categories = result?.items || [];
  const total = result?.total || 0;

  const [newCategory, setNewCategory] = useState({ name: '' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: any) => {
      const response = await apiRequest('POST', '/api/admin/categories', categoryData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsAddDialogOpen(false);
      setNewCategory({ name: '' });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/admin/categories/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/categories/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const reorderCategoriesMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const response = await apiRequest('PUT', '/api/admin/categories/reorder', { items });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const handleReorder = (reorderedItems: any[]) => {
    reorderCategoriesMutation.mutate(reorderedItems);
  };

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{t('admin.totalCategories', { count: total })}</p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.addCategory')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.addNewCategory')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('admin.name')}</Label>
                <Input
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ name: e.target.value })}
                />
              </div>
              <Button onClick={() => createCategoryMutation.mutate(newCategory)} disabled={createCategoryMutation.isPending}>
                {createCategoryMutation.isPending ? t('admin.creating') : t('admin.createCategory')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <SortableList
        items={categories}
        onReorder={handleReorder}
        renderItem={(category: any) => (
          <div className="flex items-center justify-between w-full">
            <div>
              <div className="font-medium">{category.name}</div>
              <div className="text-sm text-muted-foreground">
                Created: {new Date(category.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="flex space-x-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setEditingCategory({ ...category })}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('admin.editCategory')}</DialogTitle>
                    <DialogDescription>{t('admin.editCategoryDescription')}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>{t('admin.name')}</Label>
                      <Input
                        value={editingCategory?.name || ''}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (editingCategory) {
                          updateCategoryMutation.mutate({ id: editingCategory.id, data: { name: editingCategory.name } });
                          setEditingCategory(null);
                        }
                      }}
                      disabled={updateCategoryMutation.isPending}
                    >
                      {updateCategoryMutation.isPending ? t('admin.updating') : t('admin.update')}
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
                    <AlertDialogTitle>{t('admin.deleteCategory')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('admin.confirmDeleteCategory', { category: category.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteCategoryMutation.mutate(category.id)}>
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

export default CategoryManagement;