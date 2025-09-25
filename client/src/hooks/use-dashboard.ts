import { useQuery } from '@tanstack/react-query';
import { Order, Dealer } from '@shared/schema';

interface DashboardOverview {
  metrics: {
    totalOrders: number;
    completedOrders: number;
    activeOrders: number;
    totalRevenue: number;
    avgLeadTime: number;
    activeDealers: number;
    activeAlerts: number;
    lowStockItems: number;
  };
  recentOrders: any[];
  alerts: any[];
}

interface OrdersResponse {
  items: Order[];
  total: number;
}

export function useDashboardOverview() {
  return useQuery<DashboardOverview>({
    queryKey: ['/api/dashboard/overview'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useDealers() {
  return useQuery<Dealer[]>({
    queryKey: ['/api/dealers'],
  });
}

export function useOrders(limit = 50) {
  return useQuery<OrdersResponse>({
    queryKey: [`/api/orders?limit=${limit}`],
  });
}

export function useMaterials() {
  return useQuery({
    queryKey: ['/api/materials'],
  });
}

export function useAlerts(includeResolved = false) {
  return useQuery({
    queryKey: [`/api/alerts?includeResolved=${includeResolved}`],
  });
}