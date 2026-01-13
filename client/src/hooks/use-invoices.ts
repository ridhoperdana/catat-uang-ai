import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type Invoice } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { getSyncQueue } from "@/lib/sync-manager";

export function useInvoices() {
  const queryClient = useQueryClient();
  const queryKey = [api.invoices.list.path];

  return useQuery({
    queryKey,
    queryFn: async () => {
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

      const queue = await getSyncQueue();
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
  });
}

export function useUploadInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest(api.invoices.upload.method, api.invoices.upload.path, formData);
      return api.invoices.upload.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] }),
  });
}

export function useProcessInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.invoices.process.path, { id });
      const res = await apiRequest(api.invoices.process.method, url);
      return api.invoices.process.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] }); // Processing creates an expense
      queryClient.invalidateQueries({ queryKey: [api.expenses.stats.path] });
    },
  });
}
