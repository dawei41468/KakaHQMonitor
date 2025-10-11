import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Package } from "lucide-react"
import { useOrders, useDealers } from "@/hooks/use-dashboard"
import { Order } from "@shared/schema"
import { useTranslation } from "react-i18next"

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

interface RecentOrdersTableProps {
  onOrderClick?: (orderId: string) => void
  onViewAll?: () => void
  limit?: number
}

export function RecentOrdersTable({
  onOrderClick = (id) => console.log(`Viewing order ${id}`),
  onViewAll = () => console.log("View all orders"),
  limit = 20
}: RecentOrdersTableProps) {
  const { t } = useTranslation();

  const { data: orders, isLoading: ordersLoading } = useOrders(limit)
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
    const translatedLabels = {
      received: t('orders.received'),
      sentToFactory: t('orders.sentToFactory'),
      inProduction: t('orders.inProduction'),
      delivered: t('orders.delivered')
    }
    return (
      <Badge variant={statusColors[status as keyof typeof statusColors]}>
        {translatedLabels[status as keyof typeof translatedLabels] || status}
      </Badge>
    )
  }

  // Use all orders without filtering
  const filteredOrders = orders?.items || []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>{t('orders.recentOrders')}</span>
            </CardTitle>
            <CardDescription>
              {t('orders.latestOrders')}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewAll}
            data-testid="button-view-all-orders"
          >
            {t('orders.viewAll')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('orders.orderId')}</TableHead>
              <TableHead>{t('orders.dealer')}</TableHead>
              <TableHead>{t('orders.items')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead className="text-right">{t('common.value')}</TableHead>
              <TableHead>{t('orders.eta')}</TableHead>
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
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {t('orders.noOrdersFound')}
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order: Order) => (
                <TableRow
                  key={order.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => onOrderClick(order.id)}
                  data-testid={`order-row-${order.orderNumber}`}
                >
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{dealerMap[order.dealerId]?.name || t('common.unknown')}</TableCell>
                  <TableCell className="max-w-40 truncate">{formatItems(order.items as { item: string; quantity: number }[])}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right">¥{Number(order.totalValue).toLocaleString()}</TableCell>
                  <TableCell>{order.estimatedDelivery ? formatDate(order.estimatedDelivery) : t('common.tbd')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
      </CardContent>
    </Card>
  )
}