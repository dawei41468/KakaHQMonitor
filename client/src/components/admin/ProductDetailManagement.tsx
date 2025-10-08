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
 * Product Detail Management Component
 */
function ProductDetailManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data: result, isLoading } = useQuery({
    queryKey: ['/api/admin/product-details', page],
    queryFn: () => apiRequest('GET', `/api/admin/product-details?limit=${limit}&offset=${(page - 1) * limit}`).then(res => res.json()),
  });
  const productDetails = result?.items || [];
  const total = result?.total || 0;

  const [newProductDetail, setNewProductDetail] = useState({ name: '' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProductDetail, setEditingProductDetail] = useState<any>(null);

  const createProductDetailMutation = useMutation({
    mutationFn: async (productDetailData: any) => {
      const response = await apiRequest('POST', '/api/admin/product-details', productDetailData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/product-details'] });
      queryClient.invalidateQueries({ queryKey: ['product-details'] });
      setIsAddDialogOpen(false);
      setNewProductDetail({ name: '' });
    },
  });

  const updateProductDetailMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/admin/product-details/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/product-details'] });
      queryClient.invalidateQueries({ queryKey: ['product-details'] });
    },
  });

  const deleteProductDetailMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/product-details/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/product-details'] });
      queryClient.invalidateQueries({ queryKey: ['product-details'] });
    },
  });

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Total Product Details: {total}</p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product Detail
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Product Detail</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newProductDetail.name}
                  onChange={(e) => setNewProductDetail({ name: e.target.value })}
                />
              </div>
              <Button onClick={() => createProductDetailMutation.mutate(newProductDetail)} disabled={createProductDetailMutation.isPending}>
                {createProductDetailMutation.isPending ? 'Creating...' : 'Create Product Detail'}
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
          {productDetails?.map((productDetail: any) => (
            <TableRow key={productDetail.id}>
              <TableCell>{productDetail.name}</TableCell>
              <TableCell>{new Date(productDetail.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setEditingProductDetail({ ...productDetail })}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Product Detail</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={editingProductDetail?.name || ''}
                            onChange={(e) => setEditingProductDetail({ ...editingProductDetail, name: e.target.value })}
                          />
                        </div>
                        <Button
                          onClick={() => {
                            if (editingProductDetail) {
                              updateProductDetailMutation.mutate({ id: editingProductDetail.id, data: { name: editingProductDetail.name } });
                              setEditingProductDetail(null);
                            }
                          }}
                          disabled={updateProductDetailMutation.isPending}
                        >
                          {updateProductDetailMutation.isPending ? 'Updating...' : 'Update'}
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
                        <AlertDialogTitle>Delete Product Detail</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {productDetail.name}?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteProductDetailMutation.mutate(productDetail.id)}>
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

export default ProductDetailManagement;