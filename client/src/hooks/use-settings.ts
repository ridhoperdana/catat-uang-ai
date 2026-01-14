import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertSetting, type Setting } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./use-auth";

export function useSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const queryKey = [api.settings.get.path, user?.id];

  const query = useQuery<Setting>({
    queryKey,
    queryFn: async () => {
      const res = await apiRequest("GET", api.settings.get.path);
      return res.json();
    },
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<InsertSetting>) => {
      const res = await apiRequest("PATCH", api.settings.update.path, updates, 3000, user?.id);
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
      queryClient.invalidateQueries({ queryKey: [api.expenses.stats.path] });
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
