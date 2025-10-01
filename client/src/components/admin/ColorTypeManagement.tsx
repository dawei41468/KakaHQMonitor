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
 * Color Type Management Component
 */
function ColorTypeManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data: result, isLoading } = useQuery({
    queryKey: ['/api/admin/color-types', page],
    queryFn: () => apiRequest('GET', `/api/admin/color-types?limit=${limit}&offset=${(page - 1) * limit}`).then(res => res.json()),
  });
  const colorTypes = result?.items || [];
  const total = result?.total || 0;

  const [newColorType, setNewColorType] = useState({ name: '' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingColorType, setEditingColorType] = useState<any>(null);

  const createColorTypeMutation = useMutation({
    mutationFn: async (colorTypeData: any) => {
      const response = await apiRequest('POST', '/api/admin/color-types', colorTypeData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/color-types'] });
      setIsAddDialogOpen(false);
      setNewColorType({ name: '' });
    },
  });

  const updateColorTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/admin/color-types/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/color-types'] });
    },
  });

  const deleteColorTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/color-types/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/color-types'] });
    },
  });

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Total Color Types: {total}</p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Color Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Color Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newColorType.name}
                  onChange={(e) => setNewColorType({ name: e.target.value })}
                />
              </div>
              <Button onClick={() => createColorTypeMutation.mutate(newColorType)} disabled={createColorTypeMutation.isPending}>
                {createColorTypeMutation.isPending ? 'Creating...' : 'Create Color Type'}
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
          {colorTypes?.map((colorType: any) => (
            <TableRow key={colorType.id}>
              <TableCell>{colorType.name}</TableCell>
              <TableCell>{new Date(colorType.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setEditingColorType({ ...colorType })}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Color Type</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={editingColorType?.name || ''}
                            onChange={(e) => setEditingColorType({ ...editingColorType, name: e.target.value })}
                          />
                        </div>
                        <Button
                          onClick={() => {
                            if (editingColorType) {
                              updateColorTypeMutation.mutate({ id: editingColorType.id, data: { name: editingColorType.name } });
                              setEditingColorType(null);
                            }
                          }}
                          disabled={updateColorTypeMutation.isPending}
                        >
                          {updateColorTypeMutation.isPending ? 'Updating...' : 'Update'}
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
                        <AlertDialogTitle>Delete Color Type</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {colorType.name}?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteColorTypeMutation.mutate(colorType.id)}>
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

export default ColorTypeManagement;