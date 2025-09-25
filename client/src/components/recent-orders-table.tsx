import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Eye, Package } from "lucide-react"
import { useState } from "react"
import { useOrders, useDealers } from "@/hooks/use-dashboard"
import { Order } from "@shared/schema"

interface Dealer {
  id: string
  name: string
  territory: string
}

// Now using real API data instead of mock data

const statusColors = {
  received: "secondary",
  sentToFactory: "outline",
  inProduction: "default",
  delivered: "default"
} as const

const statusLabels = {
  received: "Received",
  sentToFactory: "Sent to Factory",
  inProduction: "In Production",
  delivered: "Delivered"
}

interface RecentOrdersTableProps {
  onOrderClick?: (orderId: string) => void
  onViewAll?: () => void
}

export function RecentOrdersTable({
  onOrderClick = (id) => console.log(`Viewing order ${id}`),
  onViewAll = () => console.log("View all orders")
}: RecentOrdersTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const { data: orders, isLoading: ordersLoading } = useOrders(50)
  const { data: dealers, isLoading: dealersLoading } = useDealers()
  
  const isLoading = ordersLoading || dealersLoading

  // Create dealer lookup map
  const dealerMap = (dealers as Dealer[] || []).reduce((acc: Record<string, Dealer>, dealer: Dealer) => {
    acc[dealer.id] = dealer
    return acc
  }, {})

  // Helper functions
  const formatItems = (items: { item: string; quantity: number }[]) => {
    return items.map(item => `${item.item} x${item.quantity}`).join(', ')
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'TBD'
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={statusColors[status as keyof typeof statusColors]}>
        {statusLabels[status as keyof typeof statusLabels]}
      </Badge>
    )
  }

  // Filter orders based on search term and status
  const filteredOrders = (orders?.items || []).filter((order: Order) => {
    const dealerName = dealerMap[order.dealerId]?.name || 'Unknown'
    const itemsText = formatItems(order.items as { item: string; quantity: number }[])
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          dealerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          itemsText.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Recent Orders</span>
            </CardTitle>
            <CardDescription>
              Latest orders from all dealers
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onViewAll}
            data-testid="button-view-all-orders"
          >
            View All
          </Button>
        </div>
        
        <div className="flex items-center space-x-2 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              data-testid="input-search-orders"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="sentToFactory">Sent to Factory</SelectItem>
              <SelectItem value="inProduction">In Production</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Dealer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>ETA</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded"></div></TableCell>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded"></div></TableCell>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded"></div></TableCell>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded"></div></TableCell>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded"></div></TableCell>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded"></div></TableCell>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded"></div></TableCell>
                </TableRow>
              ))
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order: Order) => (
                <TableRow 
                  key={order.id} 
                  className="hover-elevate cursor-pointer"
                  onClick={() => onOrderClick(order.orderNumber)}
                  data-testid={`order-row-${order.orderNumber}`}
                >
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{dealerMap[order.dealerId]?.name || 'Unknown'}</TableCell>
                  <TableCell className="max-w-40 truncate">{formatItems(order.items as { item: string; quantity: number }[])}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right">¥{Number(order.totalValue).toLocaleString()}</TableCell>
                  <TableCell>{order.estimatedDelivery ? formatDate(order.estimatedDelivery) : 'TBD'}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOrderClick(order.orderNumber)
                      }}
                      data-testid={`button-view-order-${order.orderNumber}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
      </CardContent>
    </Card>
  )
}