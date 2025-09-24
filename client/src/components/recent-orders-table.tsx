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

interface Order {
  id: string
  dealerName: string
  status: "received" | "sentToFactory" | "inProduction" | "delivered"
  items: string
  value: number
  eta: string
  createdAt: string
}

// todo: remove mock data
const mockOrders: Order[] = [
  {
    id: "SZ-2024-0456",
    dealerName: "Shenzhen",
    status: "inProduction",
    items: "Balcony Railing Set x3",
    value: 45000,
    eta: "2024-09-28",
    createdAt: "2024-09-20"
  },
  {
    id: "GZ-2024-0234",
    dealerName: "Guangzhou",
    status: "sentToFactory",
    items: "Garden Upgrade Kit x2",
    value: 32000,
    eta: "2024-09-30",
    createdAt: "2024-09-21"
  },
  {
    id: "FS-2024-0789",
    dealerName: "Foshan",
    status: "received",
    items: "Balcony Flooring x5",
    value: 28500,
    eta: "2024-10-05",
    createdAt: "2024-09-22"
  },
  {
    id: "HZ-2024-0567",
    dealerName: "Hangzhou",
    status: "delivered",
    items: "Garden Lighting Set x1",
    value: 15000,
    eta: "2024-09-25",
    createdAt: "2024-09-18"
  },
  {
    id: "CD-2024-0123",
    dealerName: "Chengdu",
    status: "inProduction",
    items: "Balcony Privacy Screen x4",
    value: 22000,
    eta: "2024-09-29",
    createdAt: "2024-09-19"
  }
]

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

  const filteredOrders = mockOrders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.dealerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.items.toLowerCase().includes(searchTerm.toLowerCase())
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
            {filteredOrders.map((order) => (
              <TableRow 
                key={order.id} 
                className="hover-elevate cursor-pointer"
                onClick={() => onOrderClick(order.id)}
                data-testid={`order-row-${order.id}`}
              >
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.dealerName}</TableCell>
                <TableCell className="max-w-40 truncate">{order.items}</TableCell>
                <TableCell>
                  <Badge variant={statusColors[order.status]}>
                    {statusLabels[order.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">¥{order.value.toLocaleString()}</TableCell>
                <TableCell>{order.eta}</TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOrderClick(order.id)
                    }}
                    data-testid={`button-view-order-${order.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {filteredOrders.length === 0 && (
          <div className="text-center py-8">
            <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No orders found</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}