import { useQuery } from '@tanstack/react-query';
import { Order, Dealer, Alert } from '@shared/schema';

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
  recentOrders: Order[];
  alerts: Alert[];
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

interface DealerWithPerformance extends Dealer {
  performance?: {
    totalOrders: number;
    completedOrders: number;
    revenue: number;
    onTimeRate: number;
  };
}

export function useDealers() {
  return useQuery<DealerWithPerformance[]>({
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
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
    refetchOnWindowFocus: true, // Also refetch when window regains focus
  });
}