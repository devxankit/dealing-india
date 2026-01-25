import { useQuery } from "@tanstack/react-query";
import * as analyticsService from "../../../shared/services/analyticsService";
import { getVendorProducts } from "../services/productService";
import { getVendorStock, getVendorStockStats } from "../services/stockService";
import { getVendorOrderStats } from "../../../shared/services/orderService";

/**
 * Hook for fetching vendor dashboard data
 */
export const useVendorDashboard = (period) => {
  return useQuery({
    queryKey: ["vendor", "dashboard", period],
    queryFn: () => analyticsService.getVendorDashboardData(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    select: (response) => response?.data || {},
  });
};

/**
 * Hook for fetching vendor analytics summary
 */
export const useVendorAnalyticsSummary = (period) => {
  return useQuery({
    queryKey: ["vendor", "analytics", "summary", period],
    queryFn: () => analyticsService.getVendorAnalyticsSummary(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (response) => response?.data || {},
  });
};

/**
 * Hook for fetching vendor analytics chart data
 */
export const useVendorChartData = (period) => {
  return useQuery({
    queryKey: ["vendor", "analytics", "charts", period],
    queryFn: () => analyticsService.getVendorChartData(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (response) => response?.data || [],
  });
};

/**
 * Hook for fetching vendor products
 */
export const useVendorProducts = (filters) => {
  return useQuery({
    queryKey: ["vendor", "products", filters],
    queryFn: () => getVendorProducts(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true,
  });
};

/**
 * Hook for fetching vendor stock
 */
export const useVendorStock = (filters) => {
  return useQuery({
    queryKey: ["vendor", "stock", filters],
    queryFn: () => getVendorStock(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true,
  });
};

/**
 * Hook for fetching vendor stock stats
 */
export const useVendorStockStats = (lowStockThreshold) => {
  return useQuery({
    queryKey: ["vendor", "stock", "stats", lowStockThreshold],
    queryFn: () => getVendorStockStats(lowStockThreshold),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for fetching vendor order stats
 */
export const useVendorOrderStats = () => {
  return useQuery({
    queryKey: ["vendor", "orders", "stats"],
    queryFn: () => getVendorOrderStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (response) => response?.data || {},
  });
};
