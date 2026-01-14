import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertRecurringExpense } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { getSyncQueue, type QueuedMutation } from "@/lib/sync-manager";

export function useRecurringExpenses() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = [api.recurring.list.path, user?.id];

  return useQuery({
    queryKey,
    queryFn: async () => {
      let serverRecurring: any[] = [];
      try {
        const res = await apiRequest("GET", api.recurring.list.path);
        serverRecurring = api.recurring.list.responses[200].parse(await res.json());
      } catch (error) {
        console.warn("[useRecurringExpenses] Fetch failed, using cache if available:", error);
        const cached = queryClient.getQueryData(queryKey);
        if (Array.isArray(cached)) {
          serverRecurring = cached;
        }
      }

      const queue = await getSyncQueue(user?.id);
      const pendingRecurring = queue
        .filter(item => item.method === 'POST' && item.url === api.recurring.create.path)
        .map(item => ({
          ...item.data,
          id: item.id,
          isPending: true,
          nextDueDate: new Date(item.data.nextDueDate).toISOString(),
          active: true,
        }));

      return [...pendingRecurring, ...serverRecurring.filter(s => !pendingRecurring.some(p => p.id === s.id))];
    },
    enabled: !!user,
  });
}

export function useCreateRecurringExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: InsertRecurringExpense) => {
      const payload = {
        ...data,
        amount: Number(data.amount),
        nextDueDate: new Date(data.nextDueDate).toISOString(),
      };

      const res = await apiRequest(api.recurring.create.method, api.recurring.create.path, payload, 3000, user?.id);
      return api.recurring.create.responses[201].parse(await res.json());
    },
    onMutate: async (newRecurring) => {
      await queryClient.cancelQueries({ queryKey: [api.recurring.list.path] });
      const previousRecurring = queryClient.getQueryData([api.recurring.list.path, user?.id]);
      
      queryClient.setQueryData([api.recurring.list.path, user?.id], (old: any[] = []) => [
        {
          ...newRecurring,
          id: Math.floor(Math.random() * -1000000),
          nextDueDate: new Date(newRecurring.nextDueDate).toISOString(),
          active: true,
          isOffline: true,
        },
        ...old,
      ]);

      return { previousRecurring };
    },
    onError: (err, newRecurring, context) => {
      queryClient.setQueryData([api.recurring.list.path, user?.id], context?.previousRecurring);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [api.recurring.list.path] });
    },
  });
}

export function useDeleteRecurringExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.recurring.delete.path, { id });
      await apiRequest(api.recurring.delete.method, url, undefined, 3000, user?.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.recurring.list.path] }),
  });
}
