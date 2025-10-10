import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, Download, Edit, MoreHorizontal, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type Order = {
  id: string;
  orderNumber: string;
  dealer: string;
  status: "received" | "sentToFactory" | "inProduction" | "delivered";
  paymentStatus: "unpaid" | "partiallyPaid" | "fullyPaid";
  totalValue: number;
  createdAt: string;
  estimatedDelivery: string;
  signingDate: Date | null;
};

const getColumns = (t: (key: string) => string, statusLabels: Record<string, string>, paymentStatusLabels: Record<string, string>, getStatusBadge: (status: string) => JSX.Element, getPaymentStatusBadge: (paymentStatus: string) => JSX.Element, onEditClick?: (orderId: string) => void, onDeleteClick?: (orderId: string) => void): ColumnDef<Order>[] => [
  {
    accessorKey: "orderNumber",
    header: t('orders.orderNumber'),
    cell: ({ row }) => <div className="text-left">{row.getValue("orderNumber")}</div>,
  },
  {
    accessorKey: "dealer",
    header: t('orders.dealer'),
    cell: ({ row }) => <div>{row.getValue("dealer")}</div>,
  },
  {
    accessorKey: "status",
    header: t('orders.orderStatus'),
    cell: ({ row }) => getStatusBadge(row.getValue("status")),
  },
  {
    accessorKey: "paymentStatus",
    header: t('orders.paymentStatus'),
    cell: ({ row }) => getPaymentStatusBadge(row.getValue("paymentStatus")),
  },
  {
    accessorKey: "totalValue",
    header: t('orders.amount'),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalValue"));

      // Format the amount as a CNY amount
      const formatted = new Intl.NumberFormat("zh-CN", {
        style: "currency",
        currency: "CNY",
      }).format(amount);

      return <div className="text-left font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "signingDate",
    header: t('createOrder.signingDate'),
    cell: ({ row }) => {
      const date = row.getValue("signingDate") as Date | null;
      return <div className="text-left">{date ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'TBD'}</div>;
    },
    filterFn: (row, columnId, filterValue: { from?: Date; to?: Date }) => {
      const date = row.getValue(columnId) as Date | null;
      if (!date) return false;

      const { from, to } = filterValue;

      if (from && !to) {
        return date >= from;
      }
      if (!from && to) {
        return date <= to;
      }
      if (from && to) {
        return date >= from && date <= to;
      }
      return true;
    },
  },
  {
    accessorKey: "estimatedDelivery",
    header: t('orders.estimatedDelivery'),
    cell: ({ row }) => <div className="text-left">{row.getValue("estimatedDelivery")}</div>,
  },
  {
    accessorKey: "createdAt",
    header: t('orders.createdAt'),
    cell: ({ row }) => <div className="text-left">{row.getValue("createdAt")}</div>,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const order = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('orders.actions')}</DropdownMenuLabel>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditClick?.(order.id); }}>
              <Edit className="mr-2 h-4 w-4" />
              {t('orders.editOrder')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeleteClick?.(order.id); }}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t('orders.deleteOrder')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

interface OrdersDataTableProps {
  onReady: (table: any) => void;
  onOrderClick?: (orderId: string) => void;
  onEditClick?: (orderId: string) => void;
  onDeleteClick?: (orderId: string) => void;
}

export function OrdersDataTable({ onReady, onOrderClick, onEditClick, onDeleteClick }: OrdersDataTableProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [data, setData] = React.useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  const { data: dealers = [] } = useQuery<any[]>({
    queryKey: ['/api/dealers'],
  });

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await apiRequest("GET", "/api/orders");
      const result = await response.json();

      // Transform orders data
      const transformedData = (result.items || []).map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        dealer: order.dealerName || order.dealerId || 'Unknown',
        status: order.status,
        paymentStatus: order.paymentStatus || 'unpaid',
        totalValue: Number(order.totalValue),
        estimatedDelivery: order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) : 'TBD',
        signingDate: order.signingDate ? new Date(order.signingDate) : null,
        createdAt: new Date(order.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }));

      setData(transformedData);
      setTotalOrders(result.total || 0);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // Collect current filter state
      const filters: any = {};

      // Dealer filter
      const dealerFilter = table.getColumn("dealer")?.getFilterValue() as string;
      if (dealerFilter) {
        filters.dealer = dealerFilter;
      }

      // Status filter
      const statusFilter = table.getColumn("status")?.getFilterValue() as string;
      if (statusFilter) {
        filters.status = statusFilter;
      }

      // Payment status filter
      const paymentStatusFilter = table.getColumn("paymentStatus")?.getFilterValue() as string;
      if (paymentStatusFilter) {
        filters.paymentStatus = paymentStatusFilter;
      }

      // Date range filter
      const signingDateFilter = table.getColumn("signingDate")?.getFilterValue() as { from?: Date; to?: Date };
      if (signingDateFilter?.from || signingDateFilter?.to) {
        filters.signingDateFrom = signingDateFilter.from?.toISOString();
        filters.signingDateTo = signingDateFilter.to?.toISOString();
      }

      // Sorting
      const sorting = table.getState().sorting;
      if (sorting.length > 0) {
        filters.sortBy = sorting[0].id;
        filters.sortOrder = sorting[0].desc ? 'desc' : 'asc';
      }

      // Build query string
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value as string);
        }
      });

      const response = await apiRequest("GET", `/api/export-orders?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
      // You might want to show a toast notification here
    }
  };

  React.useEffect(() => {
    if (user) {
      fetchData();
    }
    if (onReady) {
      onReady({
        fetchData,
      });
    }
  }, [user, dealers]);

  const statusColors = {
    received: "secondary",
    sentToFactory: "outline",
    inProduction: "default",
    delivered: "default"
  } as const;

  const statusLabels = {
    received: t('orders.received'),
    sentToFactory: t('orders.sentToFactory'),
    inProduction: t('orders.inProduction'),
    delivered: t('orders.delivered')
  };

  const paymentStatusColors = {
    unpaid: "destructive",
    partiallyPaid: "outline",
    fullyPaid: "default"
  } as const;

  const paymentStatusLabels = {
    unpaid: t('orders.unpaid'),
    partiallyPaid: t('orders.partiallyPaid'),
    fullyPaid: t('orders.fullyPaid')
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={statusColors[status as keyof typeof statusColors]}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    return (
      <Badge variant={paymentStatusColors[paymentStatus as keyof typeof paymentStatusColors]}>
        {paymentStatusLabels[paymentStatus as keyof typeof paymentStatusLabels] || paymentStatus}
      </Badge>
    );
  };

  const columns = getColumns(t, statusLabels, paymentStatusLabels, getStatusBadge, getPaymentStatusBadge, onEditClick, onDeleteClick);

  const columnLabels: Record<string, string> = {
    orderNumber: t('orders.orderNumber'),
    dealer: t('orders.columnDealer'),
    status: t('orders.columnStatus'),
    paymentStatus: t('orders.paymentStatus'),
    totalValue: t('orders.columnTotalValue'),
    estimatedDelivery: t('orders.columnEstimatedShipDate'),
    signingDate: t('createOrder.signingDate'),
    createdAt: t('orders.columnCreatedAt'),
    actions: t('orders.columnActions'),
  };

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = table.getPageCount();

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

  const visiblePages = getVisiblePages(currentPage, totalPages);

  React.useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, [currentPage]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">
            {t('orders.totalOrdersCount', { count: totalOrders })}
          </div>
          <div className="text-sm text-muted-foreground">
            {t('orders.filteredOrdersCount', { count: table.getFilteredRowModel().rows.length })}
          </div>
        </div>
      </div>
      <div className="flex items-center py-4 space-x-2">
        <Select
          value={(table.getColumn("dealer")?.getFilterValue() as string) ? dealers.find((d: any) => d.name === table.getColumn("dealer")?.getFilterValue())?.id || "all" : "all"}
          onValueChange={(value) => {
            if (value === "all") {
              table.getColumn("dealer")?.setFilterValue("");
            } else {
              const dealer = dealers.find((d: any) => d.id === value);
              table.getColumn("dealer")?.setFilterValue(dealer?.name || "");
            }
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('orders.filterByDealer')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('orders.allDealers')}</SelectItem>
            {dealers.map((dealer: any) => (
              <SelectItem key={dealer.id} value={dealer.id}>
                {dealer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={(table.getColumn("status")?.getFilterValue() as string) ?? ""}
          onValueChange={(value) => {
            table.getColumn("status")?.setFilterValue(value === "all" ? "" : value);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('orders.filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('orders.allStatus')}</SelectItem>
            <SelectItem value="received">{t('orders.received')}</SelectItem>
            <SelectItem value="sentToFactory">{t('orders.sentToFactory')}</SelectItem>
            <SelectItem value="inProduction">{t('orders.inProduction')}</SelectItem>
            <SelectItem value="delivered">{t('orders.delivered')}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={(table.getColumn("paymentStatus")?.getFilterValue() as string) ?? ""}
          onValueChange={(value) => {
            table.getColumn("paymentStatus")?.setFilterValue(value === "all" ? "" : value);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('orders.filterByPaymentStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('orders.allPaymentStatus')}</SelectItem>
            <SelectItem value="unpaid">{t('orders.unpaid')}</SelectItem>
            <SelectItem value="partiallyPaid">{t('orders.partiallyPaid')}</SelectItem>
            <SelectItem value="fullyPaid">{t('orders.fullyPaid')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2">
          <DateRangePicker
            date={dateRange}
            onDateChange={(newDateRange) => {
              setDateRange(newDateRange);
              const filterValue = {
                from: newDateRange?.from,
                to: newDateRange?.to,
              };
              table.getColumn("signingDate")?.setFilterValue(filterValue.from || filterValue.to ? filterValue : undefined);
            }}
          />
          {dateRange && (
            <Button
              variant="ghost"
              onClick={() => {
                setDateRange(undefined);
                table.getColumn("signingDate")?.setFilterValue(undefined);
              }}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">{t('orders.clearDates')}</span>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button variant="outline" onClick={handleExport} className="ml-2">
          <Download className="mr-2 h-4 w-4" />
          {t('orders.exportToExcel')}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              {t('orders.columns')} <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {columnLabels[column.id] || column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onOrderClick?.(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t('orders.noOrdersFound')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          {visiblePages.map((p, index) => (
            <div key={index} className="flex items-center">
              {p === '...' ? (
                <span className="px-3 py-2">...</span>
              ) : (
                <Button
                  variant={p === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => table.setPageIndex(p as number - 1)}
                  className="cursor-pointer"
                >
                  {p}
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}