import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data: result, isLoading } = useQuery({
    queryKey: ['/api/admin/categories', page],
    queryFn: () => apiRequest('GET', `/api/admin/categories?limit=${limit}&offset=${(page - 1) * limit}`).then(res => res.json()),
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

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Total Categories: {total}</p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ name: e.target.value })}
                />
              </div>
              <Button onClick={() => createCategoryMutation.mutate(newCategory)} disabled={createCategoryMutation.isPending}>
                {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories?.map((category: any) => (
            <TableRow key={category.id}>
              <TableCell>{category.name}</TableCell>
              <TableCell>{new Date(category.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setEditingCategory({ ...category })}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Name</Label>
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
                          {updateCategoryMutation.isPending ? 'Updating...' : 'Update'}
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
                        <AlertDialogTitle>Delete Category</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {category.name}?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteCategoryMutation.mutate(category.id)}>
                          Delete
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
    </div>
  );
}

export default CategoryManagement;