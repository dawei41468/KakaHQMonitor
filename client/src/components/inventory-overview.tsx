import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Package, AlertTriangle, Plus } from "lucide-react"

interface InventoryItem {
  id: string
  name: string
  currentStock: number
  maxStock: number
  threshold: number
  unit: string
  category: string
}

// todo: remove mock data
const mockInventory: InventoryItem[] = [
  {
    id: "1",
    name: "Balcony Railing Material",
    currentStock: 12,
    maxStock: 100,
    threshold: 20,
    unit: "units",
    category: "Railings"
  },
  {
    id: "2",
    name: "Garden Lighting Components",
    currentStock: 45,
    maxStock: 80,
    threshold: 15,
    unit: "sets",
    category: "Lighting"
  },
  {
    id: "3",
    name: "Balcony Flooring Tiles",
    currentStock: 234,
    maxStock: 500,
    threshold: 50,
    unit: "sq ft",
    category: "Flooring"
  },
  {
    id: "4",
    name: "Privacy Screen Panels",
    currentStock: 8,
    maxStock: 60,
    threshold: 10,
    unit: "panels",
    category: "Privacy"
  },
  {
    id: "5",
    name: "Garden Upgrade Hardware",
    currentStock: 67,
    maxStock: 120,
    threshold: 25,
    unit: "kits",
    category: "Hardware"
  }
]

interface InventoryOverviewProps {
  onRestockClick?: (itemId: string) => void
  onViewAll?: () => void
}

export function InventoryOverview({
  onRestockClick = (id) => console.log(`Restocking item ${id}`),
  onViewAll = () => console.log("View all inventory")
}: InventoryOverviewProps) {
  const lowStockItems = mockInventory.filter(item => item.currentStock <= item.threshold)
  const totalItems = mockInventory.length
  const lowStockCount = lowStockItems.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Inventory Overview</span>
            </CardTitle>
            <CardDescription>
              {lowStockCount > 0 ? (
                <span className="flex items-center space-x-1 text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{lowStockCount} items below threshold</span>
                </span>
              ) : (
                <span className="text-green-600">All items adequately stocked</span>
              )}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onViewAll}
            data-testid="button-view-all-inventory"
          >
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockInventory.map((item) => {
          const stockPercentage = (item.currentStock / item.maxStock) * 100
          const isLowStock = item.currentStock <= item.threshold
          const isCritical = item.currentStock <= item.threshold * 0.5
          
          return (
            <div 
              key={item.id}
              className="space-y-2 p-3 rounded-lg border hover-elevate"
              data-testid={`inventory-item-${item.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium">{item.name}</h4>
                    {isLowStock && (
                      <Badge variant={isCritical ? "destructive" : "secondary"}>
                        {isCritical ? "Critical" : "Low Stock"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {item.currentStock} / {item.maxStock} {item.unit}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Threshold: {item.threshold}
                  </p>
                </div>
              </div>
              
              <div className="space-y-1">
                <Progress 
                  value={stockPercentage} 
                  className={`h-2 ${isLowStock ? 'text-destructive' : ''}`}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {stockPercentage.toFixed(1)}% capacity
                  </span>
                  {isLowStock && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => onRestockClick(item.id)}
                      data-testid={`button-restock-${item.id}`}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Restock
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}