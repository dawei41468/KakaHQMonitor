import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function OrderUsersManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['/api/admin/order-users'],
    queryFn: () => apiRequest("GET", '/api/admin/order-users').then(res => res.json()),
  });

  const toggleAssignmentMutation = useMutation({
    mutationFn: async ({ userId, canAssignToOrders }: { userId: string; canAssignToOrders: boolean }) => {
      const response = await apiRequest("PUT", `/api/admin/order-users/${userId}/toggle-assignment`, {
        canAssignToOrders
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/order-users'] });
      queryClient.invalidateQueries({ queryKey: ['order-users'] });
      toast({
        title: t('common.success'),
        description: t('admin.userAssignmentUpdated'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('admin.userAssignmentUpdateFailed'),
        variant: 'destructive',
      });
    },
  });

  const handleToggleAssignment = (userId: string, currentValue: boolean) => {
    toggleAssignmentMutation.mutate({
      userId,
      canAssignToOrders: !currentValue
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('admin.orderUsersManagement')}</h1>
        <p className="text-muted-foreground">{t('admin.orderUsersManagementDescription')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.orderUsers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usersData?.items?.map((user: User) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-sm text-muted-foreground">{user.email}</span>
                  <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    {user.canAssignToOrders ? t('admin.canAssignToOrders') : t('admin.cannotAssignToOrders')}
                  </span>
                  <Switch
                    checked={user.canAssignToOrders || false}
                    onCheckedChange={() => handleToggleAssignment(user.id, user.canAssignToOrders || false)}
                    disabled={toggleAssignmentMutation.isPending}
                  />
                </div>
              </div>
            ))}

            {(!usersData?.items || usersData.items.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                {t('admin.noUsersFound')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}