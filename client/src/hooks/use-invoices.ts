import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useInvoices() {
  return useQuery({
    queryKey: [api.invoices.list.path],
    queryFn: async () => {
      const res = await fetch(api.invoices.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return api.invoices.list.responses[200].parse(await res.json());
    },
  });
}

export function useUploadInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(api.invoices.upload.path, {
        method: api.invoices.upload.method,
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to upload invoice");
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
      const res = await fetch(url, { method: api.invoices.process.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to process invoice");
      return api.invoices.process.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] }); // Processing creates an expense
      queryClient.invalidateQueries({ queryKey: [api.expenses.stats.path] });
    },
  });
}
