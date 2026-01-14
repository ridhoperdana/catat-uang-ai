import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type Invoice } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { getSyncQueue } from "@/lib/sync-manager";

export function useInvoices() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = [api.invoices.list.path, user?.id];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!user) return [];
      let serverInvoices: Invoice[] = [];
      try {
        const res = await apiRequest("GET", api.invoices.list.path);
        serverInvoices = api.invoices.list.responses[200].parse(await res.json());
      } catch (error) {
        console.warn("[useInvoices] Fetch failed, using cache if available:", error);
        const cached = queryClient.getQueryData(queryKey);
        if (Array.isArray(cached)) {
          serverInvoices = cached;
        }
      }

      const queue = await getSyncQueue(user.id);
      const pendingInvoices = queue
        .filter(item => item.method === 'POST' && item.url === api.invoices.upload.path)
        .map(item => ({
          ...item.data,
          id: item.id,
          isPending: true,
          status: 'pending',
          createdAt: new Date().toISOString(),
        })) as any[];

      return [...pendingInvoices, ...serverInvoices.filter(s => !pendingInvoices.some(p => p.id === s.id))];
    },
    enabled: !!user,
  });
}

export function useUploadInvoice() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest(api.invoices.upload.method, api.invoices.upload.path, formData, 3000, user?.id);
      return api.invoices.upload.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] }),
  });
}

export function useProcessInvoice() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.invoices.process.path, { id });
      const res = await apiRequest(api.invoices.process.method, url, undefined, 3000, user?.id);
      return api.invoices.process.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path, user?.id] });
      queryClient.invalidateQueries({ queryKey: [api.expenses.list.path, undefined, user?.id] }); // Processing creates an expense
      queryClient.invalidateQueries({ queryKey: [api.expenses.stats.path, user?.id] });
    },
  });
}
