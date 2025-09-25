import { useQuery } from '@tanstack/react-query';

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

export function useDashboardOverview() {
  return useQuery<DashboardOverview>({
    queryKey: ['/api/dashboard/overview'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useDealers() {
  return useQuery({
    queryKey: ['/api/dealers'],
  });
}

export function useOrders(limit = 50) {
  return useQuery({
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