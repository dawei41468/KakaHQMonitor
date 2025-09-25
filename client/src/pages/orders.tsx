import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export default function Orders() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

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
        <h1 className="text-2xl font-bold">{t('orders.allOrders')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('orders.allOrders')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('common.comingSoon')}</p>
        </CardContent>
      </Card>
    </div>
  );
}