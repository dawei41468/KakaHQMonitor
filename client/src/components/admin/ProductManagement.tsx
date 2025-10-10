import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SortableList } from "@/components/ui/sortable-list";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";

/**
 * Product Management Component
 * Handles product CRUD operations with category selection
 */
function ProductManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data: result, isLoading } = useQuery({
    queryKey: ['/api/admin/products', page],
    queryFn: () => apiRequest('GET', `/api/admin/products?limit=${limit}&offset=${(page - 1) * limit}`).then(res => res.json()),
  });
  const products = result?.items || [];
  const total = result?.total || 0;

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: () => apiRequest('GET', '/api/categories').then(res => res.json()),
  });

  const [newProduct, setNewProduct] = useState({ name: '', defaultSpecification: '', categoryId: '' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const response = await apiRequest('POST', '/api/admin/products', productData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsAddDialogOpen(false);
      setNewProduct({ name: '', defaultSpecification: '', categoryId: '' });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/admin/products/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/products/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const reorderProductsMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const response = await apiRequest('PUT', '/api/admin/products/reorder', { items });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const handleReorder = (reorderedItems: any[]) => {
    reorderProductsMutation.mutate(reorderedItems);
  };

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{t('admin.totalProducts', { count: total })}</p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.addProduct')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.addNewProduct')}</DialogTitle>
              <DialogDescription>{t('admin.editProductDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('admin.name')}</Label>
                <Input
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('admin.defaultSpecification')}</Label>
                <Input
                  value={newProduct.defaultSpecification}
                  onChange={(e) => setNewProduct({ ...newProduct, defaultSpecification: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('admin.category')}</Label>
                <Select value={newProduct.categoryId} onValueChange={(value) => setNewProduct({ ...newProduct, categoryId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createProductMutation.mutate(newProduct)} disabled={createProductMutation.isPending}>
                {createProductMutation.isPending ? t('admin.creating') : t('admin.createProduct')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <SortableList
        items={products}
        onReorder={handleReorder}
        renderItem={(product: any) => {
          const category = categories.find((cat: any) => cat.id === product.categoryId);
          return (
            <div className="flex items-center justify-between w-full">
              <div className="flex-1">
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-muted-foreground">
                  Specification: {product.defaultSpecification} | Category: {category?.name || '-'} | Created: {new Date(product.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex space-x-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setEditingProduct({ ...product })}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('admin.editProduct')}</DialogTitle>
                      <DialogDescription>{t('admin.editProductDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>{t('admin.name')}</Label>
                        <Input
                          value={editingProduct?.name || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>{t('admin.specification')}</Label>
                        <Input
                          value={editingProduct?.defaultSpecification || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, defaultSpecification: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>{t('admin.category')}</Label>
                        <Select
                          value={editingProduct?.categoryId || ''}
                          onValueChange={(value) => setEditingProduct({ ...editingProduct, categoryId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat: any) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={() => {
                          if (editingProduct) {
                            updateProductMutation.mutate({
                              id: editingProduct.id,
                              data: {
                                name: editingProduct.name,
                                defaultSpecification: editingProduct.defaultSpecification,
                                categoryId: editingProduct.categoryId
                              }
                            });
                            setEditingProduct(null);
                          }
                        }}
                        disabled={updateProductMutation.isPending}
                      >
                        {updateProductMutation.isPending ? t('admin.updating') : t('admin.update')}
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
                      <AlertDialogTitle>{t('admin.deleteProduct')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('admin.confirmDeleteProduct', { product: product.name })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteProductMutation.mutate(product.id)}>
                        {t('common.delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

export default ProductManagement;