import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertExpense } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { getSyncQueue } from "@/lib/sync-manager";

export function useExpenses(filters?: { startDate?: string; endDate?: string; category?: string }) {
  const queryClient = useQueryClient();
  const queryKey = [api.expenses.list.path, filters];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = new URL(api.expenses.list.path, window.location.origin);
      if (filters?.startDate) url.searchParams.append("startDate", filters.startDate);
      if (filters?.endDate) url.searchParams.append("endDate", filters.endDate);
      if (filters?.category) url.searchParams.append("category", filters.category);
      
      let serverExpenses: any[] = [];
      try {
        const res = await apiRequest("GET", url.pathname + url.search);
        serverExpenses = api.expenses.list.responses[200].parse(await res.json());
      } catch (error) {
        console.warn("[useExpenses] Fetch failed, using cache if available:", error);
        const cached = queryClient.getQueryData(queryKey);
        if (Array.isArray(cached)) {
          serverExpenses = cached;
        }
      }

      // Merge with pending items from sync queue
      const queue = await getSyncQueue();
      const pendingExpenses = queue
        .filter(item => item.method === 'POST' && item.url === api.expenses.create.path)
        .map(item => ({
          ...item.data,
          id: item.id, // Use unique string ID from queue
          isPending: true,
          date: new Date(item.data.date).toISOString(),
        }));

      // Return combined list, preventing duplicates if possible (offline items have string IDs, server has numbers)
      return [...pendingExpenses, ...serverExpenses.filter(s => !pendingExpenses.some(p => p.id === s.id))];
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertExpense) => {
      const payload = {
        ...data,
        amount: Number(data.amount),
        date: new Date(data.date).toISOString(),
      };
      
      const res = await apiRequest(api.expenses.create.method, api.expenses.create.path, payload);
      return api.expenses.create.responses[201].parse(await res.json());
    },
    onMutate: async (newExpense) => {
      await queryClient.cancelQueries({ queryKey: [api.expenses.list.path] });
      const previousExpenses = queryClient.getQueryData([api.expenses.list.path]);
      
      // Optimistically update to the provider
      queryClient.setQueryData([api.expenses.list.path], (old: any[] = []) => [
        {
          ...newExpense,
          id: Math.floor(Math.random() * -1000000),
          date: new Date(newExpense.date).toISOString(),
          isOffline: true,
        },
        ...old,
      ]);

      return { previousExpenses };
    },
    onError: (err, newExpense, context) => {
      queryClient.setQueryData([api.expenses.list.path], context?.previousExpenses);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.expenses.stats.path] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.expenses.delete.path, { id });
      await apiRequest(api.expenses.delete.method, url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.expenses.stats.path] });
    },
  });
}

export function useExpenseStats() {
  const queryClient = useQueryClient();
  const queryKey = [api.expenses.stats.path];
  return useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", api.expenses.stats.path);
        return api.expenses.stats.responses[200].parse(await res.json());
      } catch (error) {
        console.warn("[useExpenseStats] Fetch failed, using cache if available:", error);
        const cached = queryClient.getQueryData(queryKey);
        if (cached) return cached;
        throw error;
      }
    },
  });
}
