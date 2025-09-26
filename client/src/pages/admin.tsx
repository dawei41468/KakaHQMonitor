import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";


/**
 * User Management Component
 * Handles user CRUD operations with pagination
 */
function UserManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data: result, isLoading } = useQuery({
    queryKey: ['/api/admin/users', page],
    queryFn: () => apiRequest('GET', `/api/admin/users?limit=${limit}&offset=${(page - 1) * limit}`).then(res => res.json()),
  });
  const users = result?.items || [];
  const total = result?.total || 0;

  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'standard' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest('POST', '/api/admin/users', userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsAddDialogOpen(false);
      setNewUser({ email: '', password: '', name: '', role: 'standard' });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/admin/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/users/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{t('admin.totalUsers', { count: total })}</p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.addUser')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.addNewUser')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input
                  id="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="password">{t('common.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="name">{t('common.name')}</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="role">{t('common.role')}</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">{t('admin.standard')}</SelectItem>
                    <SelectItem value="admin">{t('admin.adminRole')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createUserMutation.mutate(newUser)} disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? t('admin.creating') : t('admin.createUser')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('common.name')}</TableHead>
            <TableHead>{t('common.email')}</TableHead>
            <TableHead>{t('common.role')}</TableHead>
            <TableHead>{t('admin.created')}</TableHead>
            <TableHead>{t('admin.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((user: any) => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {t(`admin.${user.role}`)}
                </Badge>
              </TableCell>
              <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('admin.editRole')}</DialogTitle>
                      </DialogHeader>
                      <Select
                        value={user.role}
                        onValueChange={(value) => updateUserMutation.mutate({ id: user.id, data: { role: value } })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">{t('admin.standard')}</SelectItem>
                          <SelectItem value="admin">{t('admin.adminRole')}</SelectItem>
                        </SelectContent>
                      </Select>
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
                        <AlertDialogTitle>{t('admin.deleteUser')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('admin.confirmDeleteUser', { user: user.name })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteUserMutation.mutate(user.id)}>
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

/**
 * Dealer Management Component
 * Handles dealer CRUD operations with pagination
 */
function DealerManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data: result, isLoading } = useQuery({
    queryKey: ['/api/admin/dealers', page],
    queryFn: () => apiRequest('GET', `/api/admin/dealers?limit=${limit}&offset=${(page - 1) * limit}`).then(res => res.json()),
  });
  const dealers = result?.items || [];
  const total = result?.total || 0;

  const [newDealer, setNewDealer] = useState({ name: '', territory: '', contactEmail: '', contactPhone: '' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const createDealerMutation = useMutation({
    mutationFn: async (dealerData: any) => {
      const response = await apiRequest('POST', '/api/admin/dealers', dealerData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dealers'] });
      setIsAddDialogOpen(false);
      setNewDealer({ name: '', territory: '', contactEmail: '', contactPhone: '' });
    },
  });

  const updateDealerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/admin/dealers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dealers'] });
    },
  });

  const deleteDealerMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/dealers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dealers'] });
    },
  });

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{t('admin.totalDealers', { count: total })}</p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.addDealer')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.addNewDealer')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t('common.name')}</Label>
                <Input
                  id="name"
                  value={newDealer.name}
                  onChange={(e) => setNewDealer({ ...newDealer, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="territory">{t('admin.territory')}</Label>
                <Input
                  id="territory"
                  value={newDealer.territory}
                  onChange={(e) => setNewDealer({ ...newDealer, territory: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contactEmail">{t('admin.contactEmail')}</Label>
                <Input
                  id="contactEmail"
                  value={newDealer.contactEmail}
                  onChange={(e) => setNewDealer({ ...newDealer, contactEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">{t('admin.contactPhone')}</Label>
                <Input
                  id="contactPhone"
                  value={newDealer.contactPhone}
                  onChange={(e) => setNewDealer({ ...newDealer, contactPhone: e.target.value })}
                />
              </div>
              <Button onClick={() => createDealerMutation.mutate(newDealer)} disabled={createDealerMutation.isPending}>
                {createDealerMutation.isPending ? t('admin.creating') : t('admin.createDealer')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('common.name')}</TableHead>
            <TableHead>{t('admin.territory')}</TableHead>
            <TableHead>{t('admin.contactEmail')}</TableHead>
            <TableHead>{t('admin.contactPhone')}</TableHead>
            <TableHead>{t('admin.created')}</TableHead>
            <TableHead>{t('admin.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dealers?.map((dealer: any) => (
            <TableRow key={dealer.id}>
              <TableCell>{dealer.name}</TableCell>
              <TableCell>{dealer.territory}</TableCell>
              <TableCell>{dealer.contactEmail || '-'}</TableCell>
              <TableCell>{dealer.contactPhone || '-'}</TableCell>
              <TableCell>{new Date(dealer.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('admin.editDealer')}</DialogTitle>
                      <DialogDescription>Update dealer information.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>{t('common.name')}</Label>
                        <Input defaultValue={dealer.name} onChange={(e) => dealer.name = e.target.value} />
                      </div>
                      <div>
                        <Label>{t('admin.territory')}</Label>
                        <Input defaultValue={dealer.territory} onChange={(e) => dealer.territory = e.target.value} />
                      </div>
                      <div>
                        <Label>{t('admin.contactEmail')}</Label>
                        <Input defaultValue={dealer.contactEmail} onChange={(e) => dealer.contactEmail = e.target.value} />
                      </div>
                      <div>
                        <Label>{t('admin.contactPhone')}</Label>
                        <Input defaultValue={dealer.contactPhone} onChange={(e) => dealer.contactPhone = e.target.value} />
                      </div>
                      <Button onClick={() => updateDealerMutation.mutate({ id: dealer.id, data: dealer })}>
                        {t('admin.update')}
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
                        <AlertDialogTitle>{t('admin.deleteDealer')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('admin.confirmDeleteDealer', { dealer: dealer.name })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteDealerMutation.mutate(dealer.id)}>
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

/**
 * Order Management Component
 * Handles order status updates with pagination
 */
function OrderManagement() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const limit = 10;
    const { data: result, isLoading } = useQuery<{ items: any[], total: number }>({
      queryKey: ['/api/admin/orders', page],
      queryFn: () => apiRequest('GET', `/api/admin/orders?limit=${limit}&offset=${(page - 1) * limit}`).then(res => res.json()),
      placeholderData: (previousData) => previousData,
    });
    const orders = result?.items || [];
    const total = result?.total || 0;

    const totalPages = Math.ceil(total / limit);

    const getVisiblePages = (current: number, totalPages: number, maxVisible: number = 5) => {
      const pages: (number | string)[] = [];
      const half = Math.floor(maxVisible / 2);

      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);

        let start = Math.max(2, current - half);
        let end = Math.min(totalPages - 1, current + half);

        if (start > 2) {
          pages.push('...');
        }

        for (let i = start; i <= end; i++) {
          pages.push(i);
        }

        if (end < totalPages - 1) {
          pages.push('...');
        }

        if (totalPages > 1) {
          pages.push(totalPages);
        }
      }

      return pages;
    };

    const visiblePages = getVisiblePages(page, totalPages);

    useEffect(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, [page]);

   const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/admin/orders/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
    },
  });

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">Total Orders: {total}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.orderNumber')}</TableHead>
            <TableHead>{t('orders.dealer')}</TableHead>
            <TableHead>{t('common.status')}</TableHead>
            <TableHead>{t('admin.totalValue')}</TableHead>
            <TableHead>{t('admin.created')}</TableHead>
            <TableHead>{t('admin.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders?.map((order: any) => (
            <TableRow key={order.id}>
              <TableCell>{order.orderNumber}</TableCell>
              <TableCell>{order.dealerName || order.dealerId}</TableCell>
              <TableCell>
                <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                  {t(`orders.${order.status}`)}
                </Badge>
              </TableCell>
              <TableCell>${order.totalValue}</TableCell>
              <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Select
                    value={order.status}
                    onValueChange={(value) => updateOrderMutation.mutate({ id: order.id, data: { status: value } })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received">{t('orders.received')}</SelectItem>
                      <SelectItem value="sentToFactory">{t('orders.sentToFactory')}</SelectItem>
                      <SelectItem value="inProduction">{t('orders.inProduction')}</SelectItem>
                      <SelectItem value="delivered">{t('orders.delivered')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('admin.editOrderDetails')}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>{t('admin.notes')}</Label>
                          <Input defaultValue={order.notes} onChange={(e) => order.notes = e.target.value} />
                        </div>
                        <Button onClick={() => updateOrderMutation.mutate({ id: order.id, data: { notes: order.notes } })}>
                          {t('admin.update')}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
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
            {visiblePages.map((p, index) => (
              <PaginationItem key={index}>
                {p === '...' ? (
                  <span className="px-3 py-2">...</span>
                ) : (
                  <PaginationLink
                    onClick={() => setPage(p as number)}
                    isActive={p === page}
                    className="cursor-pointer"
                  >
                    {p}
                  </PaginationLink>
                )}
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

/**
 * Material Management Component
 * Handles material CRUD operations with pagination
 */
function MaterialManagement() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const limit = 10;
   const { data: result, isLoading } = useQuery<{ items: any[], total: number }>({
     queryKey: ['/api/admin/materials', page],
     queryFn: () => apiRequest('GET', `/api/admin/materials?limit=${limit}&offset=${(page - 1) * limit}`).then(res => res.json()),
   });
   const materials = result?.items || [];
   const total = result?.total || 0;

  const [newMaterial, setNewMaterial] = useState({ name: '', category: '', currentStock: 0, maxStock: 100, threshold: 20, unit: 'units' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const createMaterialMutation = useMutation({
    mutationFn: async (materialData: any) => {
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
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
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
          {materials?.map((material: any) => (
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
                      <Button variant="outline" size="sm">
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
                          <Input defaultValue={material.name} onChange={(e) => material.name = e.target.value} />
                        </div>
                        <div>
                          <Label>{t('admin.category')}</Label>
                          <Input defaultValue={material.category} onChange={(e) => material.category = e.target.value} />
                        </div>
                        <div>
                          <Label>{t('admin.maxStock')}</Label>
                          <Input type="number" defaultValue={material.maxStock} onChange={(e) => material.maxStock = Number(e.target.value)} />
                        </div>
                        <div>
                          <Label>{t('admin.threshold')}</Label>
                          <Input type="number" defaultValue={material.threshold} onChange={(e) => material.threshold = Number(e.target.value)} />
                        </div>
                        <div>
                          <Label>{t('admin.unit')}</Label>
                          <Input defaultValue={material.unit} onChange={(e) => material.unit = e.target.value} />
                        </div>
                        <Button onClick={() => updateMaterialMutation.mutate({ id: material.id, data: material })}>
                          {t('admin.update')}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      placeholder={t('admin.newStock')}
                      className="w-20"
                      onChange={(e) => material.newStock = Number(e.target.value)}
                    />
                    <Button variant="outline" size="sm" onClick={() => updateMaterialMutation.mutate({ id: material.id, data: { currentStock: material.newStock } })}>
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

/**
 * Alert Management Component
 * Handles alert CRUD operations with pagination
 */
function AlertManagement() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const limit = 10;
   const { data: result, isLoading } = useQuery<{ items: any[], total: number }>({
     queryKey: ['/api/admin/alerts?includeResolved=true', page],
     queryFn: () => apiRequest('GET', `/api/admin/alerts?includeResolved=true&limit=${limit}&offset=${(page - 1) * limit}`).then(res => res.json()),
   });
   const alerts = result?.items || [];
   const total = result?.total || 0;

  const [newAlert, setNewAlert] = useState({ type: 'info', title: '', message: '', priority: 'medium' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const createAlertMutation = useMutation({
    mutationFn: async (alertData: any) => {
      const response = await apiRequest('POST', '/api/admin/alerts', alertData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
      setIsAddDialogOpen(false);
      setNewAlert({ type: 'info', title: '', message: '', priority: 'medium' });
    },
  });

  const updateAlertMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/admin/alerts/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
    },
  });

  const deleteAlertMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/alerts/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
    },
  });

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{t('admin.totalAlerts', { count: total })}</p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.createAlert')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.createManualAlert')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('admin.type')}</Label>
                <Select value={newAlert.type} onValueChange={(value) => setNewAlert({ ...newAlert, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lowStock">{t('admin.lowStock')}</SelectItem>
                    <SelectItem value="delay">{t('admin.delay')}</SelectItem>
                    <SelectItem value="critical">{t('admin.critical')}</SelectItem>
                    <SelectItem value="info">{t('admin.info')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('admin.title')}</Label>
                <Input value={newAlert.title} onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })} />
              </div>
              <div>
                <Label>{t('admin.message')}</Label>
                <Input value={newAlert.message} onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })} />
              </div>
              <div>
                <Label>{t('admin.priority')}</Label>
                <Select value={newAlert.priority} onValueChange={(value) => setNewAlert({ ...newAlert, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('admin.low')}</SelectItem>
                    <SelectItem value="medium">{t('admin.medium')}</SelectItem>
                    <SelectItem value="high">{t('admin.high')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createAlertMutation.mutate(newAlert)} disabled={createAlertMutation.isPending}>
                {createAlertMutation.isPending ? t('admin.creating') : t('admin.createAlert')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.type')}</TableHead>
            <TableHead>{t('admin.title')}</TableHead>
            <TableHead>{t('admin.priority')}</TableHead>
            <TableHead>{t('admin.resolved')}</TableHead>
            <TableHead>{t('admin.created')}</TableHead>
            <TableHead>{t('admin.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts?.map((alert: any) => (
            <TableRow key={alert.id}>
              <TableCell>{t(`admin.${alert.type}`)}</TableCell>
              <TableCell>{alert.title}</TableCell>
              <TableCell>
                <Badge variant={alert.priority === 'high' ? 'destructive' : alert.priority === 'medium' ? 'default' : 'secondary'}>
                  {t(`admin.${alert.priority}`)}
                </Badge>
              </TableCell>
              <TableCell>{alert.resolved ? t('admin.resolved') : t('common.active')}</TableCell>
              <TableCell>{new Date(alert.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  {!alert.resolved && (
                    <Button variant="outline" size="sm" onClick={() => updateAlertMutation.mutate({ id: alert.id, data: { resolved: true } })}>
                      {t('alerts.resolve')}
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.deleteAlert')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('admin.confirmDeleteAlert')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteAlertMutation.mutate(alert.id)}>
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

/**
 * Admin Dashboard Component
 * Main admin interface with tabbed navigation for different management sections
 */
export default function Admin() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.adminDashboard')}</h1>
          <p className="text-muted-foreground">
            {t('admin.manageUsers')}
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('admin.backToDashboard')}
        </Button>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">{t('admin.users')}</TabsTrigger>
          <TabsTrigger value="dealers">{t('admin.dealers')}</TabsTrigger>
          <TabsTrigger value="orders">{t('admin.orders')}</TabsTrigger>
          <TabsTrigger value="materials">{t('admin.materials')}</TabsTrigger>
          <TabsTrigger value="alerts">{t('admin.alerts')}</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.userManagement')}</CardTitle>
            </CardHeader>
            <CardContent>
              <UserManagement />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="dealers">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.dealerManagement')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DealerManagement />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.orderManagement')}</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderManagement />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.inventoryControl')}</CardTitle>
            </CardHeader>
            <CardContent>
              <MaterialManagement />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.alertManagement')}</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertManagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}