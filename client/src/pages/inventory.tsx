import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Search, Edit, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Material, Alert } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert as AlertUI, AlertDescription } from "@/components/ui/alert";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";

export default function Inventory() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [newStock, setNewStock] = useState<number>(0);

  const { data: materialsData = { items: [] }, isLoading } = useQuery<{ items: Material[] }>({
    queryKey: ['/api/materials'],
    queryFn: () => apiRequest('GET', '/api/materials').then(res => res.json()),
  });

  const materials = materialsData.items;

  const { data: alertsData } = useQuery<{ items: Alert[] }>({
    queryKey: ['/api/alerts'],
    queryFn: () => apiRequest('GET', '/api/alerts').then(res => res.json()),
  });

  const alerts: Alert[] = alertsData?.items || [];
  const lowStockAlerts = alerts.filter(a => a.type === 'lowStock' && !a.resolved);

  const updateStockMutation = useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
      const response = await apiRequest('PUT', `/api/materials/${id}/stock`, { stock });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/overview'] });
      setEditingMaterial(null);
    },
  });

  const filteredMaterials = useMemo(() => {
    return materials.filter(material =>
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [materials, searchTerm]);

  const totalPages = Math.ceil(filteredMaterials.length / limit);
  const paginatedMaterials = filteredMaterials.slice((page - 1) * limit, page * limit);

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

  const exportLowStock = () => {
    const lowStockMaterials = filteredMaterials.filter(m => m.currentStock <= m.threshold);
    if (lowStockMaterials.length === 0) return;
    const csv = 'Name,Category,Current Stock,Max Stock,Threshold,Unit\n' + lowStockMaterials.map(m => `"${m.name}","${m.category}",${m.currentStock},${m.maxStock},${m.threshold},"${m.unit}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'low_stock_materials.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.backToDashboard')}
        </Button>
        <h1 className="text-2xl font-bold">{t('inventory.allInventory')}</h1>
      </div>

      {lowStockAlerts.length > 0 && (
        <div className="mb-6">
          <AlertUI>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('inventory.lowStockAlerts')}:</strong>
              <ul>
                {lowStockAlerts.map(alert => <li key={alert.id}>{alert.message}</li>)}
              </ul>
            </AlertDescription>
          </AlertUI>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('inventory.allInventory')}</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder={t('inventory.searchMaterials')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => navigate('/admin')}>
              {t('admin.manageMaterials')}
            </Button>
            <Button variant="outline" onClick={exportLowStock}>
              {t('inventory.exportLowStock')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('admin.category')}</TableHead>
                <TableHead>{t('admin.currentStock')}</TableHead>
                <TableHead>{t('admin.maxStock')}</TableHead>
                <TableHead>{t('admin.threshold')}</TableHead>
                <TableHead>{t('admin.unit')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('admin.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMaterials.map((material) => {
                const isLowStock = material.currentStock <= material.threshold;
                return (
                  <TableRow key={material.id}>
                    <TableCell>{material.name}</TableCell>
                    <TableCell>{material.category}</TableCell>
                    <TableCell>{material.currentStock}</TableCell>
                    <TableCell>{material.maxStock}</TableCell>
                    <TableCell>{material.threshold}</TableCell>
                    <TableCell>{material.unit}</TableCell>
                    <TableCell>
                      <Badge variant={isLowStock ? 'destructive' : 'default'}>
                        {isLowStock ? t('inventory.lowStock') : t('inventory.inStock')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => { setEditingMaterial(material); setNewStock(material.currentStock); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t('admin.adjustStock')}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>{t('admin.currentStock')}: {editingMaterial?.currentStock}</Label>
                            </div>
                            <div>
                              <Label>{t('admin.newStock')}</Label>
                              <Input type="number" value={newStock} onChange={(e) => setNewStock(Number(e.target.value))} />
                            </div>
                            <Button onClick={() => editingMaterial && updateStockMutation.mutate({ id: editingMaterial.id, stock: newStock })} disabled={updateStockMutation.isPending}>
                              {updateStockMutation.isPending ? t('admin.updating') : t('admin.updateStock')}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {totalPages > 1 && (
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
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}