import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

import UserManagement from "@/components/admin/UserManagement";
import DealerManagement from "@/components/admin/DealerManagement";
import MaterialManagement from "@/components/admin/MaterialManagement";
import AlertManagement from "@/components/admin/AlertManagement";
import ApplicationManagement from "@/components/admin/ApplicationManagement";
import AuditLogs from "@/components/admin/AuditLogs";
import ProductManagement from "@/components/admin/ProductManagement";
import CategoryManagement from "@/components/admin/CategoryManagement";
import ColorManagement from "@/components/admin/ColorManagement";
import RegionManagement from "@/components/admin/RegionManagement";
import ProductDetailManagement from "@/components/admin/ProductDetailManagement";
import ColorTypeManagement from "@/components/admin/ColorTypeManagement";
import UnitManagement from "@/components/admin/UnitManagement";
import { OrderUsersManagement } from "@/components/admin/OrderUsersManagement";

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

      <Tabs defaultValue="app-management" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="app-management">{t('admin.appSystemManagement')}</TabsTrigger>
          <TabsTrigger value="order-management">{t('admin.orderSystemManagement')}</TabsTrigger>
        </TabsList>

        <TabsContent value="app-management" className="mt-4">
          <Tabs defaultValue="users">
            <TabsList className="grid grid-cols-6 w-full p-1">
              <TabsTrigger value="users">{t('admin.users')}</TabsTrigger>
              <TabsTrigger value="dealers">{t('admin.dealers')}</TabsTrigger>
              {/* <TabsTrigger value="orders">{t('admin.orders')}</TabsTrigger> */}
              <TabsTrigger value="materials">{t('admin.materials')}</TabsTrigger>
              <TabsTrigger value="alerts">{t('admin.alerts')}</TabsTrigger>
              <TabsTrigger value="audit-logs">{t('admin.auditLogs')}</TabsTrigger>
              <TabsTrigger value="application">{t('application.applicationSettings')}</TabsTrigger>
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
            {/* <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.orderManagement')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <OrderManagement />
                </CardContent>
              </Card>
            </TabsContent> */}
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
            <TabsContent value="audit-logs">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.auditLogs')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <AuditLogs />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="application">
              <Card>
                <CardHeader>
                  <CardTitle>{t('application.applicationSettings')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ApplicationManagement />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="order-management" className="mt-4">
          <Tabs defaultValue="regions">
            <TabsList className="grid grid-cols-8 w-full p-1">
              <TabsTrigger value="regions">{t('admin.regions')}</TabsTrigger>
              <TabsTrigger value="categories">{t('admin.categories')}</TabsTrigger>
              <TabsTrigger value="product-details">{t('admin.productDetails')}</TabsTrigger>
              <TabsTrigger value="products">{t('admin.products')}</TabsTrigger>
              <TabsTrigger value="color-types">{t('admin.colorTypes')}</TabsTrigger>
              <TabsTrigger value="colors">{t('admin.colors')}</TabsTrigger>
              <TabsTrigger value="units">{t('admin.units')}</TabsTrigger>
              <TabsTrigger value="order-users">{t('admin.orderUsers')}</TabsTrigger>
            </TabsList>

            <TabsContent value="regions">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.regionManagement')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <RegionManagement />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="categories">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.categoryManagement')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CategoryManagement />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="product-details">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.productDetailManagement')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductDetailManagement />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.productManagement')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductManagement />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="color-types">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.colorTypeManagement')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ColorTypeManagement />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="colors">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.colorManagement')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ColorManagement />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="units">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.unitManagement')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <UnitManagement />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="order-users">
              <OrderUsersManagement />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}