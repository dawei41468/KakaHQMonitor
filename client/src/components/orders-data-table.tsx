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
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
  dealer: string;
  status: "received" | "sentToFactory" | "inProduction" | "delivered";
  totalValue: number;
  createdAt: string;
  estimatedShipDate: string;
};

const getColumns = (t: (key: string) => string, statusLabels: Record<string, string>, getStatusBadge: (status: string) => JSX.Element): ColumnDef<Order>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "dealer",
    header: t('orders.dealer'),
    cell: ({ row }) => <div>{row.getValue("dealer")}</div>,
  },
  {
    accessorKey: "status",
    header: t('common.status'),
    cell: ({ row }) => getStatusBadge(row.getValue("status")),
  },
  {
    accessorKey: "totalValue",
    header: () => <div className="text-right">{t('orders.amount')}</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalValue"));

      // Format the amount as a dollar amount
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);

      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "estimatedShipDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t('orders.estimatedDelivery')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div>{row.getValue("estimatedShipDate")}</div>,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t('orders.createdAt')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div>{row.getValue("createdAt")}</div>,
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
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(order.id)}
            >
              Copy payment ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View customer</DropdownMenuItem>
            <DropdownMenuItem>View payment details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

interface OrdersDataTableProps {
  onReady: (table: any) => void;
  onOrderClick?: (orderId: string) => void;
}

export function OrdersDataTable({ onReady, onOrderClick }: OrdersDataTableProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [data, setData] = React.useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);

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
        dealer: order.dealerName || order.dealerId || 'Unknown',
        status: order.status,
        totalValue: Number(order.totalValue),
        estimatedShipDate: order.estimatedShipDate ? new Date(order.estimatedShipDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) : 'TBD',
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
  
  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={statusColors[status as keyof typeof statusColors]}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </Badge>
    );
  };

  const columns = getColumns(t, statusLabels, getStatusBadge);

  const columnLabels: Record<string, string> = {
    select: t('orders.columnSelect'),
    dealer: t('orders.columnDealer'),
    status: t('orders.columnStatus'),
    totalValue: t('orders.columnTotalValue'),
    estimatedShipDate: t('orders.columnEstimatedShipDate'),
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
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
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
        <div className="text-sm text-muted-foreground">
          {t('orders.totalOrdersCount', { count: totalOrders })}
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
                  data-state={row.getIsSelected() && "selected"}
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
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
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