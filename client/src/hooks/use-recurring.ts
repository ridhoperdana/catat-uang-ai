import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertRecurringExpense } from "@shared/routes";

export function useRecurringExpenses() {
  return useQuery({
    queryKey: [api.recurring.list.path],
    queryFn: async () => {
      const res = await fetch(api.recurring.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch recurring expenses");
      return api.recurring.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateRecurringExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertRecurringExpense) => {
      const payload = {
        ...data,
        amount: Number(data.amount),
        nextDueDate: new Date(data.nextDueDate).toISOString(),
      };

      const res = await fetch(api.recurring.create.path, {
        method: api.recurring.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create recurring expense");
      }
      return api.recurring.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.recurring.list.path] }),
  });
}

export function useDeleteRecurringExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.recurring.delete.path, { id });
      const res = await fetch(url, { method: api.recurring.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete recurring expense");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.recurring.list.path] }),
  });
}
