import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Package, AlertTriangle, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useMaterials } from "@/hooks/use-dashboard"
import type { Material } from "@shared/schema"

interface InventoryOverviewProps {
  onRestockClick?: (itemId: string) => void
  onViewAll?: () => void
}

export function InventoryOverview({
  onRestockClick = () => {},
  onViewAll = () => {}
}: InventoryOverviewProps) {
  const { t } = useTranslation();
  const { data: materialsData = { items: [] } } = useMaterials();
  const materials: Material[] = (materialsData as { items: Material[] }).items || [];
  const lowStockItems = materials.filter(item => item.currentStock <= item.threshold)
  const lowStockCount = lowStockItems.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>{t('inventory.inventoryOverview')}</span>
            </CardTitle>
            <CardDescription>
              {lowStockCount > 0 ? (
                <span className="flex items-center space-x-1 text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{t('inventory.itemsBelowThreshold', { count: lowStockCount })}</span>
                </span>
              ) : (
                <span className="text-green-600">{t('inventory.allStocked')}</span>
              )}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewAll}
            data-testid="button-view-all-inventory"
          >
            {t('inventory.viewAll')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {materials.map((item) => {
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
                        {isCritical ? t('inventory.critical') : t('inventory.lowStock')}
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
                    {t('inventory.threshold', { value: item.threshold })}
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
                    {t('inventory.capacity', { percentage: stockPercentage.toFixed(1) })}
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
                      {t('inventory.restock')}
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